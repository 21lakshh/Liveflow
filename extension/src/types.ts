export type AgentState =
  | "initializing"
  | "idle"
  | "listening"
  | "thinking"
  | "speaking";

export type UserState = "speaking" | "listening" | "away";

export type ToolCallStatus = "running" | "success" | "error";

export interface BaseMessage {
  type: string;
  timestamp: string;
  session_id: string;
}

export interface AgentInfo {
  id: string;
  name: string;
  instructions: string;
  tools: string[];
}

export interface SessionInitMessage extends BaseMessage {
  type: "session_init";
  agents: AgentInfo[];
  current_agent_id: string;
  agent_state: AgentState;
  user_state: UserState;
}

export interface SessionEndMessage extends BaseMessage {
  type: "session_end";
  reason: string;
  error: string | null;
}

export interface AgentStateMessage extends BaseMessage {
  type: "agent_state";
  old_state: AgentState;
  new_state: AgentState;
  agent_id: string;
}

export interface UserStateMessage extends BaseMessage {
  type: "user_state";
  old_state: UserState;
  new_state: UserState;
}

export interface TranscriptMessage extends BaseMessage {
  type: "transcript";
  speaker: "user" | "agent";
  text: string;
  is_final: boolean;
  language: string | null;
  agent_id: string | null;
}

export interface ConversationItemMessage extends BaseMessage {
  type: "conversation_item";
  role: string;
  content: string;
  item_type: string;
  agent_id: string;
  metadata: Record<string, unknown>;
}

export interface ToolCallStartMessage extends BaseMessage {
  type: "tool_call_start";
  call_id: string;
  tool_name: string;
  arguments: string;
  agent_id: string;
}

export interface ToolCallEndMessage extends BaseMessage {
  type: "tool_call_end";
  call_id: string;
  tool_name: string;
  output: string;
  is_error: boolean;
  duration_ms: number;
  agent_id: string;
  has_handoff: boolean;
}

export interface HandoffMessage extends BaseMessage {
  type: "handoff";
  old_agent_id: string;
  new_agent_id: string;
  old_agent_name: string;
  new_agent_name: string;
  trigger_tool: string;
}

export interface SpeechCreatedMessage extends BaseMessage {
  type: "speech_created";
  user_initiated: boolean;
  source: string;
  agent_id: string;
}

export interface MetricsMessage extends BaseMessage {
  type: "metrics";
  metrics: Record<string, unknown>;
}

export interface ErrorMessage extends BaseMessage {
  type: "error";
  error_type: string;
  message: string;
  source: string;
}

export interface ChatContextItem {
  item_type: string;
  role: string;
  content: string;
  metadata: Record<string, unknown>;
}

export interface ChatContextSnapshotMessage extends BaseMessage {
  type: "chat_ctx_snapshot";
  items: ChatContextItem[];
  agent_id: string;
}

export interface PingMessage extends BaseMessage {
  type: "ping";
}

export interface PongMessage extends BaseMessage {
  type: "pong";
}

export interface ScannedHandoff {
  from_id: string;
  to_id: string;
  tool: string;
}

export interface CodeScanMessage extends BaseMessage {
  type: "code_scan";
  agents: AgentInfo[];
  handoffs: ScannedHandoff[];
}

export type LiveflowMessage =
  | SessionInitMessage
  | SessionEndMessage
  | AgentStateMessage
  | UserStateMessage
  | TranscriptMessage
  | ConversationItemMessage
  | ToolCallStartMessage
  | ToolCallEndMessage
  | HandoffMessage
  | SpeechCreatedMessage
  | MetricsMessage
  | ErrorMessage
  | ChatContextSnapshotMessage
  | CodeScanMessage
  | PingMessage
  | PongMessage;
