import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { LiveflowWsClient } from "./wsClient";
import { LiveflowWebviewProvider } from "./webviewProvider";

// Global state
let statusBarItem: vscode.StatusBarItem;
let wsClient: LiveflowWsClient | null = null;
let webviewProvider: LiveflowWebviewProvider | null = null;
let agentTerminal: vscode.Terminal | null = null;
let portWatcher: NodeJS.Timeout | null = null;


export function activate(context: vscode.ExtensionContext) {
  console.log("[Liveflow] Extension activating...");

  // Create the sidebar webview provider and register it immediately.
  // VS Code will call resolveWebviewView() when the sidebar panel is first shown.
  webviewProvider = new LiveflowWebviewProvider(context.extensionUri);

  // When the sidebar becomes visible, try to auto-connect to a running server
  webviewProvider.onViewReady = () => {
    if (!wsClient) {
      const port = findRunningServerPort();
      if (port !== null) {
        console.log(`[Liveflow] Sidebar visible — found server on port ${port}, connecting...`);
        connectToServer(context, port);
        if (statusBarItem) {
          statusBarItem.text = "$(sync~spin) Liveflow Running";
          statusBarItem.command = "liveflow.stopAgent";
          statusBarItem.tooltip = "Click to stop Liveflow";
        }
      } else {
        // No server yet — start polling so we connect as soon as one appears
        watchForPortFile(context);
      }
    }
  };

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      LiveflowWebviewProvider.viewId,
      webviewProvider,
      { webviewOptions: { retainContextWhenHidden: true } }
    )
  );

  // Check if this is a LiveKit project and set context for UI elements
  detectLiveKitProject().then((isLiveKit) => {
    vscode.commands.executeCommand(
      "setContext",
      "liveflow.isLiveKitProject",
      isLiveKit
    );

    if (isLiveKit) {
      console.log("[Liveflow] LiveKit project detected!");
      showStatusBar(context);
    }
  });

  // Connect to a running Liveflow server
  autoConnectToRunningServer(context);

  // "Run with Liveflow" — the main command
  // If a server is already running, connects to it. Otherwise launches a new agent.
  context.subscriptions.push(
    vscode.commands.registerCommand("liveflow.runAgent", () => {
      const port = findRunningServerPort();
      if (port !== null && !wsClient) {
        vscode.window.showInformationMessage(`Liveflow: Found running server on port ${port}, connecting...`);
        connectAndShowPanel(context, port);
        if (statusBarItem) {
          statusBarItem.text = "$(sync~spin) Liveflow Running";
          statusBarItem.command = "liveflow.stopAgent";
          statusBarItem.tooltip = "Click to stop Liveflow";
        }
      } else if (wsClient) {
        // Already connected — just show the sidebar panel
        webviewProvider?.show();
      } else {
        runWithLiveflow(context);
      }
    })
  );

  // "Open Liveflow Panel" — reveals the sidebar, connects if server is found
  context.subscriptions.push(
    vscode.commands.registerCommand("liveflow.openPanel", () => {
      webviewProvider?.show();

      if (!wsClient) {
        const port = findRunningServerPort();
        if (port !== null) {
          connectToServer(context, port);
        } else {
          vscode.window.showInformationMessage("Liveflow: Sidebar open. Waiting for server... Run 'python -m liveflow agent.py dev'.");
          watchForPortFile(context);
        }
      }
    })
  );

  // "Stop Liveflow" — kill everything
  context.subscriptions.push(
    vscode.commands.registerCommand("liveflow.stopAgent", () =>
      stopLiveflow()
    )
  );
}

/**
 * Called when the extension is deactivated (VS Code closing).
 */
export function deactivate() {
  stopLiveflow();
}

/**
 * Scan the temp directory for liveflow-*.port files and return the most recent valid port.
 */
