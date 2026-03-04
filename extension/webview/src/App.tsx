
import React, { useState } from "react";
import { useVscodeMessages } from "./hooks/useVscodeMessages";
import { StateIndicator } from "./components/StateIndicator";
import { AgentGraph } from "./components/AgentGraph";
import { ToolTimeline } from "./components/ToolTimeline";
import { Transcript } from "./components/Transcript";
import { ChatInspector } from "./components/ChatInspector";

// Panel wrapper with collapsible header
function Panel({
  title,
  icon,
  children,
  defaultCollapsed = false,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
  defaultCollapsed?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        border: "1px solid #333",
        borderRadius: 8,
        background: "var(--vscode-editor-background, #1e1e1e)",
      }}
    >
      {/* Panel header */}
      <div
        onClick={() => setCollapsed(!collapsed)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 10px",
          background: "#252530",
          borderBottom: collapsed ? "none" : "1px solid #333",
          cursor: "pointer",
          userSelect: "none",
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 12 }}>{icon}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: "#ccc" }}>
          {title}
        </span>
        <span style={{ marginLeft: "auto", fontSize: 10, color: "#666" }}>
          {collapsed ? "▸" : "▾"}
        </span>
      </div>

      {/* Panel content */}
      {!collapsed && (
        <div style={{ flex: 1, overflow: "hidden", minHeight: 0 }}>
          {children}
        </div>
      )}
    </div>
  );
}

export default function App() {
  // Initialize the VS Code message bridge
  useVscodeMessages();

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--vscode-editor-background, #121218)",
        color: "var(--vscode-editor-foreground, #ccc)",
        fontFamily: "var(--vscode-font-family, system-ui, sans-serif)",
        overflow: "hidden",
      }}
    >
      {/* Top status bar */}
      <StateIndicator />

      {/* Main content — 2×2 grid */}
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gridTemplateRows: "1fr 1fr",
          gap: 4,
          padding: 4,
          minHeight: 0,
        }}
      >
        {/* Top-left: Agent Graph */}
        <Panel title="Agent Graph" icon="🔗">
          <AgentGraph />
        </Panel>

        {/* Top-right: Tool Timeline */}
        <Panel title="Tool Calls" icon="🔧">
          <ToolTimeline />
        </Panel>

        {/* Bottom-left: Transcript */}
        <Panel title="Conversation" icon="💬">
          <Transcript />
        </Panel>

        {/* Bottom-right: Chat Inspector */}
        <Panel title="Chat Context" icon="📋">
          <ChatInspector />
        </Panel>
      </div>
    </div>
  );
}
