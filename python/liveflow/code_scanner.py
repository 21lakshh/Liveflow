from __future__ import annotations

import ast
import logging
import os
import re
import sys
from typing import Any

logger = logging.getLogger("liveflow")


def _make_agent_id(class_name: str) -> str:
    """Convert CamelCase class name to snake_case agent ID.
    
    Uses the exact same algorithm as LiveKit's `misc.camel_to_snake_case`
    so our IDs match the runtime `agent.id` attribute.
    
    Examples:
        Greeting -> greeting
        ObjectDetectionAgent -> object_detection_agent
        RAGAgent -> rag_agent
    """
    return re.sub(
        r"([a-z0-9])([A-Z])", r"\1_\2",
        re.sub(r"([A-Z]+)([A-Z][a-z])", r"\1_\2", class_name)
    ).lower()


def _extract_string_from_node(node: ast.expr) -> str | None:
    """Try to extract a literal string from an AST node."""
    if isinstance(node, ast.Constant) and isinstance(node.value, str):
        return node.value
    if isinstance(node, ast.JoinedStr):
        # f-string — can't fully resolve, return placeholder
        return "(f-string)"
    return None


def _find_instructions_in_init(cls_node: ast.ClassDef) -> str:
    """
    Look for `instructions=` keyword in super().__init__() call within __init__.
    
    Patterns we handle:
      def __init__(self):
          super().__init__(instructions="...")
    """
    for item in ast.walk(cls_node):
        if isinstance(item, ast.Call):
            for kw in item.keywords:
                if kw.arg == "instructions":
                    val = _extract_string_from_node(kw.value)
                    if val:
                        # Truncate very long instructions
                        return val[:500] if len(val) > 500 else val
    return ""


def _find_function_tools(cls_node: ast.ClassDef) -> list[str]:
    """Find all methods decorated with @function_tool() in a class."""
    tools = []
    for item in cls_node.body:
        if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)):
            for deco in item.decorator_list:
                deco_name = None
                if isinstance(deco, ast.Name):
                    deco_name = deco.id
                elif isinstance(deco, ast.Call):
                    if isinstance(deco.func, ast.Name):
                        deco_name = deco.func.id
                    elif isinstance(deco.func, ast.Attribute):
                        deco_name = deco.func.attr
                
                if deco_name == "function_tool":
                    tools.append(item.name)
                    break
    return tools


def _find_handoff_targets(cls_node: ast.ClassDef) -> list[str]:
    """
    Find agent IDs that this agent can hand off to.
    
    Looks for patterns like:
      - self._transfer_to_agent("greeter", ...)
      - await self._transfer_to_agent("object_detection", ...)
      - return next_agent, "message"  (where next_agent comes from userdata.agents[...])
    """
    targets = []
    for node in ast.walk(cls_node):
        if isinstance(node, ast.Call):
            # Match: self._transfer_to_agent("name", ...)
            if isinstance(node.func, ast.Attribute) and node.func.attr == "_transfer_to_agent":
                if node.args and isinstance(node.args[0], ast.Constant) and isinstance(node.args[0].value, str):
                    targets.append(node.args[0].value)
            
            # Match: userdata.agents["name"] or userdata.agents.get("name")
            if isinstance(node.func, ast.Attribute) and node.func.attr == "get":
                if isinstance(node.func.value, ast.Attribute) and node.func.value.attr == "agents":
                    if node.args and isinstance(node.args[0], ast.Constant) and isinstance(node.args[0].value, str):
                        targets.append(node.args[0].value)
        
        # Match: userdata.agents["name"]  (subscript)
        if isinstance(node, ast.Subscript):
            if isinstance(node.value, ast.Attribute) and node.value.attr == "agents":
                if isinstance(node.slice, ast.Constant) and isinstance(node.slice.value, str):
                    targets.append(node.slice.value)
    
    return list(set(targets))


def _find_agent_registry(tree: ast.Module) -> dict[str, str]:
    """
    Find the mapping from agent IDs to class names in the entrypoint function.
    
    Looks for patterns like:
      userdata.agents.update({"greeter": Greeting(), "object_detection": ObjectDetectionAgent()})
      userdata.agents["greeter"] = Greeting()
    """
    registry: dict[str, str] = {}  # agent_id -> class_name
    
    for node in ast.walk(tree):
        # Pattern: userdata.agents.update({...})
        if isinstance(node, ast.Call):
            if isinstance(node.func, ast.Attribute) and node.func.attr == "update":
                if isinstance(node.func.value, ast.Attribute) and node.func.value.attr == "agents":
                    if node.args and isinstance(node.args[0], ast.Dict):
                        for key, value in zip(node.args[0].keys, node.args[0].values):
                            if isinstance(key, ast.Constant) and isinstance(key.value, str):
                                cls_name = None
                                if isinstance(value, ast.Call):
                                    if isinstance(value.func, ast.Name):
                                        cls_name = value.func.id
                                    elif isinstance(value.func, ast.Attribute):
                                        cls_name = value.func.attr
                                if cls_name:
                                    registry[key.value] = cls_name
        
        # Pattern: userdata.agents["key"] = ClassName()
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Subscript):
                    if isinstance(target.value, ast.Attribute) and target.value.attr == "agents":
                        if isinstance(target.slice, ast.Constant) and isinstance(target.slice.value, str):
                            if isinstance(node.value, ast.Call):
                                cls_name = None
                                if isinstance(node.value.func, ast.Name):
                                    cls_name = node.value.func.id
                                elif isinstance(node.value.func, ast.Attribute):
                                    cls_name = node.value.func.attr
                                if cls_name:
                                    registry[target.slice.value] = cls_name
    
    return registry


