export function setupSocketHandlers(io, gameState) {
  io.on('connection', (socket) => {
    console.log("🔌 Client connected:", socket.id);
    
    socket.on('joinGame', (gameId) => {
      socket.join(gameId);
      console.log(`Socket ${socket.id} joined game ${gameId}`);
    });
    
    socket.on('coverCard', ({ gameId, playerId, row, col }) => {
      const game = gameState.games[gameId];
      if (game) {
        const player = game.players.find(p => p.id === playerId);
        if (player) {
          player.coperte[row][col] = true;
          io.to(gameId).emit('cardCovered', { playerId, row, col });
        }
      }
    });
    
    socket.on('disconnect', () => {
      console.log("❌ Client disconnected:", socket.id);
    });
  });
}