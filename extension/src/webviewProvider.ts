import * as vscode from "vscode";
import { LiveflowMessage } from "./types";

export class LiveflowWebviewProvider {
  private panel: vscode.WebviewPanel | null = null;
  private extensionUri: vscode.Uri;
  private messageQueue: LiveflowMessage[] = [];
  private webviewReady = false;
  // Messages that should always be available on load (code_scan + session_init)
  private persistentMessages: LiveflowMessage[] = [];

  constructor(extensionUri: vscode.Uri) {
    this.extensionUri = extensionUri;
  }

  /**
   * Store a message so it's embedded directly in the webview HTML.
   * Use this for code_scan and session_init so they're available
   * synchronously before React even mounts — zero timing race.
   *
   * If the webview is already ready (React mounted), sends directly via postMessage.
   */
  setPersistentMessage(msg: LiveflowMessage): void {
    // Replace existing message of the same type
    const idx = this.persistentMessages.findIndex((m) => m.type === msg.type);
    if (idx >= 0) {
      this.persistentMessages[idx] = msg;
    } else {
      this.persistentMessages.push(msg);
    }
    // If React is already ready, deliver directly
    if (this.panel && this.webviewReady) {
      this.panel.webview.postMessage(msg);
    }
    // If not ready yet: the message is embedded in the HTML (via getHtmlContent)
    // and will also be re-sent from persistentMessages when webview_ready fires
  }

  /**
   * Open (or focus) the Liveflow dashboard panel.
   *
   * Creates a webview panel in the editor area with:
   * - retainContextWhenHidden: true → keeps React state alive when user switches tabs
   * - localResourceRoots → allows loading the built React app assets
   */
  show(): void {
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.Beside);
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      "liveflow",
      "Liveflow",
      vscode.ViewColumn.Beside,
      {
        enableScripts: true, // React needs JavaScript
        retainContextWhenHidden: true, // Don't destroy state on tab switch
        localResourceRoots: [
          vscode.Uri.joinPath(this.extensionUri, "dist", "webview"),
        ],
      }
    );

    this.panel.webview.html = this.getHtmlContent();

    // Handle messages from the React app
    this.panel.webview.onDidReceiveMessage((msg) => {
      if (msg.type === "webview_ready") {
        this.webviewReady = true;
        // Re-send persistent messages first (code_scan, session_init).
        // These may already be in the HTML embed but re-sending is idempotent
        // and covers the case where they arrived after the HTML was generated.
        for (const persistent of this.persistentMessages) {
          this.panel?.webview.postMessage(persistent);
        }
        // Then flush any live messages queued while React was loading
        for (const queued of this.messageQueue) {
          this.panel?.webview.postMessage(queued);
        }
        this.messageQueue = [];
      }
    });

    this.panel.onDidDispose(() => {
      this.panel = null;
      this.webviewReady = false;
    });
  }

  /**
   * Forward a Liveflow message from the WebSocket to the React app.
   * Queue messages until the webview has signaled it's ready ("webview_ready").
   * This prevents losing messages that arrive between panel creation and React mount.
   */
  postMessage(msg: LiveflowMessage): void {
    if (this.panel && this.webviewReady) {
      this.panel.webview.postMessage(msg);
    } else {
      this.messageQueue.push(msg);
    }
  }

  /** Update the connection status indicator in the webview. */
  setConnectionStatus(connected: boolean): void {
    this.postMessage({
      type: "connection_status",
      connected,
    } as any);
  }

  /** Check if the panel is currently visible. */
  get isVisible(): boolean {
    return this.panel !== null;
  }

  /** Close the panel. */
  dispose(): void {
    this.panel?.dispose();
    this.panel = null;
    this.messageQueue = [];
    this.persistentMessages = [];
    this.webviewReady = false;
  }

  /**
   * Generate the HTML that hosts the React app.
   *
   * In development, we load from the Vite dev server.
   * In production, we load the built assets from dist/webview/.
   *
   * The key security measure is the Content-Security-Policy (CSP) which
   * restricts what the webview can load — only our own scripts and styles.
   */
  private getHtmlContent(): string {
    const webview = this.panel!.webview;

    // Resolve paths to the built React app assets
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

    // Nonce for CSP — prevents injection attacks
    const nonce = getNonce();

    // Embed persistent messages (code_scan, session_init) as a synchronous
    // script that runs BEFORE React loads. This eliminates all timing races.
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
