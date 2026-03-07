
import React from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { useVscodeMessages } from "@/hooks/useVscodeMessages";
import { useLiveflowStore } from "@/store";
import { StateIndicator } from "@/components/StateIndicator";
import { AgentGraph } from "@/components/AgentGraph";
import { BottomDrawer } from "@/components/BottomDrawer";
import { WelcomeView } from "@/components/WelcomeView";

export default function App() {
  // Initialize the VS Code message bridge
  useVscodeMessages();

  // Show welcome screen when no session data has arrived yet
  const hasSession = useLiveflowStore(
    (s) => s.sessionStarted || s.agents.length > 0
  );

  if (!hasSession) {
    return <WelcomeView />;
  }

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

      {/* Agent Graph — fills remaining space */}
      <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
        <ReactFlowProvider>
          <AgentGraph />
        </ReactFlowProvider>
      </div>

      {/* Bottom drawer — Tools / Transcript / Context */}
      <BottomDrawer />
    </div>
  );
}
