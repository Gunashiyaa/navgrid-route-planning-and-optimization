import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { createProxyMiddleware } from "http-proxy-middleware";
import { spawn, ChildProcess } from "child_process";
import http from "http";

const PORT = 3000;
const BACKEND_PORT = 8000;
let fastApiProcess: ChildProcess | null = null;

function checkBackendHealth(): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${BACKEND_PORT}/api/health`, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function ensureFastApiRunning() {
  const isHealthy = await checkBackendHealth();
  if (isHealthy) {
    console.log("FastAPI backend is already active on port 8000.");
    return;
  }

  console.log("Starting Python FastAPI backend service...");
  fastApiProcess = spawn(
    "python3",
    ["-m", "uvicorn", "backend.app.main:app", "--host", "127.0.0.1", "--port", `${BACKEND_PORT}`],
    {
      stdio: "inherit",
      env: { ...process.env, PYTHONUNBUFFERED: "1" }
    }
  );

  fastApiProcess.on("error", (err) => {
    console.error("Failed to spawn FastAPI backend process:", err);
  });

  fastApiProcess.on("exit", (code, signal) => {
    console.log(`FastAPI backend exited with code ${code} and signal ${signal}`);
  });

  // Poll until healthy or 15 seconds elapsed
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 500));
    if (await checkBackendHealth()) {
      console.log("FastAPI backend successfully connected and healthy.");
      return;
    }
  }
  console.warn("FastAPI did not respond within timeout, proxying will continue.");
}

async function startServer() {
  await ensureFastApiRunning();

  const app = express();

  // Proxy /api requests to FastAPI backend
  app.use(
    "/api",
    createProxyMiddleware({
      target: `http://127.0.0.1:${BACKEND_PORT}`,
      changeOrigin: true,
    })
  );

  // Vite development middleware or production static serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`NAVGRID full-stack gateway running on http://0.0.0.0:${PORT}`);
  });

  const cleanup = () => {
    if (fastApiProcess && !fastApiProcess.killed) {
      console.log("Terminating FastAPI backend process...");
      fastApiProcess.kill();
    }
    server.close();
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
}

startServer().catch((err) => {
  console.error("Failed to start NAVGRID server:", err);
  process.exit(1);
});
