import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { createApiServerPlugin } from "./vite-api-plugin";

export default defineConfig({
  plugins: [react(), createApiServerPlugin()],
  optimizeDeps: {
    include: ["@web3-micropay/shared"],
  },
  server: {
    port: 3000,
    host: true,
    allowedHosts: true,
    proxy: {
      "/v1": {
        target: "http://127.0.0.1:4000",
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on("error", (_err, _req, res) => {
            if (res && "writeHead" in res && !(res as any).headersSent) {
              (res as any).writeHead(200, { "Content-Type": "application/json" });
              (res as any).end(JSON.stringify({ success: false, data: null, offline: true, message: "Backend offline (Direct Web3 Mode)" }));
            }
          });
        },
      },
      "/health": {
        target: "http://127.0.0.1:4000",
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on("error", (_err, _req, res) => {
            if (res && "writeHead" in res && !(res as any).headersSent) {
              (res as any).writeHead(200, { "Content-Type": "application/json" });
              (res as any).end(JSON.stringify({ status: "degraded", message: "Direct Web3 Mode Active" }));
            }
          });
        },
      },
    },
  },
  preview: {
    port: 3000,
    host: true,
    allowedHosts: true,
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
  },
});
