import { useState } from "react";
import { getVsCodeApi } from "@/hooks/useVscodeMessages";
// @ts-ignore – Vite inlines small assets as base64 data URLs
import iconUrl from "../../public/icon.png";

const SANS = "var(--vscode-font-family, system-ui, sans-serif)";
const MONO = "var(--vscode-editor-font-family, 'JetBrains Mono', monospace)";

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
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: "#1e1e28",
          border: "1px solid #2e2e3a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 10,
          fontWeight: 600,
          color: "#555",
          flexShrink: 0,
          marginTop: 2,
        }}
      >
        {number}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, color: "#c9c9c9", marginBottom: 5, fontFamily: SANS }}>{title}</div>
        {code && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              background: "#0d0d12",
              border: "1px solid #1e1e2a",
              borderLeft: "2px solid #2e2e3e",
              borderRadius: 6,
              padding: "8px 8px 8px 12px",
              fontFamily: MONO,
              marginTop: 2,
            }}
          >
            <code style={{ fontSize: 12, color: "#c9c9d4", wordBreak: "break-all", lineHeight: 1.5 }}>{code}</code>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(code).catch(() => {});
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              title="Copy"
              style={{
                background: copied ? "#22d3ee18" : "#1a1a26",
                border: `1px solid ${copied ? "#22d3ee55" : "#2a2a38"}`,
                borderRadius: 4,
                cursor: "pointer",
                color: copied ? "#22d3ee" : "#666",
                fontSize: 13,
                fontFamily: MONO,
                flexShrink: 0,
                width: 28,
                height: 26,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.15s",
                padding: 0,
              }}
            >
              {copied ? "✓" : "⎘"}
            </button>
          </div>
        )}
        {description && (
          <p style={{ fontSize: 12, color: "#555", margin: "5px 0 0", fontFamily: SANS, lineHeight: 1.5 }}>{description}</p>
        )}
      </div>
    </div>
  );
}

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
        fontFamily: SANS,
        padding: "24px 16px",
        textAlign: "center",
        gap: 24,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <img src={iconUrl} alt="Liveflow" style={{ width: 52, height: 52, borderRadius: 12 }} />
        <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", color: "#fff", fontFamily: SANS }}>
          Liveflow
        </span>
        <span style={{ fontSize: 12, color: "#555", fontFamily: SANS, marginTop: -4 }}>
          Real-time visibility for LiveKit agents
        </span>
      </div>

      {/* Steps */}
      <div style={{ textAlign: "left", width: "100%", maxWidth: 320 }}>
        <p style={{ fontSize: 11, fontWeight: 500, color: "#555", margin: "0 0 14px", fontFamily: MONO, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Get started
        </p>
        <Step number={1} title="Install the Python package" code="pip install liveflow" />
        <Step number={2} title="Run your agent with Liveflow" code="python liveflow agent.py dev" />
        <Step
          number={3}
          title="Dashboard connects automatically"
          description="This panel will light up once a running agent is detected."
        />
      </div>

      {/* Waiting indicator */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#888", fontFamily: MONO }}>
        <span
          style={{
            display: "inline-block",
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "#eab308",
            animation: "lf-pulse 2s ease-in-out infinite",
          }}
        />
        Waiting for agent…
      </div>

      {/* Or-divider */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", maxWidth: 320 }}>
        <div style={{ flex: 1, height: 1, background: "#333" }} />
        <span style={{ fontSize: 10, color: "#666", fontFamily: MONO }}>or</span>
        <div style={{ flex: 1, height: 1, background: "#333" }} />
      </div>

      {/* Run button */}
      <button
        onClick={() => getVsCodeApi().postMessage({ type: "run_agent" })}
        style={{
          background: "#22d3ee",
          color: "#000",
          border: "none",
          borderRadius: 5,
          padding: "10px 24px",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontFamily: SANS,
          width: "100%",
          maxWidth: 320,
          justifyContent: "center",
        }}
      >
        ▶ Run with Liveflow
      </button>

      {/* Support links */}
      <div style={{ fontSize: 11, color: "#444", lineHeight: 1.8, fontFamily: SANS }}>
        <a href="mailto:2005lakshyapaliwal@gmail.com" style={{ color: "#3b82f6", textDecoration: "none" }}>
          Contact support
        </a>
        <span style={{ margin: "0 6px" }}>·</span>
        <a href="https://cal.com/lakshya-paliwal/30min" style={{ color: "#3b82f6", textDecoration: "none" }}>
          Book a call
        </a>
      </div>

      <style>{`
        @keyframes lf-pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}


