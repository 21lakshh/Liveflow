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
# OR install from source:
cd python && pip install -e .
```

### 2. Run your agent with Liveflow

Instead of:
```bash
python agent.py dev
```

Run:
```bash
python liveflow agent.py dev
```

That's it! Your agent runs exactly as before, but Liveflow captures everything.

### 3. Open the VS Code Dashboard

The extension auto-detects the running Liveflow server and opens the dashboard panel. You can also use:
- **Status bar**: Click "⚡ Liveflow" 
- **Command palette**: `Liveflow: Run with Liveflow`

## Architecture

```
┌──────────────────────────┐    WebSocket     ┌──────────────────────┐
│  Liveflow Python Shim    │ ──────────────▶  │  VS Code Extension   │
│                          │   JSON events    │                      │
│  • Patches AgentSession  │                  │  • Webview panel     │
│  • Captures all events   │                  │  • ReactFlow graph   │
│  • Local WS server       │                  │  • Zustand store     │
└──────────────────────────┘                  └──────────────────────┘
         ▲                                              
         │  monkey-patch (transparent)                  
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

```
Liveflow/
├── python/                      # pip-installable Python package
│   ├── pyproject.toml
│   └── liveflow/
│       ├── __init__.py
│       ├── __main__.py          # Entry: python -m liveflow
│       ├── protocol.py          # JSON message schemas (Pydantic)
│       ├── interceptor.py       # SDK monkey-patching
│       └── ws_server.py         # WebSocket broadcast server
│
└── extension/                   # VS Code extension
    ├── package.json             # Extension manifest
    ├── src/
    │   ├── extension.ts         # Activation, commands, LiveKit detection
    │   ├── wsClient.ts          # WebSocket client → Python server
    │   ├── webviewProvider.ts   # Webview panel management
    │   └── types.ts             # TypeScript protocol types
    │
    └── webview/                 # React dashboard (built separately)
        ├── package.json
        ├── vite.config.ts
        └── src/
            ├── main.tsx
            ├── App.tsx          # 4-panel layout
            ├── styles.css
            ├── types.ts
            ├── store/index.ts   # Zustand state management
            ├── hooks/useVscodeMessages.ts
            └── components/
                ├── AgentGraph.tsx      # ReactFlow agent network
                ├── ToolTimeline.tsx    # Tool execution log
                ├── Transcript.tsx      # Conversation view
                ├── StateIndicator.tsx  # Status bar
                └── ChatInspector.tsx   # LLM context browser
```

## Development

### Build the React webview
```bash
cd extension/webview
npm install
npm run build
```

### Build the extension
```bash
cd extension
npm install
npm run build
```

### Test end-to-end
```bash
# Terminal 1: Install and run the Python package with your agent
cd python && pip install -e .
cd /path/to/your/agent
python -m liveflow agent.py dev

# Terminal 2: Open VS Code with the extension loaded
cd extension && code --extensionDevelopmentPath=. /path/to/your/agent
```

## Requirements

- **Python**: ≥ 3.9
- **LiveKit Agents SDK**: ≥ 1.0.0
- **Node.js**: ≥ 18 (for building the extension)
- **VS Code**: ≥ 1.85.0

## License

MIT
