/**
 * Socket.IO Handlers
 * 
 * Initializes and configures Socket.IO event handlers for the game.
 */

import { authenticateToken } from "../middleware/auth.middleware.js";

/**
 * Name of the room with all the connections of a player
 * @param {string} playerId - Player ID
 * @returns {string} Room name
 */
export const playerRoom = (playerId) => `player:${playerId}`;

/**
 * Socket.IO middleware: only clients with a valid access token can connect
 * @param {Object} gameState - Global game state
 * @returns {Function} Socket.IO middleware
 */
export const authenticateSocket = (gameState) => (socket, next) => {
  const auth = authenticateToken(socket.handshake.auth?.token, gameState);
  if (!auth) {
    return next(new Error("Unauthorized"));
  }
  socket.data.playerId = auth.playerId;
  next();
};

/**
 * Initialize Socket.IO handlers
 * @param {Server} io - Socket.IO server instance
 * @param {Object} gameState - Global game state
 */
export const initializeSocketHandlers = (io, gameState) => {
  io.use(authenticateSocket(gameState));

  io.on("connection", (socket) => {
    const { playerId } = socket.data;
    console.log(`🔌 Client connected: ${socket.id}`);

    // The game routes use this room to add the player's connections to a game
    socket.join(playerRoom(playerId));

    // Back in the current game after a reconnection
    const currentGameId = gameState.players[playerId]?.currentGameId;
    if (currentGameId) {
      socket.join(currentGameId);
    }

    // ========================
    // Game Room Events
    // ========================

    /**
     * Join a game room
     */
    socket.on("joinGame", (gameId) => {
      // Only players of the game can listen to its events
      const isGame = typeof gameId === "string" && Object.hasOwn(gameState.games, gameId);
      if (isGame && gameState.games[gameId].players.some((p) => p.id === playerId)) {
        socket.join(gameId);
        console.log(`Socket ${socket.id} joined game ${gameId}`);
      }
    });

    /**
     * Leave a game room
     */
    socket.on("leaveGame", (gameId) => {
      if (typeof gameId !== "string" || gameId === playerRoom(playerId)) {
        return;
      }
      socket.leave(gameId);
      console.log(`Socket ${socket.id} left game ${gameId}`);
    });

    // ========================
    // Connection Events
    // ========================

    /**
     * Ping/Pong for connection testing
     */
    socket.on("ping", (payload) => {
      socket.emit("pong", {
        message: "pong",
        received: payload,
        timestamp: new Date().toISOString(),
      });
    });

    /**
     * Handle disconnection
     */
    socket.on("disconnect", (reason) => {
      console.log(`🔌 Client disconnected: ${socket.id}, reason: ${reason}`);
    });

    /**
     * Handle errors
     */
    socket.on("error", (error) => {
      console.error(`Socket error for ${socket.id}:`, error);
    });
  });

  console.log("✅ Socket.IO handlers initialized");
};

/**
 * Emit event to a specific game
 * @param {Server} io - Socket.IO server instance
 * @param {string} gameId - Game ID
 * @param {string} event - Event name
 * @param {any} data - Event data
 */
export const emitToGame = (io, gameId, event, data) => {
  io.to(gameId).emit(event, data);
};

/**
 * Emit event to all connected clients
 * @param {Server} io - Socket.IO server instance
 * @param {string} event - Event name
 * @param {any} data - Event data
 */
export const broadcastToAll = (io, event, data) => {
  io.emit(event, data);
};
