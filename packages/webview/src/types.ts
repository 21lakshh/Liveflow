export type AgentState = "initializing" | "idle" | "listening" | "thinking" | "speaking";
export type UserState = "speaking" | "listening" | "away";

export interface AgentInfo {
  id: string;
  name: string;
  instructions: string;
  tools: string[];
}

export interface ToolCall {
  call_id: string;
  tool_name: string;
  arguments: string;
  output: string;
  status: "running" | "success" | "error";
  duration_ms: number;
  agent_id: string;
  has_handoff: boolean;
  timestamp: string;
}

export interface TranscriptEntry {
  id: string;
  speaker: "user" | "agent";
  text: string;
  is_final: boolean;
  timestamp: string;
  agent_id?: string;
  language?: string;
}

export interface Handoff {
  old_agent_id: string;
  new_agent_id: string;
  old_agent_name: string;
  new_agent_name: string;
  trigger_tool: string;
  timestamp: string;
}

export interface ScannedHandoff {
  from_id: string;
  to_id: string;
  tool: string;
}

export interface ChatContextItem {
  item_type: string;
  role: string;
  content: string;
  metadata: Record<string, unknown>;
}

// Message types from the extension host
export interface LiveflowMessage {
  type: string;
  timestamp: string;
  session_id: string;
  [key: string]: unknown;
}