def _is_agent_class(cls_node: ast.ClassDef, all_agent_classes: set[str]) -> bool:
    """Check if a class inherits from Agent or a known agent base class."""
    agent_base_names = {"Agent", "BaseAgent", "MultimodalAgent"}
    for base in cls_node.bases:
        base_name = None
        if isinstance(base, ast.Name):
            base_name = base.id
        elif isinstance(base, ast.Attribute):
            base_name = base.attr
        
        if base_name and (base_name in agent_base_names or base_name in all_agent_classes):
            return True
    return False


def scan_agent_file(script_path: str) -> dict[str, Any]:
    """
    Scan a Python agent file and extract all agent/tool information.
    
    Returns a dict like:
    {
        "agents": [
            {
                "id": "greeter",
                "name": "Greeting",
                "instructions": "You're a calm...",
                "tools": ["update_object_to_find", "start_detection"],
                "handoff_targets": ["object_detection"]
            },
            ...
        ],
        "handoffs": [
            {"from_id": "greeter", "to_id": "object_detection", "tool": "start_detection"},
            ...
        ]
    }
    """
    try:
        with open(script_path, "r", encoding="utf-8") as f:
            source = f.read()
    except Exception as e:
        logger.warning(f"Code scanner: could not read {script_path}: {e}")
        return {"agents": [], "handoffs": []}
    
    try:
        tree = ast.parse(source, filename=script_path)
    except SyntaxError as e:
        logger.warning(f"Code scanner: syntax error in {script_path}: {e}")
        return {"agents": [], "handoffs": []}
    
    # Step 1: Find all Agent subclasses (multi-pass for inheritance chains)
    all_classes: dict[str, ast.ClassDef] = {}
    agent_classes: set[str] = set()
    
    for node in ast.walk(tree):
        if isinstance(node, ast.ClassDef):
            all_classes[node.name] = node
    
    # Multi-pass: resolve inheritance chains (BaseAgent → Greeting, etc.)
    changed = True
    while changed:
        changed = False
        for name, cls_node in all_classes.items():
            if name not in agent_classes and _is_agent_class(cls_node, agent_classes):
                agent_classes.add(name)
                changed = True
    
    # Step 2: Find the agent registry (ID → class name mapping) from entrypoint
    # These are the user-chosen keys (e.g. "greeter") which may differ from
    # LiveKit's runtime agent.id (e.g. "greeting" computed from class name).
    registry = _find_agent_registry(tree)
    
    # Build mapping from registry key → runtime ID (via class name)
    # e.g. "greeter" → "greeting", "object_detection" → "object_detection_agent"
    registry_key_to_runtime_id: dict[str, str] = {}
    for reg_key, cls_name in registry.items():
        runtime_id = _make_agent_id(cls_name)
        registry_key_to_runtime_id[reg_key] = runtime_id
    
    # Step 3: Extract info from each agent class
    agents_info = []
    for cls_name in agent_classes:
        cls_node = all_classes[cls_name]
        
        # Skip base classes that aren't concrete agents
        # A concrete agent typically has __init__ with instructions or function_tools
        tools = _find_function_tools(cls_node)
        instructions = _find_instructions_in_init(cls_node)
        handoff_targets = _find_handoff_targets(cls_node)
        
        # Always use _make_agent_id (matches LiveKit's runtime agent.id)
        agent_id = _make_agent_id(cls_name)
        
        # Skip the base class if it has no tools and no instructions
        if not tools and not instructions and cls_name.lower().startswith("base"):
            continue
        
        agents_info.append({
            "id": agent_id,
            "name": cls_name,
            "instructions": instructions,
            "tools": tools,
            "handoff_targets": handoff_targets,
        })
    
    # Step 4: Build handoff edges
    # Handoff targets from code analysis use registry keys (e.g. "object_detection")
    # but we need runtime IDs (e.g. "object_detection_agent") for edges.
    handoffs = []
    for agent in agents_info:
        for target_key in agent.get("handoff_targets", []):
            # Map registry key to runtime ID
            target_id = registry_key_to_runtime_id.get(target_key, target_key)
            
            # Find which tool triggers this handoff
            trigger_tool = ""
            # Heuristic: tool name contains target ID or is a transfer method
            for tool in agent["tools"]:
                tool_lower = tool.lower()
                if target_key in tool_lower or f"to_{target_key}" == tool_lower:
                    trigger_tool = tool
                    break
            
            handoffs.append({
                "from_id": agent["id"],
                "to_id": target_id,
                "tool": trigger_tool,
            })
    
    # Clean up: remove handoff_targets from agent info (internal only)
    for agent in agents_info:
        agent.pop("handoff_targets", None)
    
    result = {"agents": agents_info, "handoffs": handoffs}
    logger.info(f"Code scanner found {len(agents_info)} agents, {len(handoffs)} handoff edges")
    for a in agents_info:
        logger.info(f"  Agent: {a['name']} (id={a['id']}, tools={a['tools']})")
    
    return result
