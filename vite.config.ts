import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  // Build optimization for code splitting
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // React core in its own chunk
          if (id.includes("node_modules/react/") || id.includes("node_modules/react-dom/")) {
            return "vendor-react";
          }
          // React Router
          if (id.includes("node_modules/react-router")) {
            return "vendor-router";
          }
          // Radix UI components
          if (id.includes("node_modules/@radix-ui")) {
            return "vendor-radix";
          }
          // Tiptap editor (heavy)
          if (id.includes("node_modules/@tiptap") || id.includes("node_modules/prosemirror")) {
            return "vendor-tiptap";
          }
          // Anthropic SDK
          if (id.includes("node_modules/@anthropic-ai")) {
            return "vendor-anthropic";
          }
        },
      },
    },
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
