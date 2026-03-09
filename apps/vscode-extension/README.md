<p align="center">
  <img src="https://raw.githubusercontent.com/21lakshh/Liveflow/main/packages/webview/public/icon.png" width="80" alt="Liveflow">
</p>

<h1 align="center">Liveflow — LiveKit Agent Visualizer</h1>

<p align="center">
  Real-time debugging dashboard for LiveKit voice agents inside VS Code.<br>
  See which agent is active, what tools are running, and follow conversations live — <strong>without touching your agent code.</strong>
</p>

<p align="center">
  <a href="https://github.com/21lakshh/Liveflow"><img src="https://img.shields.io/github/stars/21lakshh/Liveflow?style=social" alt="GitHub"></a>
</p>

---

## Quick Start

**1. Install the Python companion package**

```bash
pip install liveflow
```

**2. Run your agent with Liveflow**

```bash
liveflow agent.py dev
```

That's it — drop-in replacement for `python agent.py dev`. Your agent runs exactly as before while Liveflow captures everything in the background.

**3. Open VS Code**

The extension auto-connects to the running Liveflow server and populates the dashboard in the Activity Bar sidebar. You can also use the **▶ Run with Liveflow** button in the editor title bar to do steps 2 and 3 in one click.

No changes to your agent code required.

---

## Features

### Agent Graph
A live ReactFlow graph showing every agent in your pipeline as a node. The currently active agent is highlighted with an animated border. Handoff edges trace the call flow between agents with animated particles. Click **▾ Show tools** on any agent node to expand its available tools or live tool call history.

### Tool Timeline
Every `@function_tool` execution logged in real time — tool name, arguments, output, duration, and success/error status. Color-coded per agent.

### Conversation Transcript
Live speech-to-text transcript with partial (interim) and final utterances from both the user and agent, labeled by speaker.

### Chat Context Inspector
The full LLM context window at any point in the conversation — system prompt, function call results, handoff markers, and message history.

### State Indicator
A persistent status bar showing the current agent's state (`listening` / `thinking` / `speaking`) and user microphone state, plus WebSocket connection status.

---

## How It Works

```
┌─────────────────────────┐   WebSocket    ┌──────────────────────┐
│  liveflow Python shim   │ ─────────────▶ │  VS Code Extension   │
│  • Patches AgentSession │  JSON events   │  • Agent Graph       │
│  • Captures all events  │                │  • Tool Timeline     │
│  • Local WS server      │                │  • Transcript        │
└─────────────────────────┘                └──────────────────────┘
         ▲
         │  transparent monkey-patch
         │
┌─────────────────────────┐
│  Your agent.py          │  ← UNMODIFIED
│  (LiveKit Agents SDK)   │
└─────────────────────────┘
```

The Python package monkey-patches the LiveKit SDK's `AgentSession` to intercept events (state changes, tool calls, handoffs, transcripts) and streams them over a local WebSocket. The VS Code extension connects to that WebSocket and renders everything in real time in the Activity Bar sidebar.

---

## Requirements

- **VS Code** ≥ 1.85.0
- **Python** ≥ 3.9
- **LiveKit Agents SDK** ≥ 1.0.0
- `pip install liveflow` installed in your project's Python environment

---

## Source Code

[github.com/21lakshh/Liveflow](https://github.com/21lakshh/Liveflow) — MIT licensed, contributions welcome.
