import express from "express";
import { createServer as createViteServer } from "vite";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { setupSocketHandlers } from "./src/server/socket.js";
import { logger } from "./src/server/logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Rate limiters for different endpoints
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => process.env.NODE_ENV !== "production", // Skip rate limiting in development
});

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // stricter limit for authentication endpoints
  message: "Too many requests, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV !== "production",
});

async function startServer() {
  const app = express();
  const server = createServer(app);
  const io = new Server(server, {
    cors: {
      origin: process.env.NODE_ENV === "production" ? false : "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"], // Prefer websocket for security
    maxHttpBufferSize: 1e5, // 100KB - prevent large payloads
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  const PORT = process.env.PORT || 3000;

  // Apply Helmet for comprehensive security headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'nonce-random'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "wss:", "ws:"],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: [],
        },
      },
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      },
      noSniff: true,
      xssFilter: true,
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    })
  );

  // Request size limits
  app.use(express.json({ limit: "10kb" }));
  app.use(express.urlencoded({ limit: "10kb" }));

  // Apply rate limiting to all requests
  app.use(generalLimiter);

  // Trust proxy for accurate IP addresses
  if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }

  // HTTPS redirect middleware (for production)
  if (process.env.NODE_ENV === "production") {
    app.use((req, res, next) => {
      if (req.header("x-forwarded-proto") !== "https") {
        res.redirect(`https://${req.header("host")}${req.url}`);
      } else {
        next();
      }
    });
  }

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
  app.get("/api/health", strictLimiter, (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Security: Prevent cache of sensitive endpoints
  app.use((req, res, next) => {
    if (req.path.startsWith("/api/")) {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
    }
    next();
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
