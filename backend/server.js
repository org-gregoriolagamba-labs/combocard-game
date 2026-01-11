import express from "express";
import http from "http";
import cors from "cors";
import path from "path";
import fs from "fs";
import { Server as SocketIO } from "socket.io";

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Create a Socket.IO server instance bound to the HTTP server.
// We import `Server` from `socket.io` and instantiate it here.
const io = new SocketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Basic middleware
app.use(cors());
app.use(express.json());

// Static asset serving: prefer a production React build if present
// (frontend/build). We check several likely locations so the backend
// can be started either from the repo root or from the `backend` folder.
const candidateFrontendBuildPaths = [
  path.join(process.cwd(), "frontend", "build"), // when started from repo root
  path.join(process.cwd(), "..", "frontend", "build"), // when started from backend dir
  path.join(process.cwd(), "backend", "frontend", "build"), // less common layout
];

const candidateBackendPublicPaths = [
  path.join(process.cwd(), "backend", "public"),
  path.join(process.cwd(), "public"),
  path.join(process.cwd(), "..", "backend", "public"),
];

let served = false;
for (const fb of candidateFrontendBuildPaths) {
  if (fs.existsSync(fb)) {
    app.use(express.static(fb));
    app.get("/", (req, res) => res.sendFile(path.join(fb, "index.html")));
    served = true;
    console.log(`Serving frontend from ${fb}`);
    break;
  }
}

if (!served) {
  for (const bp of candidateBackendPublicPaths) {
    if (fs.existsSync(bp)) {
      app.use(express.static(bp));
      app.get("/", (req, res) => res.sendFile(path.join(bp, "index.html")));
      served = true;
      console.log(`Serving backend public from ${bp}`);
      break;
    }
  }
}

if (!served) {
  // No static assets found — keep a simple health route instead
  app.get("/", (req, res) => {
    res.send("Backend running. Build frontend separately during development.");
  });
}

// ------------------------
// Data Structures
// ------------------------
// Define application state or connect to a database here.

// ------------------------
// Middleware functions
// ------------------------
// Add any custom middleware (authentication, logging, functions, etc.) here.

// ------------------------
// API Routes
// ------------------------
// Health Check Endpoint: useful for load balancers and quick checks.
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// ------------------------
// Socket.IO handlers
// ------------------------
// Keep socket handlers small and emit events for other layers to handle.
io.on("connection", (socket) => {
  console.log("🔌 Client connected:", socket.id);

  // Example: handle a custom event from clients
  socket.on("ping", (payload) => {
    console.log("ping received", payload);
    socket.emit("pong", { message: "pong", received: payload });
  });

  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});