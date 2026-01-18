/**
 * Socket.IO Handlers
 * 
 * Initializes and configures Socket.IO event handlers for the game.
 */

/**
 * Initialize Socket.IO handlers
 * @param {Server} io - Socket.IO server instance
 * @param {Object} gameState - Global game state
 */
export const initializeSocketHandlers = (io, gameState) => {
  io.on("connection", (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // ========================
    // Game Room Events
    // ========================

    /**
     * Join a game room
     */
    socket.on("joinGame", (gameId) => {
      socket.join(gameId);
      console.log(`Socket ${socket.id} joined game ${gameId}`);
    });

    /**
     * Leave a game room
     */
    socket.on("leaveGame", (gameId) => {
      socket.leave(gameId);
      console.log(`Socket ${socket.id} left game ${gameId}`);
    });

    // ========================
    // Card Events
    // ========================

    /**
     * Cover a card (legacy support - now handled via REST API)
     */
    socket.on("coverCard", ({ gameId, playerId, row, col }) => {
      const game = gameState.games[gameId];
      if (game) {
        const player = game.players.find((p) => p.id === playerId);
        if (player) {
          player.coperte[row][col] = true;
          io.to(gameId).emit("cardCovered", { playerId, row, col });
        }
      }
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