function findRunningServerPort(): number | null {
  try {
    const tmpDir = os.tmpdir();
    const files = fs.readdirSync(tmpDir);
    const portFiles = files.filter(
      (f) => f.startsWith("liveflow-") && f.endsWith(".port")
    );

    if (portFiles.length === 0) return null;

    // Sort by modification time (newest first) to pick the most recent server
    const sorted = portFiles
      .map((f) => {
        const fullPath = path.join(tmpDir, f);
        try {
          const stat = fs.statSync(fullPath);
          return { file: f, path: fullPath, mtime: stat.mtimeMs };
        } catch {
          return null;
        }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => b.mtime - a.mtime);

    // Try each port file (newest first), clean up stale ones
    for (const entry of sorted) {
      try {
        const port = parseInt(fs.readFileSync(entry.path, "utf-8").trim(), 10);
        if (!isNaN(port) && port > 0 && port < 65536) {
          // Extract PID from filename: liveflow-<pid>.port
          const pidMatch = entry.file.match(/liveflow-(\d+)\.port/);
          if (pidMatch) {
            const pid = parseInt(pidMatch[1], 10);
            // Check if the process is still alive
            try {
              process.kill(pid, 0); // signal 0 = just check existence
              return port; // Process alive, this port is valid
            } catch {
              // Process is dead — clean up stale port file
              try { fs.unlinkSync(entry.path); } catch {}
              continue;
            }
          }
          return port;
        }
      } catch {
        // Can't read file, clean it up
        try { fs.unlinkSync(entry.path); } catch {}
      }
    }
  } catch {
    // tmpdir scan failed
  }
  return null;
}

/**
 * On activation, try to connect to a running server. Retries a few times
 * to handle the case where the server is still starting up.
 */
function autoConnectToRunningServer(context: vscode.ExtensionContext): void {
  let retries = 0;
  const maxRetries = 6; // 3 seconds total

  const check = () => {
    const port = findRunningServerPort();
    if (port !== null) {
      console.log(`[Liveflow] Found running server on port ${port}, auto-connecting...`);
      connectAndShowPanel(context, port);
      if (statusBarItem) {
        statusBarItem.text = "$(sync~spin) Liveflow Running";
        statusBarItem.command = "liveflow.stopAgent";
        statusBarItem.tooltip = "Click to stop Liveflow";
      }
    } else if (retries < maxRetries) {
      retries++;
      setTimeout(check, 500);
    }
  };

  // Start checking after a brief delay for extension init
  setTimeout(check, 500);
}

/**
 * Scan the workspace for signs of a LiveKit project.
 *
 * Looks for:
 * - "livekit" in requirements.txt or pyproject.toml
 * - "from livekit" or "import livekit" in any .py file
 *
 * This runs once on activation and sets the `liveflow.isLiveKitProject` context
 * variable, which controls when the status bar button and editor title button appear.
 */
async function detectLiveKitProject(): Promise<boolean> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) return false;

  // Check requirements.txt and pyproject.toml
  const depFiles = await vscode.workspace.findFiles(
    "{**/requirements.txt,**/pyproject.toml}",
    "**/node_modules/**",
    10
  );

  for (const file of depFiles) {
    try {
      const content = (await vscode.workspace.fs.readFile(file)).toString();
      if (content.includes("livekit")) {
        return true;
      }
    } catch {
      continue;
    }
  }

  // Check Python files for livekit imports
  const pyFiles = await vscode.workspace.findFiles(
    "**/*.py",
    "**/node_modules/**",
    20
  );

  for (const file of pyFiles) {
    try {
      const content = (await vscode.workspace.fs.readFile(file)).toString();
      if (
        content.includes("from livekit") ||
        content.includes("import livekit")
      ) {
        return true;
      }
    } catch {
      continue;
    }
  }

  return false;
}

/**
 * Show the "$(zap) Liveflow" button in the status bar.
 * Clicking it runs the "Run with Liveflow" command.
 */
