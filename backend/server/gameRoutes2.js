import { generaMazzo } from './cardUtils.js';
import { autoClaimCollezioni } from './gameLogic.js';
import { trovaMiglioreConversioneJolly } from './jollyLogic.js';
import { verificaCollezione } from './gameLogic.js';
import { SEMI_EMOJI, VALORI_NUM } from './constants.js';

// gameRoutes2.js - Continuazione delle route di gioco
export function setupGameRoutesP2(app, gameState, io) {
  // Avvia partita
  app.post('/api/game/:gameId/start', (req, res) => {
    const game = gameState.games[req.params.gameId];
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    const { playerId } = req.body || {};
    const ownerId = game.players[0]?.id;
    
    if (playerId && ownerId && playerId !== ownerId) {
      return res.status(403).json({ error: 'Only the game creator can start the game' });
    }

    if (game.players.length < 2) {
      return res.status(400).json({ error: 'Servono almeno 2 giocatori' });
    }
    
    // Sottrai crediti ai giocatori e forma il montepremi
    let montepremi = 0;
    for (const gamePlayer of game.players) {
      const player = gameState.players[gamePlayer.id];
      if (player) {
        // Sottrai i crediti dal wallet del giocatore
        player.credits -= game.requiredCredits;
        
        // Imposta i gettoni iniziali del giocatore in partita
        // (crediti rimanenti dopo la sottrazione)
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
    
    io.to(req.params.gameId).emit('gameStarted', { game });
    
    res.json({ success: true, game });
  });

  // Estrai carta
  app.post('/api/game/:gameId/draw', (req, res) => {
    const game = gameState.games[req.params.gameId];
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    if (game.status !== 'playing') {
      return res.status(400).json({ error: 'Game not in playing state' });
    }
    
    if (game.mazzo.length === 0) {
      return res.status(400).json({ error: 'Mazzo esaurito' });
    }

    const { playerId } = req.body || {};
    if (playerId) {
      const ownerId = game.players[0]?.id;
      if (!ownerId || playerId !== ownerId) {
        return res.status(403).json({ error: 'Only the game creator can draw cards' });
      }
    }

    const cartaEstratta = game.mazzo.pop();
    game.carteEstratte.push(cartaEstratta);

    for (const player of game.players) {
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          if (!player.coperte[r][c]) {
            const cartaCartella = player.cartella[r][c];
            if (cartaCartella.valore === cartaEstratta.valore && 
                cartaCartella.seme === cartaEstratta.seme) {
              player.coperte[r][c] = true;
              io.to(req.params.gameId).emit('cardCovered', { 
                playerId: player.id, row: r, col: c 
              });
            }
          }
        }
      }
    }

    autoClaimCollezioni(game, req.params.gameId, io, gameState);
    io.to(req.params.gameId).emit('cardDrawn', { carta: cartaEstratta });

    res.json({ carta: cartaEstratta });
  });

  // Rivendica collezione
  app.post('/api/game/:gameId/claim', (req, res) => {
    const { gameId } = req.params;
    const { playerId, tipo } = req.body;
    
    const game = gameState.games[gameId];
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    const player = game.players.find(p => p.id === playerId);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    if (game.collezioni[tipo].vinto) {
      return res.status(400).json({ error: 'Collezione già vinta' });
    }
    
    const completata = verificaCollezione(player.cartella, player.coperte, tipo, player.jollyPos);
    
    if (!completata) {
      return res.status(400).json({ error: 'Collezione non completata' });
    }
    
    const premio = game.collezioniDistribuzione[tipo];
    
    game.collezioni[tipo].vinto = true;
    game.collezioni[tipo].vincitore = playerId;
    player.collezioni.push(tipo);
    player.gettoni += premio;
    
    if (player.jollyPos && player.jollyUsato) {
      player.jollyUsedFor = tipo;
    }

    io.to(gameId).emit('collezioneVinta', { 
      tipo, 
      vincitore: { id: playerId, name: player.name },
      vincitori: [{ id: playerId, name: player.name }],
      ammontare: premio,
      divided: false,
      players: [player]
    });
    
    // Emetti aggiornamento gettoni
    io.to(gameId).emit('gettoniAggiornati', {
      playerId,
      gettoni: player.gettoni
    });
    
    if (tipo === 'combocard_reale') {
      finishGame(game, gameId, io, gameState);
    }
    
    res.json({ success: true, premio });
  });

  // Usa jolly
  app.post('/api/game/:gameId/jolly', (req, res) => {
    const { gameId } = req.params;
    const { playerId, row, col, tipo } = req.body;
    
    const game = gameState.games[gameId];
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    const player = game.players.find(p => p.id === playerId);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    if (player.jollyUsato) {
      return res.status(400).json({ error: 'Jolly già usato' });
    }

    if (!tipo) {
      return res.status(400).json({ error: 'Tipo collezione non specificato' });
    }

    if (game.collezioni[tipo].vinto) {
      return res.status(400).json({ error: 'Collezione già vinta' });
    }
    
    const jollyPosTemp = { row, col };
    const conversione = trovaMiglioreConversioneJolly(
      player.cartella, player.coperte, jollyPosTemp, tipo
    );
    
    if (!conversione) {
      return res.status(400).json({ 
        error: 'Il jolly non può completare questa collezione o la carta esiste già nella cartella' 
      });
    }
    
    player.cartella[row][col] = {
      valore: conversione.valore,
      seme: conversione.seme,
      emoji: SEMI_EMOJI[conversione.seme],
      valoreNum: VALORI_NUM[conversione.valore],
      wasJolly: true
    };
    
    player.jollyUsato = true;
    player.jollyPos = { row, col };
    if (!player.coperte[row]) player.coperte[row] = [];
    player.coperte[row][col] = true;

    io.to(gameId).emit('jollyUsato', { 
      playerId, row, col, 
      newCard: player.cartella[row][col],
      tipo 
    });
    io.to(gameId).emit('cardCovered', { playerId, row, col });

    res.json({ 
      success: true, 
      convertedTo: conversione,
      newCard: player.cartella[row][col]
    });
  });

  // Lascia partita
  app.post('/api/game/:gameId/leave', (req, res) => {
    const { gameId } = req.params;
    const { playerId } = req.body;
    
    const game = gameState.games[gameId];
    const player = gameState.players[playerId];
    
    if (game && player) {
      // Trova il gamePlayer per prendere i gettoni attuali
      const gamePlayer = game.players.find(p => p.id === playerId);
      
      if (gamePlayer && game.status === 'playing') {
        // Se la partita è in corso, accredita i gettoni attuali
        player.credits = gamePlayer.gettoni;
      }
      
      game.players = game.players.filter(p => p.id !== playerId);
      player.currentGameId = null;
      
      io.to(gameId).emit('playerLeft', { playerId, playerName: player.name });
      
      // Se la partita è in attesa e non ci sono più giocatori, elimina la partita
      if (game.status === 'waiting' && game.players.length === 0) {
        delete gameState.games[gameId];
      }
    }
    
    res.json({ success: true });
  });
}

function finishGame(game, gameId, io, gameState) {
  game.status = 'finished';
  
  // Accredita SOLO i gettoni vinti (non il totale) ai giocatori
  for (const gamePlayer of game.players) {
    const player = gameState.players[gamePlayer.id];
    if (player) {
      // I gettoni del giocatore sono già i suoi crediti rimanenti + vincite
      // Non sommiamo, sostituiamo
      player.credits = gamePlayer.gettoni;
      player.currentGameId = null;
    }
  }
  
  const vincitori = game.players
    .filter(p => p.collezioni.includes('combocard_reale'))
    .map(p => ({ id: p.id, name: p.name }));
  
  io.to(gameId).emit('gameFinished', { 
    vincitore: vincitori.length === 1 ? vincitori[0] : null,
    vincitori: vincitori
  });
}