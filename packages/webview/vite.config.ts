import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Vite config for the Liveflow webview.
 *
 * Builds into a single JS + CSS file that the VS Code extension loads.
 * We use "iife" format because webviews can't use ES modules.
 */
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    // Single JS file — easier for VS Code webview to load
    rollupOptions: {
      output: {
        entryFileNames: "index.js",
        assetFileNames: "index.[ext]",
        // No code splitting — everything in one bundle
        manualChunks: undefined,
      },
    },
    // IIFE format for webview compatibility
    lib: {
      entry: "src/main.tsx",
      formats: ["iife"],
      name: "LiveflowWebview",
    },
    cssCodeSplit: false,
  },
  define: {
    // VS Code webview doesn't have process.env
    "process.env": {},
  },
});