function showStatusBar(context: vscode.ExtensionContext) {
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100
  );
  statusBarItem.text = "$(zap) Liveflow";
  statusBarItem.tooltip = "Run your LiveKit agent with Liveflow visualization";
  statusBarItem.command = "liveflow.runAgent";
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);
}

/**
 * The main flow when user clicks "Run with Liveflow":
 *
 * 1. Ask user to pick the agent .py file (defaults to agent.py if found)
 * 2. Ask for run mode (dev, console, start)
 * 3. Open a VS Code terminal and run `python -m liveflow <script> <mode>`
 * 4. Watch for the port file (the Python server writes it on startup)
 * 5. Connect WebSocket to that port
 * 6. Open the webview panel
 * 7. Pipe all messages: WebSocket → webview
 */
async function runWithLiveflow(context: vscode.ExtensionContext) {
  // Stop any existing session first
  stopLiveflow();

  // ---- Pick agent script ----
  const pyFiles = await vscode.workspace.findFiles(
    "**/*.py",
    "**/node_modules/**",
    50
  );

  // Find likely agent files (contain "agents.cli.run_app" or "entrypoint")
  const agentFiles: vscode.Uri[] = [];
  const otherFiles: vscode.Uri[] = [];

  for (const file of pyFiles) {
    try {
      const content = (await vscode.workspace.fs.readFile(file)).toString();
      if (
        content.includes("agents.cli.run_app") ||
        content.includes("entrypoint_fnc")
      ) {
        agentFiles.push(file);
      } else {
        otherFiles.push(file);
      }
    } catch {
      otherFiles.push(file);
    }
  }

  const allFiles = [...agentFiles, ...otherFiles];
  if (allFiles.length === 0) {
    vscode.window.showErrorMessage("No Python files found in workspace.");
    return;
  }

  // If there's exactly one agent file, use it directly
  let selectedFile: vscode.Uri;
  if (agentFiles.length === 1) {
    selectedFile = agentFiles[0];
  } else {
    const picked = await vscode.window.showQuickPick(
      allFiles.map((f) => ({
        label: vscode.workspace.asRelativePath(f),
        description: agentFiles.includes(f) ? "$(star) Agent file" : "",
        uri: f,
      })),
      {
        placeHolder: "Select your LiveKit agent script",
        title: "Liveflow: Select Agent",
      }
    );
    if (!picked) return;
    selectedFile = (picked as any).uri;
  }

  // ---- Pick run mode ----
  const mode = await vscode.window.showQuickPick(
    [
      {
        label: "dev",
        description: "Connect to LiveKit server (development mode)",
        detail: "Use with agents-playground.livekit.io",
      },
      {
        label: "console",
        description: "Local mic/speaker (no server needed)",
        detail: "Quick testing with your microphone",
      },
      {
        label: "start",
        description: "Production mode",
        detail: "Standard LiveKit worker start",
      },
    ],
    {
      placeHolder: "Select run mode",
      title: "Liveflow: Run Mode",
    }
  );
  if (!mode) return;

  // ---- Launch terminal ----
  const scriptPath = selectedFile.fsPath;
  const workspaceFolder =
    vscode.workspace.getWorkspaceFolder(selectedFile)?.uri.fsPath ||
    path.dirname(scriptPath);

  agentTerminal = vscode.window.createTerminal({
    name: "Liveflow Agent",
    cwd: workspaceFolder,
    iconPath: new vscode.ThemeIcon("zap"),
  });

  agentTerminal.show(true); // Show the terminal so user can see agent output
  agentTerminal.sendText(
    `python -m liveflow ${path.relative(workspaceFolder, scriptPath)} ${mode.label}`
  );

  // Update status bar to show running state
  if (statusBarItem) {
    statusBarItem.text = "$(sync~spin) Liveflow Running";
    statusBarItem.command = "liveflow.stopAgent";
    statusBarItem.tooltip = "Click to stop Liveflow";
  }

  vscode.window.showInformationMessage("Liveflow: Starting agent...");
  watchForPortFile(context);
}

