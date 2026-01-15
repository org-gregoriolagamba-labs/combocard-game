import { generaCartella, generaMazzo } from './cardUtils.js';
import { autoClaimCollezioni } from './gameLogic.js';
import { trovaMiglioreConversioneJolly } from './jollyLogic.js';
import { SEMI_EMOJI, VALORI_NUM } from './constants.js';

export function setupGameRoutes(app, gameState, io) {
  // Lista tutte le partite in attesa (solo pubbliche)
  app.get('/api/games/lobby', (req, res) => {
    const lobbies = Object.values(gameState.games)
      .filter(g => g.status === 'waiting' && !g.isPrivate)
      .map(g => ({
        id: g.id,
        requiredCredits: g.requiredCredits,
        playerCount: g.players.length,
        maxPlayers: g.maxPlayers || 10,
        creatorName: g.players[0]?.name || 'Unknown'
      }));
    
    res.json(lobbies);
  });

  // Crea nuova partita
  app.post('/api/game/create', (req, res) => {
    const { playerId, requiredCredits, isPrivate, maxPlayers } = req.body;
    
    const player = gameState.players[playerId];
    if (!player) {
      return res.status(404).json({ error: 'Giocatore non trovato' });
    }

    if (player.credits < requiredCredits) {
      return res.status(400).json({ error: 'Crediti insufficienti' });
    }

    const gameId = Math.random().toString(36).substr(2, 9);
    
    gameState.games[gameId] = {
      id: gameId,
      players: [],
      requiredCredits: requiredCredits || 100,
      isPrivate: isPrivate || false,
      maxPlayers: maxPlayers || 10,
      status: 'waiting',
      mazzo: [],
      carteEstratte: [],
      montepremi: 0,
      collezioni: {
        tris: { vinto: false, vincitore: null },
        sequenza: { vinto: false, vincitore: null },
        scopa: { vinto: false, vincitore: null },
        napola: { vinto: false, vincitore: null },
        combocard_reale: { vinto: false, vincitore: null }
      }
    };
    
    res.json({ gameId, game: gameState.games[gameId] });
  });

  // Ottieni info partita
  app.get('/api/game/:gameId', (req, res) => {
    const game = gameState.games[req.params.gameId];
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    res.json(game);
  });

  // Unisciti a partita
  app.post('/api/game/:gameId/join', (req, res) => {
    const { gameId } = req.params;
    const { playerId } = req.body;
    
    const game = gameState.games[gameId];
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    const player = gameState.players[playerId];
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Permetti di unirsi anche se status è 'playing' se è appena stato auto-avviato
    if (game.status !== 'waiting' && game.status !== 'playing') {
      return res.status(400).json({ error: 'Game already started' });
    }
    
    if (game.players.length >= game.maxPlayers) {
      return res.status(400).json({ error: `Game full (max ${game.maxPlayers} players)` });
    }

    if (player.credits < game.requiredCredits) {
      return res.status(400).json({ error: 'Crediti insufficienti' });
    }

    // Verifica se il giocatore è già nella partita
    if (game.players.some(p => p.id === playerId)) {
      // Se è già nella partita e questa è playing, rispondi ok (auto-start)
      if (game.status === 'playing') {
        const existingPlayer = game.players.find(p => p.id === playerId);
        return res.json({ success: true, player: existingPlayer, autoStarted: true });
      }
      return res.status(400).json({ error: 'Già nella partita' });
    }
    
    const cartella = generaCartella();
    const coperte = Array(5).fill(null).map(() => Array(5).fill(false));
    
    const gamePlayer = {
      id: playerId,
      name: player.name,
      cartella,
      coperte,
      gettoni: 0,
      collezioni: [],
      jollyUsato: false,
      jollyPos: null,
      jollyUsedFor: null
    };
    
    game.players.push(gamePlayer);
    player.currentGameId = gameId;
    
    io.to(gameId).emit('playerJoined', { player: { id: playerId, name: player.name } });
    
    // Rispondi PRIMA di auto-start per evitare race condition
    const willAutoStart = game.players.length === game.maxPlayers;
    res.json({ success: true, player: gamePlayer, willAutoStart });
    
    // Auto-start DOPO aver risposto
    if (willAutoStart) {
      setTimeout(() => autoStartGame(game, gameId, io, gameState), 100);
    }
  });
}

// Funzione helper per auto-start
function autoStartGame(game, gameId, io, gameState) {
  let montepremi = 0;
  for (const gamePlayer of game.players) {
    const player = gameState.players[gamePlayer.id];
    if (player) {
      player.credits -= game.requiredCredits;
      gamePlayer.gettoni = player.credits;
      montepremi += game.requiredCredits;
    }
  }
  
  game.status = 'playing';
  game.mazzo = generaMazzo().sort(() => Math.random() - 0.5);
  game.montepremi = montepremi;
  
  game.collezioniDistribuzione = {
    tris: Math.floor(montepremi * 0.10),
    sequenza: Math.floor(montepremi * 0.15),
    scopa: Math.floor(montepremi * 0.20),
    napola: Math.floor(montepremi * 0.25),
    combocard_reale: Math.floor(montepremi * 0.30)
  };
  
  io.to(gameId).emit('gameStarted', { game });
}