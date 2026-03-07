import React from "react";
import { getVsCodeApi } from "../hooks/useVscodeMessages";

/**
 * Shown in the sidebar when no Liveflow server is running.
 * Gives users clear steps to get started.
 */
export function WelcomeView() {
  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--vscode-editor-background, #121218)",
        color: "var(--vscode-editor-foreground, #ccc)",
        fontFamily: "var(--vscode-font-family, system-ui, sans-serif)",
        padding: "24px 16px",
        textAlign: "center",
        gap: 24,
      }}
    >
      {/* Logo / Title */}
      <div>
        <div style={{ fontSize: 32, marginBottom: 4 }}>⚡</div>
        <h2
          style={{
            fontSize: 18,
            fontWeight: 700,
            margin: 0,
            color: "var(--vscode-foreground, #fff)",
          }}
        >
          Liveflow
        </h2>
        <p
          style={{
            fontSize: 11,
            color: "#888",
            margin: "4px 0 0",
          }}
        >
          Real-time visualization for LiveKit voice agents
        </p>
      </div>

      {/* Steps */}
      <div
        style={{
          textAlign: "left",
          width: "100%",
          maxWidth: 320,
        }}
      >
        <p
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "var(--vscode-foreground, #ddd)",
            margin: "0 0 12px",
          }}
        >
          Get started
        </p>

        <Step
          number={1}
          title="Install the Python package"
          code="pip install liveflow"
        />
        <Step
          number={2}
          title="Run your agent with Liveflow"
          code="python -m liveflow agent.py dev"
        />
        <Step
          number={3}
          title="Dashboard connects automatically"
          description="This panel will light up once a running agent is detected."
        />
      </div>

      {/* Waiting indicator */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 11,
          color: "#888",
        }}
      >
        <span
          style={{
            display: "inline-block",
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "#eab308",
            animation: "pulse 2s ease-in-out infinite",
          }}
        />
        Waiting for agent…
      </div>

      {/* Or-divider */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          width: "100%",
          maxWidth: 320,
        }}
      >
        <div style={{ flex: 1, height: 1, background: "#333" }} />
        <span style={{ fontSize: 10, color: "#666" }}>or</span>
        <div style={{ flex: 1, height: 1, background: "#333" }} />
      </div>

      {/* Run with Liveflow button */}
      <button
        onClick={() => {
          getVsCodeApi().postMessage({ type: "run_agent" });
        }}
        style={{
          background: "var(--vscode-button-background, #0e639c)",
          color: "var(--vscode-button-foreground, #fff)",
          border: "none",
          borderRadius: 4,
          padding: "8px 20px",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        ▶ Run with Liveflow
      </button>

      {/* Support links */}
      <div
        style={{
          fontSize: 10,
          color: "#666",
          lineHeight: 1.8,
        }}
      >
        <span>Need help? </span>
        <a
          href="mailto:2005lakshyapaliwal@gmail.com"
          style={{ color: "#3b82f6", textDecoration: "none" }}
        >
          2005lakshyapaliwal@gmail.com
        </a>
        <span> · </span>
        <a
          href="https://cal.com/lakshya-paliwal/30min"
          style={{ color: "#3b82f6", textDecoration: "none" }}
        >
          Book a call
        </a>
      </div>

      {/* Pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function Step({
  number,
  title,
  code,
  description,
}: {
  number: number;
  title: string;
  code?: string;
  description?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        marginBottom: 14,
      }}
    >
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: "#252530",
          border: "1px solid #444",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          fontWeight: 700,
          color: "#888",
          flexShrink: 0,
          marginTop: 1,
        }}
      >
        {number}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, color: "#ccc", marginBottom: 4 }}>
          {title}
        </div>
        {code && (
          <code
            style={{
              display: "block",
              fontSize: 11,
              background: "#1a1a24",
              border: "1px solid #333",
              borderRadius: 4,
              padding: "6px 8px",
              color: "#22c55e",
              fontFamily: "var(--vscode-editor-font-family, monospace)",
              wordBreak: "break-all",
            }}
          >
            {code}
          </code>
        )}
        {description && (
          <p
            style={{
              fontSize: 11,
              color: "#888",
              margin: 0,
            }}
          >
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
