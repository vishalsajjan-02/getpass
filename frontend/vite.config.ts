import { defineConfig, createLogger } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import type { IncomingMessage } from "http";
import { componentTagger } from "lovable-tagger";

const isBenignWsProxyMessage = (message: string): boolean =>
  message.includes("ws proxy socket error") &&
  /ECONNABORTED|ECONNRESET|EPIPE/i.test(message);

const devLogger = createLogger("info", {
  prefix: "[vite]",
});
const baseError = devLogger.error.bind(devLogger);
devLogger.error = (message, options) => {
  if (typeof message === "string" && isBenignWsProxyMessage(message)) return;
  baseError(message, options);
};

const ignoreProxySocketNoise = (
  err: NodeJS.ErrnoException,
  _req: IncomingMessage,
  res: { writeHead?: (statusCode: number) => void; end?: () => void },
) => {
  // Harmless when the browser/HMR or socket.io client closes the WS mid-flight.
  if (err.code === "ECONNABORTED" || err.code === "ECONNRESET" || err.code === "EPIPE") {
    if (res.writeHead) {
      res.writeHead(500);
      res.end?.();
    }
    return;
  }
  console.error("[vite] proxy error:", err.message);
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  customLogger: mode === "development" ? devLogger : undefined,
  server: {
    host: "::",
    port: 8080,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      "/uploads": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      "/socket.io": {
        target: "http://localhost:3001",
        changeOrigin: true,
        ws: true,
        configure: (proxy) => {
          proxy.on("error", ignoreProxySocketNoise);
          proxy.on("proxyReqWs", (_proxyReq, _req, socket) => {
            socket.on("error", () => {
              // Swallow client-aborted websocket proxy errors during HMR reloads.
            });
          });
        },
      },
    },
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
