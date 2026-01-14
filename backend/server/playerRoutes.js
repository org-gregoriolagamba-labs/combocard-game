export function setupPlayerRoutes(app, gameState) {
  // Registra un nuovo giocatore
  app.post('/api/player/register', (req, res) => {
    const { playerName } = req.body;
    
    if (!playerName || playerName.trim().length === 0) {
      return res.status(400).json({ error: 'Nome giocatore richiesto' });
    }

    const playerId = Math.random().toString(36).substr(2, 9);
    
    gameState.players[playerId] = {
      id: playerId,
      name: playerName,
      credits: 0,
      currentGameId: null
    };
    
    res.json({ 
      playerId, 
      player: gameState.players[playerId] 
    });
  });

  // Ottieni info giocatore
  app.get('/api/player/:playerId', (req, res) => {
    const player = gameState.players[req.params.playerId];
    
    if (!player) {
      return res.status(404).json({ error: 'Giocatore non trovato' });
    }
    
    res.json(player);
  });

  // Acquista crediti
  app.post('/api/player/:playerId/buy-credits', (req, res) => {
    const { amount } = req.body;
    const player = gameState.players[req.params.playerId];
    
    if (!player) {
      return res.status(404).json({ error: 'Giocatore non trovato' });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Importo non valido' });
    }

    player.credits += amount;
    
    res.json({ 
      success: true, 
      credits: player.credits 
    });
  });

  // Lista tutti i giocatori (per debug)
  app.get('/api/players', (req, res) => {
    res.json(Object.values(gameState.players));
  });
}