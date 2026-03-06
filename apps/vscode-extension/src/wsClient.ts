/**
 * Liveflow WebSocket Client
 *
 * Connects to the Python-side Liveflow WebSocket server and forwards
 * messages to the webview panel. Handles reconnection with backoff.
 *
 * Data flow:
 *   Python interceptor → WebSocket → this client → webview.postMessage → React app
 */

import * as vscode from "vscode";
import WebSocket from "ws";
import { LiveflowMessage } from "./types";

export class LiveflowWsClient {
  private ws: WebSocket | null = null;
  private port: number;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 15;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private disposed = false;

  // Callback when a message arrives from Python
  public onMessage: ((msg: LiveflowMessage) => void) | null = null;
  // Callback when connection status changes
  public onConnectionChange: ((connected: boolean) => void) | null = null;
  // Callback to re-discover the port (set by extension.ts)
  public onPortRediscover: (() => number | null) | null = null;

  constructor(port: number) {
    this.port = port;
  }

  /**
   * Connect to the Python Liveflow server.
   * The server runs on localhost at the port discovered from the temp file.
   */
  connect(): void {
    if (this.disposed) return;

    const url = `ws://127.0.0.1:${this.port}`;
    console.log(`[Liveflow] Connecting to ${url}...`);

    this.ws = new WebSocket(url);

    this.ws.on("open", () => {
      console.log("[Liveflow] WebSocket connected");
      this.reconnectAttempts = 0;
      this.onConnectionChange?.(true);
    });

    this.ws.on("message", (data: WebSocket.Data) => {
      try {
        const msg = JSON.parse(data.toString()) as LiveflowMessage;
        this.onMessage?.(msg);
      } catch (e) {
        console.warn("[Liveflow] Failed to parse message:", e);
      }
    });

    this.ws.on("close", () => {
      console.log("[Liveflow] WebSocket disconnected");
      this.onConnectionChange?.(false);
      this.scheduleReconnect();
    });

    this.ws.on("error", (err) => {
      console.warn("[Liveflow] WebSocket error:", err.message);
      // 'close' event will fire after, triggering reconnect
    });
  }

  /**
   * Reconnect with exponential backoff.
   * Starts at 500ms, doubles each attempt, caps at 5s.
   * After 5 failed attempts, tries to re-discover the port in case the server
   * restarted on a different port (e.g., user restarted agent).
   */
  private scheduleReconnect(): void {
    if (this.disposed) return;
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log("[Liveflow] Max reconnect attempts reached");
      return;
    }

    const delay = Math.min(500 * Math.pow(2, this.reconnectAttempts), 5000);
    this.reconnectAttempts++;

    // Every 5 attempts, try re-discovering the port
    if (this.reconnectAttempts % 5 === 0 && this.onPortRediscover) {
      const newPort = this.onPortRediscover();
      if (newPort !== null && newPort !== this.port) {
        console.log(`[Liveflow] Port changed: ${this.port} → ${newPort}`);
        this.port = newPort;
      }
    }

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /** Send a message to the Python server (e.g., ping). */
  send(msg: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  /** Clean shutdown. */
  dispose(): void {
    this.disposed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }
}
