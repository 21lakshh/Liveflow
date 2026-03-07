import * as vscode from "vscode";
import { LiveflowMessage } from "./types";

/**
 * LiveflowWebviewProvider implements vscode.WebviewViewProvider so the
 * Liveflow dashboard lives in the VS Code Activity Bar sidebar.
 *
 * VS Code calls resolveWebviewView() the first time the sidebar panel
 * becomes visible. From that point on we hold a reference to the
 * WebviewView and use it for all message passing.
 */
export class LiveflowWebviewProvider implements vscode.WebviewViewProvider {
  private _view: vscode.WebviewView | undefined;
  private readonly extensionUri: vscode.Uri;
  private messageQueue: LiveflowMessage[] = [];
  private webviewReady = false;
  // Messages that must always be available on load (code_scan + session_init)
  private persistentMessages: LiveflowMessage[] = [];

  /** The view-id declared in package.json contributes.views */
  static readonly viewId = "liveflow.sidebar";

  /**
   * Callback fired whenever the sidebar becomes visible.
   * extension.ts uses this to trigger server auto-detection.
   */
  onViewReady: (() => void) | null = null;

  constructor(extensionUri: vscode.Uri) {
    this.extensionUri = extensionUri;
  }

  /**
   * Called by VS Code when the sidebar panel is first shown (or after a
   * context rebuild). Configure the webview and wire up message handlers.
   */
  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.extensionUri, "dist", "webview"),
      ],
    };

    webviewView.webview.html = this.getHtmlContent(webviewView.webview);

    // Notify extension.ts that the sidebar is visible — triggers server auto-detect
    this.onViewReady?.();

    // Handle messages from the React app
    webviewView.webview.onDidReceiveMessage((msg) => {
      if (msg.type === "webview_ready") {
        this.webviewReady = true;
        // Re-deliver persistent messages (code_scan, session_init).
        // They're already in the HTML embed via __LIVEFLOW_INITIAL_MESSAGES__
        // but re-sending is idempotent and covers late arrivals.
        for (const persistent of this.persistentMessages) {
          this._view?.webview.postMessage(persistent);
        }
        // Flush queued live messages
        for (const queued of this.messageQueue) {
          this._view?.webview.postMessage(queued);
        }
        this.messageQueue = [];
      } else if (msg.type === "run_agent") {
        // User clicked "Run with Liveflow" in the welcome screen
        vscode.commands.executeCommand("liveflow.runAgent");
      }
    });

    webviewView.onDidDispose(() => {
      this._view = undefined;
      this.webviewReady = false;
    });

    // When the sidebar becomes visible again, trigger server auto-detect.
    // Do NOT reload HTML here — retainContextWhenHidden keeps React alive.
    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        this.onViewReady?.();
      }
    });
  }

  /**
   * Store a message so it's embedded directly in the webview HTML.
   * Use this for code_scan and session_init so they're available
   * synchronously before React mounts — zero timing race.
   *
   * If the webview is already ready (React mounted), sends directly via postMessage.
   */
  setPersistentMessage(msg: LiveflowMessage): void {
    const idx = this.persistentMessages.findIndex((m) => m.type === msg.type);
    if (idx >= 0) {
      this.persistentMessages[idx] = msg;
    } else {
      this.persistentMessages.push(msg);
    }
    if (this._view && this.webviewReady) {
      this._view.webview.postMessage(msg);
    }
  }

  /**
   * Reveal the Liveflow sidebar panel in the Activity Bar.
   * Works whether the sidebar is hidden, collapsed, or already visible.
   */
  show(): void {
    vscode.commands.executeCommand(
      `${LiveflowWebviewProvider.viewId}.focus`
    );
  }

  /**
   * Forward a Liveflow message from the WebSocket to the React app.
   * Queues messages until the webview signals it's ready ("webview_ready").
   */
  postMessage(msg: LiveflowMessage): void {
    if (this._view && this.webviewReady) {
      this._view.webview.postMessage(msg);
    } else {
      this.messageQueue.push(msg);
    }
  }

  /** Update the connection status indicator in the webview. */
  setConnectionStatus(connected: boolean): void {
    this.postMessage({ type: "connection_status", connected } as any);
  }

  /** True if the sidebar panel is currently visible to the user. */
  get isVisible(): boolean {
    return this._view !== undefined && this._view.visible;
  }

  /**
   * Reset internal state (called when an agent session stops).
   * Does NOT destroy the sidebar view — it stays registered.
   */
  reset(): void {
    this.messageQueue = [];
    this.persistentMessages = [];
    this.webviewReady = false; // must be false before HTML reload so messages queue
    // Reload HTML so stale session data is wiped from the React store
    if (this._view) {
      this._view.webview.html = this.getHtmlContent(this._view.webview);
    }
  }

  /**
   * Generate the HTML that hosts the React app.
   *
   * Embeds persistent messages (code_scan, session_init) synchronously
   * as window.__LIVEFLOW_INITIAL_MESSAGES__ before React loads — this
   * eliminates all timing races between message arrival and React mount.
   */
  private getHtmlContent(webview: vscode.Webview): string {
    const webviewDistPath = vscode.Uri.joinPath(
      this.extensionUri,
      "dist",
      "webview"
    );
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(webviewDistPath, "index.js")
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(webviewDistPath, "index.css")
    );

    const nonce = getNonce();
    const initialData = JSON.stringify(this.persistentMessages);

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" 
          content="default-src 'none'; 
                   style-src ${webview.cspSource} 'unsafe-inline'; 
                   script-src 'nonce-${nonce}'; 
                   font-src ${webview.cspSource};
                   img-src ${webview.cspSource} data:;">
    <link href="${styleUri}" rel="stylesheet">
    <title>Liveflow</title>
</head>
<body>
    <div id="root"></div>
    <script nonce="${nonce}">
      // Pre-loaded state from Python code scan — available before React mounts
      window.__LIVEFLOW_INITIAL_MESSAGES__ = ${initialData};
    </script>
    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

/** Generate a random nonce for Content-Security-Policy. */
function getNonce(): string {
  let text = "";
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return text;
}
