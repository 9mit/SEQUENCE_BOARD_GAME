import express from "express";
import { createServer as createViteServer } from "vite";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import { setupSocketHandlers } from "./src/server/socket.js";
import { logger } from "./src/server/logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const server = createServer(app);
  const io = new Server(server, {
    cors: {
      origin: process.env.NODE_ENV === "production" ? false : "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = process.env.PORT || 3000;

  app.use(express.json());

  // Security headers middleware
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    if (process.env.NODE_ENV === "production") {
      res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }
    next();
  });

  // Request logging middleware
  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      const duration = Date.now() - start;
      logger.debug(`${req.method} ${req.url} ${res.statusCode} - ${duration}ms`);
    });
    next();
  });

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Setup Socket.io handlers
  try {
    setupSocketHandlers(io);
    logger.info("Socket handlers initialized");
  } catch (error) {
    logger.error("Failed to initialize socket handlers", error as Error);
    process.exit(1);
  }

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      logger.info("Vite development middleware loaded");
    } catch (error) {
      logger.error("Failed to load Vite middleware", error as Error);
    }
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    logger.info("Serving production build from dist/");
  }

  // Global error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error(`Unhandled error during ${req.method} ${req.url}`, err);
    res.status(500).json({ 
      error: "Internal Server Error",
      message: process.env.NODE_ENV === "production" ? undefined : err.message 
    });
  });

  server.on("error", (error: any) => {
    if (error.code === "EADDRINUSE") {
      logger.error(`Port ${PORT} is already in use. Please close the other process or use a different port (PORT=3001 npm run dev).`);
    } else {
      logger.error("Server error", error);
    }
    process.exit(1);
  });

  server.listen(Number(PORT), "0.0.0.0", () => {
    logger.info(`Server running on http://localhost:${PORT} [${process.env.NODE_ENV || 'development'}]`);
    if (process.env.NODE_ENV !== "production") {
      logger.info(`If you are on Windows, please use http://localhost:${PORT} instead of http://0.0.0.0:${PORT}`);
    }
  });

  // Handle process termination
  const gracefulShutdown = (signal: string) => {
    logger.info(`${signal} received, shutting down gracefully`);
    server.close(() => {
      logger.info("Server closed");
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
}

startServer();