/**
 * Poll for the port file created by the Python Liveflow server.
 *
 * The Python server writes its port to /tmp/liveflow-<pid>.port.
 * We check every second for up to 5 minutes. Once found, we connect.
 * The long timeout supports the "open panel first, start server later" workflow.
 */
function watchForPortFile(context: vscode.ExtensionContext) {
  let attempts = 0;
  const maxAttempts = 300; // 5 minutes at 1s intervals

  // Clear any existing watcher
  if (portWatcher) clearInterval(portWatcher);

  portWatcher = setInterval(() => {
    attempts++;

    if (attempts > maxAttempts) {
      clearInterval(portWatcher!);
      portWatcher = null;
      return;
    }

    const port = findRunningServerPort();
    if (port !== null) {
      clearInterval(portWatcher!);
      portWatcher = null;
      console.log(`[Liveflow] Found port: ${port}`);
      connectToServer(context, port);
    }
  }, 1000);
}

/**
 * Connect the WebSocket to a discovered server port.
 * Reuses existing webviewProvider if it's already open.
 * Creates a new webviewProvider if none exists.
 */
function connectToServer(
  context: vscode.ExtensionContext,
  port: number
) {
  // Don't create duplicate connections
  if (wsClient) {
    wsClient.dispose();
    wsClient = null;
  }

  // Create WebSocket client
  wsClient = new LiveflowWsClient(port);

  // Ensure webview is visible
  webviewProvider?.show();

  // Forward all messages from Python → webview
  // For code_scan and session_init, store persistently so they're embedded
  // in the HTML and available before React mounts (zero timing race).
  // For all other messages, queue normally.
  wsClient.onMessage = (msg) => {
    if (msg.type === "code_scan" || msg.type === "session_init") {
      // setPersistentMessage handles delivery (HTML embed or direct postMessage)
      webviewProvider?.setPersistentMessage(msg);
    } else {
      webviewProvider?.postMessage(msg);
    }
  };

  // Update connection indicator
  wsClient.onConnectionChange = (connected) => {
    webviewProvider?.setConnectionStatus(connected);

    if (connected) {
      vscode.window.showInformationMessage(
        "Liveflow: Connected! Dashboard is live."
      );
    }
  };

  // Allow reconnection to re-discover changed ports
  wsClient.onPortRediscover = () => findRunningServerPort();

  // Update status bar
  if (statusBarItem) {
    statusBarItem.text = "$(sync~spin) Liveflow Running";
    statusBarItem.command = "liveflow.stopAgent";
    statusBarItem.tooltip = "Click to stop Liveflow";
  }

  // Connect!
  wsClient.connect();
}

/**
 * Connect the WebSocket and open the dashboard panel.
 * Legacy helper that creates both webview + connection.
 */
function connectAndShowPanel(
  context: vscode.ExtensionContext,
  port: number
) {
  connectToServer(context, port);
}

function stopLiveflow() {
  // Kill terminal
  if (agentTerminal) {
    agentTerminal.dispose();
    agentTerminal = null;
  }

  // Disconnect WebSocket
  if (wsClient) {
    wsClient.dispose();
    wsClient = null;
  }

  // Reset webview state (clears messages/queue but keeps sidebar registered)
  webviewProvider?.reset();

  // Stop port watcher
  if (portWatcher) {
    clearInterval(portWatcher);
    portWatcher = null;
  }

  // Clean up port files
  try {
    const tmpDir = os.tmpdir();
    const files = fs.readdirSync(tmpDir);
    for (const f of files) {
      if (f.startsWith("liveflow-") && f.endsWith(".port")) {
        fs.unlinkSync(path.join(tmpDir, f));
      }
    }
  } catch {
    // best effort cleanup
  }

  // Reset status bar
  if (statusBarItem) {
    statusBarItem.text = "$(zap) Liveflow";
    statusBarItem.command = "liveflow.runAgent";
    statusBarItem.tooltip = "Run your LiveKit agent with Liveflow visualization";
  }
}
