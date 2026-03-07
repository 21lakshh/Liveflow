
import React, { useState, useRef, useEffect } from "react";
import { useLiveflowStore } from "@/store";
import type { ChatContextItem } from "@/types";

// Colors for different item types
const TYPE_CONFIG: Record<string, { color: string; icon: string; label: string }> = {
  message: { color: "#3b82f6", icon: "💬", label: "Message" },
  function_call: { color: "#eab308", icon: "⚡", label: "Tool Call" },
  function_call_output: { color: "#22c55e", icon: "📤", label: "Tool Output" },
  agent_handoff: { color: "#a855f7", icon: "🔄", label: "Handoff" },
  unknown: { color: "#888", icon: "❓", label: "Unknown" },
};

const ROLE_COLORS: Record<string, string> = {
  system: "#f97316",
  user: "#3b82f6",
  assistant: "#a855f7",
  tool: "#22c55e",
};

function ChatItem({ item, index }: { item: ChatContextItem; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const config = TYPE_CONFIG[item.item_type] || TYPE_CONFIG.unknown;
  const roleColor = ROLE_COLORS[item.role] || "#888";

  return (
    <div
      style={{
        padding: "6px 10px",
        marginBottom: 2,
        background: index % 2 === 0 ? "transparent" : "#ffffff06",
        borderLeft: `2px solid ${config.color}`,
        cursor: "pointer",
        transition: "background 0.15s",
      }}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
        <span>{config.icon}</span>
        <span style={{ color: config.color, fontWeight: 600 }}>
          {config.label}
        </span>
        {item.role && (
          <span
            style={{
              fontSize: 9,
              padding: "1px 5px",
              borderRadius: 4,
              background: `${roleColor}22`,
              color: roleColor,
            }}
          >
            {item.role}
          </span>
        )}
        <span
          style={{
            marginLeft: "auto",
            color: "#555",
            fontSize: 10,
          }}
        >
          #{index + 1} {expanded ? "▾" : "▸"}
        </span>
      </div>

      {/* Content preview (always visible) */}
      {item.content && (
        <div
          style={{
            fontSize: 11,
            color: "#999",
            marginTop: 3,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: expanded ? "pre-wrap" : "nowrap",
            maxHeight: expanded ? "none" : 20,
            wordBreak: "break-word",
            lineHeight: 1.4,
          }}
        >
          {item.content}
        </div>
      )}

      {/* Metadata (expanded only) */}
      {expanded && Object.keys(item.metadata).length > 0 && (
        <div style={{ marginTop: 6 }}>
          <div style={{ fontSize: 9, color: "#666", marginBottom: 2 }}>METADATA</div>
          <pre
            style={{
              fontSize: 10,
              background: "#111",
              padding: 6,
              borderRadius: 4,
              margin: 0,
              color: "#888",
              overflow: "auto",
              maxHeight: 100,
              whiteSpace: "pre-wrap",
            }}
          >
            {JSON.stringify(item.metadata, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export function ChatInspector() {
  const chatContext = useLiveflowStore((s) => s.chatContext);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Filter state
  const [filters, setFilters] = useState<Set<string>>(
    new Set(["message", "function_call", "function_call_output", "agent_handoff"])
  );

  const toggleFilter = (type: string) => {
    setFilters((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const filteredItems = chatContext.filter((item) => filters.has(item.item_type));

  // Auto-scroll on new items
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatContext.length]);

  if (chatContext.length === 0) {
    return (
      <div style={emptyStyle}>
        <div style={{ fontSize: 24, marginBottom: 4 }}>📋</div>
        <div>Chat context empty</div>
        <div style={{ fontSize: 11, color: "#666" }}>
          The LLM's full context window will appear here
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Filter bar */}
      <div
        style={{
          display: "flex",
          gap: 4,
          padding: "6px 8px",
          borderBottom: "1px solid #333",
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: 10, color: "#888", lineHeight: "22px" }}>FILTER:</span>
        {Object.entries(TYPE_CONFIG)
          .filter(([key]) => key !== "unknown")
          .map(([key, config]) => (
            <button
              key={key}
              onClick={() => toggleFilter(key)}
              style={{
                fontSize: 10,
                padding: "2px 8px",
                borderRadius: 10,
                border: `1px solid ${filters.has(key) ? config.color : "#444"}`,
                background: filters.has(key) ? `${config.color}22` : "transparent",
                color: filters.has(key) ? config.color : "#666",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {config.icon} {config.label}
            </button>
          ))}
        <span style={{ marginLeft: "auto", fontSize: 10, color: "#666", lineHeight: "22px" }}>
          {filteredItems.length}/{chatContext.length}
        </span>
      </div>

      {/* Items list */}
      <div ref={scrollRef} style={{ flex: 1, overflow: "auto" }}>
        {filteredItems.map((item, i) => (
          <ChatItem key={i} item={item} index={i} />
        ))}
      </div>
    </div>
  );
}

const emptyStyle: React.CSSProperties = {
  height: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  color: "#888",
  fontSize: 13,
  textAlign: "center",
};
