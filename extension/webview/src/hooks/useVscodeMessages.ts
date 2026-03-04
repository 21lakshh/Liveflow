import { useEffect } from "react";
import { useLiveflowStore } from "../store";

// VS Code webview API (injected by VS Code into the webview's global scope)
declare function acquireVsCodeApi(): {
  postMessage(msg: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
};

// Cache the API instance (can only call acquireVsCodeApi once)
let vscodeApi: ReturnType<typeof acquireVsCodeApi> | null = null;

function getVsCodeApi() {
  if (!vscodeApi) {
    try {
      vscodeApi = acquireVsCodeApi();
    } catch {
      // Not running inside VS Code (e.g., during development)
      console.warn("[Liveflow] Not in VS Code webview, using mock API");
      vscodeApi = {
        postMessage: (msg) => console.log("[mock postMessage]", msg),
        getState: () => null,
        setState: () => {},
      };
    }
  }
  return vscodeApi;
}

export function useVscodeMessages() {
  const handleMessage = useLiveflowStore((s) => s.handleMessage);

  useEffect(() => {
    const api = getVsCodeApi();

    const w = window as any;
    if (Array.isArray(w.__LIVEFLOW_INITIAL_MESSAGES__)) {
      console.log(`[Liveflow] Pre-embedded messages: ${w.__LIVEFLOW_INITIAL_MESSAGES__.length}`);
      for (const msg of w.__LIVEFLOW_INITIAL_MESSAGES__) {
        if (msg && typeof msg.type === "string") {
          console.log(`[Liveflow] Embedded: ${msg.type}`, msg.type === "code_scan" ? `agents=${(msg as any).agents?.length}` : "");
          handleMessage(msg);
        }
      }
      // Clear so we don't replay on hot-reload / re-mount
      w.__LIVEFLOW_INITIAL_MESSAGES__ = [];
    }

    // Listen for live messages from the extension host
    const handler = (event: MessageEvent) => {
      const msg = event.data;
      if (msg && typeof msg.type === "string") {
        if (msg.type === "code_scan" || msg.type === "session_init" || msg.type === "handoff") {
          console.log(`[Liveflow] Live: ${msg.type}`, JSON.stringify(msg).slice(0, 200));
        }
        handleMessage(msg);
      }
    };

    window.addEventListener("message", handler);

    // Tell the extension we're ready to receive live messages
    api.postMessage({ type: "webview_ready" });

    return () => {
      window.removeEventListener("message", handler);
    };
  }, [handleMessage]);
}
