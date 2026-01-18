/**
 * Main Server Entry Point
 * 
 * This is the primary entry point for the Express application.
 * It initializes all middleware, routes, and socket handlers.
 */

import express from "express";
import http from "http";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import { Server as SocketIO } from "socket.io";

import config from "./config/index.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { apiLimiter } from "./middleware/rateLimiter.middleware.js";

// Import routes
import { playerRoutes, gameRoutes, healthRoutes } from "./routes/index.js";

// Import socket handlers
import { initializeSocketHandlers } from "./sockets/index.js";

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Game state - in-memory storage for players and games
const gameState = {
  games: {},
  players: {},
};

// Create Socket.IO server
const io = new SocketIO(server, {
  cors: {
    origin: config.corsOrigin,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// ========================
// Security Middleware
// ========================
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for game assets
}));
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
}));

// ========================
// Request Processing
// ========================
app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ========================
// Logging
// ========================
if (config.nodeEnv !== "test") {
  app.use(morgan(config.nodeEnv === "production" ? "combined" : "dev"));
}
app.use(requestLogger);

// ========================
// Rate Limiting
// ========================
if (config.nodeEnv === "production") {
  app.use("/api/", apiLimiter);
}

// ========================
// Inject Dependencies
// ========================
app.use((req, res, next) => {
  req.gameState = gameState;
  req.io = io;
  next();
});

// ========================
// API Routes
// ========================
app.use("/api/health", healthRoutes);
app.use("/api/players", playerRoutes);
app.use("/api/games", gameRoutes);

// Legacy route support (for backward compatibility)
app.use("/api/player", playerRoutes);
app.use("/api/game", gameRoutes);

// ========================
// Static Files (Production)
// ========================
if (config.nodeEnv === "production") {
  import("path").then(({ default: path }) => {
    import("url").then(({ fileURLToPath }) => {
      const __dirname = path.dirname(fileURLToPath(import.meta.url));
      const staticPath = path.resolve(__dirname, "../../frontend/build");
      
      app.use(express.static(staticPath));
      
      app.get("*", (req, res, next) => {
        if (req.path.startsWith("/api/")) {
          return next();
        }
        res.sendFile(path.join(staticPath, "index.html"));
      });
    });
  });
}

// ========================
// Error Handling
// ========================
app.use(notFoundHandler);
app.use(errorHandler);

// ========================
// Socket.IO Handlers
// ========================
initializeSocketHandlers(io, gameState);

// ========================
// Server Startup
// ========================
const startServer = () => {
  server.listen(config.port, () => {
    console.log(`🎴 COMBOCARD Server running in ${config.nodeEnv} mode on port ${config.port}`);
    console.log(`📡 API available at http://localhost:${config.port}/api`);
    console.log(`🔌 WebSocket server ready`);
  });
};

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Rejection:", err);
  server.close(() => {
    process.exit(1);
  });
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("👋 SIGTERM received. Shutting down gracefully...");
  server.close(() => {
    console.log("💤 Process terminated");
  });
});

// Start the server
startServer();

export { app, io, gameState };
