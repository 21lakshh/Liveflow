# Liveflow — Real-time LiveKit Agent Visualizer

> VS Code extension + Python companion that lets you **visualize LiveKit agent conversations in real-time** — see which agent is active, what tools are running, and follow conversations live. **No changes to your agent code.**

## How It Works

Liveflow has two parts:

### 1. Python Package (`liveflow`)
A pip-installable wrapper that runs alongside your LiveKit agent. It monkey-patches the LiveKit SDK's `AgentSession` to intercept events (state changes, tool calls, handoffs, transcripts) and streams them over a local WebSocket.

### 2. VS Code Extension
Auto-detects LiveKit projects, provides a "Run with Liveflow" button, connects to the Python WebSocket, and renders a real-time dashboard with:

- **Agent Graph** — ReactFlow visualization showing all agents as nodes, with the active agent highlighted and animated handoff transitions
- **Tool Timeline** — Every `@function_tool` execution with args, output, duration, and status
- **Conversation Transcript** — Live user/agent speech with interim transcripts
- **Chat Context Inspector** — Full LLM context window including system prompts, function calls, and handoff markers
- **State Indicator** — Real-time agent state (listening/thinking/speaking) and user mic status

## Quick Start

### 1. Install the Python package

```bash
pip install liveflow
```

### 2. Run your agent with Liveflow

```bash
# Before
python agent.py dev

# After — drop-in replacement
liveflow agent.py dev
```

Your agent runs exactly as before. Liveflow captures everything transparently in the background.

### 3. Open the VS Code Dashboard

Install the [Liveflow VS Code extension](https://marketplace.visualstudio.com/items?itemName=liveflow.liveflow) — it auto-connects to the running Liveflow server and opens the dashboard in the Activity Bar sidebar. You can also click **▶ Run with Liveflow** in the editor title bar to skip step 2 entirely.

## Architecture

```
┌──────────────────────────┐    WebSocket     ┌──────────────────────┐
│  Liveflow Python Shim    │ ──────────────▶  │  VS Code Extension   │
│                          │   JSON events    │                      │
│  • Patches AgentSession  │                  │  • Webview sidebar   │
│  • Captures all events   │                  │  • ReactFlow graph   │
│  • Local WS server       │                  │  • Zustand store     │
└──────────────────────────┘                  └──────────────────────┘
         ▲
         │  transparent monkey-patch
         │
┌──────────────────────────┐
│  Your agent.py           │  ← UNMODIFIED
│  (LiveKit Agents SDK)    │
└──────────────────────────┘
```

### Intercepted Events

| Event | What Liveflow Captures |
|-------|----------------------|
| `agent_state_changed` | Agent transitions: listening → thinking → speaking |
| `user_state_changed` | User mic: speaking ↔ listening ↔ away |
| `user_input_transcribed` | Real-time speech-to-text (partial + final) |
| `conversation_item_added` | Every message in the chat context |
| `function_tools_executed` | Tool name, arguments, output, duration |
| `update_agent()` | Agent handoffs (old → new agent) |
| `session.start()` | Agent registry discovery |
| `metrics_collected` | LLM/STT/TTS performance metrics |
| `error` | Pipeline errors |

## Project Structure

This is a [Turborepo](https://turbo.build/repo) monorepo.

```
Liveflow/
├── apps/
│   ├── vscode-extension/        # VS Code extension (esbuild)
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── extension.ts     # Activation, commands, LiveKit detection
│   │   │   └── webviewProvider.ts
│   │   └── media/               # Icons
│   │
│   └── landing/                 # Next.js marketing site
│       └── ...
│
├── packages/
│   └── webview/                 # React dashboard (Vite)
│       └── src/
│           ├── App.tsx
│           ├── store/index.ts   # Zustand state
│           └── components/
│               ├── AgentGraph.tsx
│               ├── ToolTimeline.tsx
│               ├── Transcript.tsx
│               ├── ChatInspector.tsx
│               └── StateIndicator.tsx
│
└── python/                      # pip-installable Python package
    ├── pyproject.toml
    └── liveflow/
        ├── __main__.py          # CLI entry: liveflow agent.py dev
        ├── interceptor.py       # SDK monkey-patching
        ├── ws_server.py         # WebSocket broadcast server
        └── protocol.py          # Pydantic message schemas
```

## Development

### Prerequisites

- Node.js ≥ 18
- npm ≥ 9
- Python ≥ 3.9

### Install dependencies

```bash
npm install
```

### Build everything

```bash
npx turbo run build
```

### Build a specific package

```bash
# Webview + extension only
npx turbo run build --filter=liveflow

# Landing site only
npx turbo run build --filter=landing
```

### Package the VS Code extension

```bash
cd apps/vscode-extension
npx vsce package --no-dependencies
code --install-extension liveflow-0.1.0.vsix
```

### Build the Python package

```bash
cd python
pip install -e .        # local dev install
python -m build         # produce dist/ for PyPI
```

### Test end-to-end

```bash
# Terminal 1: run your agent via Liveflow
cd /path/to/your/agent
liveflow agent.py dev

# Terminal 2: open VS Code with the dev extension loaded
cd apps/vscode-extension
code --extensionDevelopmentPath=. /path/to/your/agent
```

## Requirements

- **Python**: ≥ 3.9
- **LiveKit Agents SDK**: ≥ 1.0.0
- **Node.js**: ≥ 18
- **VS Code**: ≥ 1.85.0

## License

MIT
