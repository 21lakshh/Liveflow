from __future__ import annotations

import atexit
import logging
import os
import site
import sys
import runpy


# Configure Liveflow logging
logger = logging.getLogger("liveflow")

# Name of the .pth file we install into site-packages
_PTH_FILENAME = "liveflow-hook.pth"


def _get_site_packages_dir() -> str | None:
    """Find the site-packages directory for the current Python environment."""
    # Prefer the virtualenv's site-packages if we're in one
    for p in site.getsitepackages():
        if os.path.isdir(p):
            return p
    # Fallback to user site-packages
    user_site = site.getusersitepackages()
    if isinstance(user_site, str) and os.path.isdir(user_site):
        return user_site
    return None


def _install_pth_file() -> str | None:
    """
    Write a .pth file into site-packages so that EVERY Python subprocess
    (including watchfiles' reload subprocess) auto-installs the child hook.
    
    The .pth file just imports liveflow._auto_hook, which:
      - Checks LIVEFLOW_PORT env var
      - If set, patches proc_main → proc_main_wrapper
      - Does nothing if not set (safe for non-Liveflow processes)
    
    Returns the path to the .pth file, or None if it couldn't be installed.
    """
    sp_dir = _get_site_packages_dir()
    if not sp_dir:
        logger.warning("Could not find site-packages directory for .pth file")
        return None
    
    pth_path = os.path.join(sp_dir, _PTH_FILENAME)
    try:
        with open(pth_path, "w") as f:
            f.write("import liveflow._auto_hook\n")
        logger.debug(f"Installed .pth file: {pth_path}")
        return pth_path
    except OSError as e:
        logger.warning(f"Could not write .pth file to {pth_path}: {e}")
        return None


def _uninstall_pth_file(pth_path: str) -> None:
    """Remove the .pth file on exit."""
    try:
        if os.path.exists(pth_path):
            os.remove(pth_path)
            logger.debug(f"Removed .pth file: {pth_path}")
    except OSError:
        pass  # Best effort cleanup


def _setup_logging() -> None:
    """Set up Liveflow-specific logging that doesn't interfere with LiveKit's logging."""
    handler = logging.StreamHandler(sys.stderr)
    handler.setFormatter(logging.Formatter(
        "\033[36m[liveflow]\033[0m %(message)s"  # Cyan prefix for easy identification
    ))
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)


def _print_banner(port: int, script: str) -> None:
    """Print a startup banner so the user knows Liveflow is active."""
    print("\033[36m" + "=" * 60 + "\033[0m")
    print("\033[36m  🔍 Liveflow — LiveKit Agent Visualizer\033[0m")
    print(f"\033[36m  WebSocket: ws://127.0.0.1:{port}\033[0m")
    print(f"\033[36m  Script:    {script}\033[0m")
    print(f"\033[36m  Args:      {' '.join(sys.argv[2:]) if len(sys.argv) > 2 else '(none)'}\033[0m")
    print("\033[36m  Open the Liveflow panel in VS Code to visualize.\033[0m")
    print("\033[36m" + "=" * 60 + "\033[0m")


def main() -> None:
    """
    Main entry point.
    
    Parses args, starts the server + hook, then runs the user's script.
    The user's script gets sys.argv as if it was run directly:
        python -m liveflow agent.py dev  →  sys.argv = ["agent.py", "dev"]
    """
    _setup_logging()
    
    # ---- Parse arguments ----
    if len(sys.argv) < 2:
        print("Usage: python -m liveflow <agent-script.py> [dev|console|start] [args...]")
        print()
        print("Example:")
        print("  python -m liveflow agent.py dev")
        print("  python -m liveflow agent.py console")
        sys.exit(1)
    
    script_path = sys.argv[1]
    
    # Validate the script exists
    if not os.path.isfile(script_path):
        abs_path = os.path.join(os.getcwd(), script_path)
        if os.path.isfile(abs_path):
            script_path = abs_path
        else:
            print(f"Error: Script not found: {script_path}")
            sys.exit(1)
    
    script_path = os.path.abspath(script_path)
    
    # ---- Step 1: Start WebSocket server ----
    logger.info("Starting Liveflow WebSocket server...")
    
    from .ws_server import start_server
    server = start_server()
    atexit.register(server.stop)
    
    _print_banner(server.port, script_path)
    
    # ---- Step 1b: Scan agent code (static analysis) ----
    # Parse the user's agent.py with AST to discover ALL agents, tools, and
    # handoff relationships. Broadcast this as a code_scan message so the
    # VS Code dashboard can show the full graph immediately.
    logger.info("Scanning agent code for agents and tools...")
    from .code_scanner import scan_agent_file
    from .protocol import AgentInfo, CodeScanMessage, ScannedHandoff
    
    scan_result = scan_agent_file(script_path)
    if scan_result["agents"]:
        scan_msg = CodeScanMessage(
            agents=[
                AgentInfo(
                    id=a["id"],
                    name=a["name"],
                    instructions=a.get("instructions", ""),
                    tools=a.get("tools", []),
                )
                for a in scan_result["agents"]
            ],
            handoffs=[
                ScannedHandoff(
                    from_id=h["from_id"],
                    to_id=h["to_id"],
                    tool=h.get("tool", ""),
                )
                for h in scan_result["handoffs"]
            ],
        )
        # Store on server so it's replayed to new clients
        server.set_initial_scan(scan_msg)
        logger.info(f"Code scan: {len(scan_result['agents'])} agents, {len(scan_result['handoffs'])} handoffs")
    
    # ---- Step 2: Set LIVEFLOW_PORT for child processes ----
    # LiveKit dev mode spawns the agent in a child process via multiprocessing.
    # The env var is inherited by child processes and tells proc_main_wrapper
    # which port to forward events to.
    os.environ["LIVEFLOW_PORT"] = str(server.port)
    
    # ---- Step 3: Install hooks for child processes ----
    # Two mechanisms are needed:
    #
    # A) Direct hook: patches proc_main in THIS process
    #    → Works when _run_worker runs in-process (--no-reload)
    #
    # B) .pth file: patches proc_main in ALL new Python subprocesses
    #    → Needed because dev mode with reload uses watchfiles.arun_process()
    #      which spawns _run_worker in a FRESH subprocess (no patches survive)
    #    → The .pth file triggers liveflow._auto_hook on Python startup
    #    → _auto_hook checks LIVEFLOW_PORT and installs the child hook
    #    → Cleaned up on exit
    
    logger.info("Installing child process hooks...")
    
    # A) Direct hook in this process
    from .child_hook import install_child_process_hook
    install_child_process_hook()
    
    # B) .pth file for subprocess support (watchfiles reload)
    pth_path = _install_pth_file()
    if pth_path:
        atexit.register(_uninstall_pth_file, pth_path)
    
    # ---- Step 4: Run the user's script ----
    # Rewrite sys.argv so the user's script sees: ["agent.py", "dev", ...]
    sys.argv = sys.argv[1:]
    
    # Change directory to the script's directory (so relative imports work)
    script_dir = os.path.dirname(script_path)
    if script_dir:
        os.chdir(script_dir)
        if script_dir not in sys.path:
            sys.path.insert(0, script_dir)
    
    logger.info(f"Running {os.path.basename(script_path)}...")
    
    try:
        runpy.run_path(script_path, run_name="__main__")
    except SystemExit:
        pass
    except KeyboardInterrupt:
        logger.info("Interrupted by user")
    except Exception as e:
        logger.error(f"Script error: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
