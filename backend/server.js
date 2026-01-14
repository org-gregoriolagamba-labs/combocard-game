import express from "express";
import http from "http";
import cors from "cors";
import path from "path";
import fs from "fs";
import { Server as SocketIO } from "socket.io";
import { setupStaticServing } from "./server/staticServing.js";
import { setupGameRoutes } from "./server/gameRoutes.js";
import { setupGameRoutesP2 } from "./server/gameRoutes2.js";
import { setupPlayerRoutes } from "./server/playerRoutes.js";
import { setupSocketHandlers } from "./server/socketHandlers.js";

const app = express();
const server = http.createServer(app);

const io = new SocketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());

// Setup static file serving
setupStaticServing(app);

// Data structures
export const gameState = {
  games: {},
  players: {}, // { playerId: { id, name, credits, currentGameId } }
};

// Setup routes
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

setupPlayerRoutes(app, gameState);
setupGameRoutes(app, gameState, io);
setupGameRoutesP2(app, gameState, io);

// Setup Socket.IO
setupSocketHandlers(io, gameState);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🎴 COMBOCARD Server running on port ${PORT}`);
});

export { io };