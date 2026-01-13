import express from "express";
import http from "http";
import cors from "cors";
import path from "path";
import fs from "fs";
import { Server as SocketIO } from "socket.io";

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

// Static asset serving
const candidateFrontendBuildPaths = [
  path.join(process.cwd(), "frontend", "build"),
  path.join(process.cwd(), "..", "frontend", "build"),
  path.join(process.cwd(), "backend", "frontend", "build"),
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
  app.get("/", (req, res) => {
    res.send("Backend running. Build frontend separately during development.");
  });
}

// ------------------------
// Data Structures
// ------------------------

let games = {};

const SEMI = ['Spade', 'Coppe', 'Denari', 'Bastoni'];
const SEMI_EMOJI = {
  'Spade': '⚔️',
  'Coppe': '🏆',
  'Denari': '💰',
  'Bastoni': '🪵'
};
const VALORI = ['Asso', 'Due', 'Tre', 'Quattro', 'Cinque', 'Sei', 'Sette', 'Fante', 'Cavallo', 'Re'];
const VALORI_NUM = { 'Asso': 1, 'Due': 2, 'Tre': 3, 'Quattro': 4, 'Cinque': 5, 'Sei': 6, 'Sette': 7, 'Fante': 8, 'Cavallo': 9, 'Re': 10 };

// ------------------------
// Helper functions
// ------------------------

function generaMazzo() {
  const mazzo = [];
  for (let seme of SEMI) {
    for (let valore of VALORI) {
      mazzo.push({ 
        valore, 
        seme, 
        emoji: SEMI_EMOJI[seme],
        valoreNum: VALORI_NUM[valore]
      });
    }
  }
  return mazzo;
}

function generaCartella() {
  const mazzoCompleto = generaMazzo();
  const mazzoMescolato = mazzoCompleto.sort(() => Math.random() - 0.5);
  const carte25 = mazzoMescolato.slice(0, 25);
  
  const cartella = Array(5).fill(null).map(() => Array(5).fill(null));
  let idx = 0;
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      cartella[r][c] = { ...carte25[idx] };
      idx++;
    }
  }
  
  return cartella;
}

// Verifica se una carta esiste già nella cartella
function cartaEsisteInCartella(cartella, jollyPos, valore, seme) {
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      // Salta la posizione del jolly stesso
      if (jollyPos && jollyPos.row === r && jollyPos.col === c) continue;
      
      const carta = cartella[r][c];
      if (carta.valore === valore && carta.seme === seme) {
        return true;
      }
    }
  }
  return false;
}

// Trova la migliore conversione del jolly per completare una collezione
function trovaMiglioreConversioneJolly(cartella, coperte, jollyPos, tipo) {
  if (!jollyPos) return null;
  
  const jollyCard = cartella[jollyPos.row][jollyPos.col];
  
  // Raccogli carte coperte (escluso jolly)
  const covered = [];
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (coperte[r][c] && !(r === jollyPos.row && c === jollyPos.col)) {
        covered.push(cartella[r][c]);
      }
    }
  }
  
  if (tipo === 'tris') {
    // Trova il valore con più occorrenze
    const counts = {};
    covered.forEach(c => counts[c.valore] = (counts[c.valore] || 0) + 1);
    
    let bestValore = null;
    let maxCount = 0;
    for (let valore in counts) {
      if (counts[valore] > maxCount && counts[valore] >= 2) {
        // Verifica che questa carta non esista già
        if (!cartaEsisteInCartella(cartella, jollyPos, valore, jollyCard.seme)) {
          maxCount = counts[valore];
          bestValore = valore;
        }
      }
    }
    
    if (bestValore && maxCount >= 2) {
      return { valore: bestValore, seme: jollyCard.seme };
    }
    
  } else if (tipo === 'sequenza') {
    const nums = [...new Set(covered.map(c => c.valoreNum))].sort((a, b) => a - b);
    
    // Cerca sequenze con un gap
    for (let start = 1; start <= 10 - 4 + 1; start++) {
      let missing = [];
      let present = [];
      for (let v = start; v < start + 4; v++) {
        if (nums.includes(v)) {
          present.push(v);
        } else {
          missing.push(v);
        }
      }
      
      if (missing.length === 1 && present.length === 3) {
        const missingNum = missing[0];
        const missingValore = Object.keys(VALORI_NUM).find(k => VALORI_NUM[k] === missingNum);
        
        // Verifica che questa carta non esista già
        if (!cartaEsisteInCartella(cartella, jollyPos, missingValore, jollyCard.seme)) {
          return { valore: missingValore, seme: jollyCard.seme };
        }
      }
    }
    
  } else if (tipo === 'napola') {
    const values = {};
    covered.forEach(c => values[c.valore] = (values[c.valore] || 0) + 1);
    
    const counts = Object.entries(values).sort((a, b) => b[1] - a[1]);
    
    // Caso 1: abbiamo 2 carte dello stesso valore, jolly completa il tris
    if (counts.length >= 2 && counts[0][1] === 2 && counts[1][1] >= 2) {
      const valorePerTris = counts[0][0];
      if (!cartaEsisteInCartella(cartella, jollyPos, valorePerTris, jollyCard.seme)) {
        return { valore: valorePerTris, seme: jollyCard.seme };
      }
    }
    
    // Caso 2: abbiamo un tris, jolly completa la coppia
    if (counts.length >= 2 && counts[0][1] >= 3 && counts[1][1] === 1) {
      const valorePerCoppia = counts[1][0];
      if (!cartaEsisteInCartella(cartella, jollyPos, valorePerCoppia, jollyCard.seme)) {
        return { valore: valorePerCoppia, seme: jollyCard.seme };
      }
    }
    
  } else if (tipo === 'combocard_reale') {
    // Raggruppa per seme
    const perSeme = {};
    covered.forEach(c => {
      perSeme[c.seme] = perSeme[c.seme] || [];
      perSeme[c.seme].push(c.valoreNum);
    });
    
    // Il jolly deve mantenere il suo seme per combocard reale
    const seme = jollyCard.seme;
    if (perSeme[seme]) {
      const nums = [...new Set(perSeme[seme])].sort((a, b) => a - b);
      
      // Cerca sequenze con un gap
      for (let start = 1; start <= 10 - 4 + 1; start++) {
        let missing = [];
        let present = [];
        for (let v = start; v < start + 4; v++) {
          if (nums.includes(v)) {
            present.push(v);
          } else {
            missing.push(v);
          }
        }
        
        if (missing.length === 1 && present.length === 3) {
          const missingNum = missing[0];
          const missingValore = Object.keys(VALORI_NUM).find(k => VALORI_NUM[k] === missingNum);
          
          if (!cartaEsisteInCartella(cartella, jollyPos, missingValore, seme)) {
            return { valore: missingValore, seme: seme };
          }
        }
      }
    }
  }
  
  return null;
}

// Verifica TRIS (3 carte stesso valore)
function verificaTris(cartella, coperte, jollyPos) {
  const valoriCoperti = {};

  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (coperte[r][c]) {
        const valore = cartella[r][c].valore;
        valoriCoperti[valore] = (valoriCoperti[valore] || 0) + 1;
      }
    }
  }

  for (let valore in valoriCoperti) {
    if (valoriCoperti[valore] >= 3) return true;
  }

  return false;
}

// Verifica SEQUENZA (4 carte in fila, semi misti OK)
function verificaSequenza(cartella, coperte, jollyPos) {
  const valoriCoperti = [];

  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (coperte[r][c]) {
        valoriCoperti.push(cartella[r][c].valoreNum);
      }
    }
  }

  const valoriUnici = [...new Set(valoriCoperti)].sort((a, b) => a - b);
  const needed = 4;

  for (let i = 0; i <= valoriUnici.length - needed; i++) {
    let ok = true;
    for (let k = 1; k < needed; k++) {
      if (valoriUnici[i + k] !== valoriUnici[i] + k) { ok = false; break; }
    }
    if (ok) return true;
  }

  return false;
}

// Verifica SCOPA (5 carte stesso seme)
function verificaScopa(cartella, coperte, jollyPos) {
  const semiCoperti = {};
  
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (coperte[r][c]) {
        const seme = cartella[r][c].seme;
        semiCoperti[seme] = (semiCoperti[seme] || 0) + 1;
      }
    }
  }
  
  for (let seme in semiCoperti) {
    if (semiCoperti[seme] >= 5) {
      return true;
    }
  }
  return false;
}

// Verifica NAPOLA (Tris + Coppia)
function verificaNapola(cartella, coperte, jollyPos) {
  const valoriCoperti = {};
  
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (coperte[r][c]) {
        const valore = cartella[r][c].valore;
        valoriCoperti[valore] = (valoriCoperti[valore] || 0) + 1;
      }
    }
  }
  
  let trisValori = [];
  let coppiaValori = [];
  
  for (let valore in valoriCoperti) {
    if (valoriCoperti[valore] >= 3) {
      trisValori.push(valore);
    } else if (valoriCoperti[valore] >= 2) {
      coppiaValori.push(valore);
    }
  }

  if (trisValori.length >= 1 && coppiaValori.length >= 1) return true;
  
  return false;
}

// Verifica COMBOCARD REALE (4 carte in sequenza stesso seme)
function verificaCombocardReale(cartella, coperte, jollyPos) {
  const carteCoperte = [];
  
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (coperte[r][c]) {
        carteCoperte.push(cartella[r][c]);
      }
    }
  }
  
  const perSeme = {};
  carteCoperte.forEach(carta => {
    if (!perSeme[carta.seme]) perSeme[carta.seme] = [];
    perSeme[carta.seme].push(carta.valoreNum);
  });
  
  for (let seme in perSeme) {
    const valori = [...new Set(perSeme[seme])].sort((a, b) => a - b);

    for (let i = 0; i <= valori.length - 4; i++) {
      if (valori[i+1] === valori[i] + 1 &&
          valori[i+2] === valori[i] + 2 &&
          valori[i+3] === valori[i] + 3) {
        return true;
      }
    }
  }
  return false;
}

// Verifica collezione
function verificaCollezione(cartella, coperte, tipo, jollyPos) {
  switch(tipo) {
    case 'tris': return verificaTris(cartella, coperte, jollyPos);
    case 'sequenza': return verificaSequenza(cartella, coperte, jollyPos);
    case 'scopa': return verificaScopa(cartella, coperte, jollyPos);
    case 'napola': return verificaNapola(cartella, coperte, jollyPos);
    case 'combocard_reale': return verificaCombocardReale(cartella, coperte, jollyPos);
    default: return false;
  }
}

// Auto-claim: verifica e assegna premi per collezioni completate
function autoClaimCollezioni(game, gameId) {
  const tipiCollezioni = ['tris', 'sequenza', 'scopa', 'napola', 'combocard_reale'];
  
  for (const tipo of tipiCollezioni) {
    if (game.collezioni[tipo].vinto) continue;
    
    const vincitori = [];
    
    for (const player of game.players) {
      if (player.collezioni && player.collezioni.includes(tipo)) continue;
      
      const completata = verificaCollezione(player.cartella, player.coperte, tipo, player.jollyPos);
      if (completata) {
        vincitori.push(player);
      }
    }
    
    if (vincitori.length > 0) {
      const ammontare = game.collezioniDistribuzione[tipo];
      const premioPerGiocatore = Math.floor(ammontare / vincitori.length);
      
      game.collezioni[tipo].vinto = true;
      game.collezioni[tipo].vincitore = vincitori.map(v => v.id);
      
      for (const vincitore of vincitori) {
        vincitore.collezioni = vincitore.collezioni || [];
        vincitore.collezioni.push(tipo);
        vincitore.gettoni += premioPerGiocatore;
        
        // Segna il jolly come usato per questa collezione
        if (vincitore.jollyPos && vincitore.jollyUsato) {
          vincitore.jollyUsedFor = tipo;
        }
      }
      
      const vincitoriInfo = vincitori.map(v => ({ id: v.id, name: v.name }));
      
      io.to(gameId).emit('collezioneVinta', {
        tipo,
        vincitore: vincitori.length === 1 ? vincitoriInfo[0] : vincitoriInfo,
        vincitori: vincitoriInfo,
        ammontare: premioPerGiocatore,
        divided: vincitori.length > 1,
        players: vincitori
      });
      
      if (tipo === 'combocard_reale') {
        game.status = 'finished';
        io.to(gameId).emit('gameFinished', { 
          vincitore: vincitori.length === 1 ? vincitoriInfo[0] : vincitoriInfo,
          vincitori: vincitoriInfo
        });
      }
    }
  }
}

// ------------------------
// API Routes
// ------------------------

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post('/api/game/create', (req, res) => {
  const { puntataIniziale } = req.body;
  const gameId = Math.random().toString(36).substr(2, 9);
  
  games[gameId] = {
    id: gameId,
    players: [],
    puntataIniziale: puntataIniziale || 100,
    status: 'waiting',
    mazzo: generaMazzo(),
    carteEstratte: [],
    collezioni: {
      tris: { vinto: false, vincitore: null },
      sequenza: { vinto: false, vincitore: null },
      scopa: { vinto: false, vincitore: null },
      napola: { vinto: false, vincitore: null },
      combocard_reale: { vinto: false, vincitore: null }
    }
  };
  
  res.json({ gameId, game: games[gameId] });
});

app.get('/api/game/:gameId', (req, res) => {
  const game = games[req.params.gameId];
  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }
  res.json(game);
});

app.post('/api/game/:gameId/join', (req, res) => {
  const { gameId } = req.params;
  const { playerName } = req.body;
  
  const game = games[gameId];
  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }
  
  if (game.status !== 'waiting') {
    return res.status(400).json({ error: 'Game already started' });
  }
  
  if (game.players.length >= 10) {
    return res.status(400).json({ error: 'Game full (max 10 players)' });
  }
  
  const playerId = Math.random().toString(36).substr(2, 9);
  const cartella = generaCartella();
  const coperte = Array(5).fill(null).map(() => Array(5).fill(false));
  
  const player = {
    id: playerId,
    name: playerName,
    cartella,
    coperte,
    gettoni: game.puntataIniziale,
    collezioni: [],
    jollyUsato: false,
    jollyPos: null,
    jollyUsedFor: null
  };
  
  game.players.push(player);
  
  io.to(gameId).emit('playerJoined', { player: { id: playerId, name: playerName } });
  
  res.json({ playerId, player });
});

app.post('/api/game/:gameId/start', (req, res) => {
  const game = games[req.params.gameId];
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
  
  game.status = 'playing';
  game.mazzo = generaMazzo().sort(() => Math.random() - 0.5);
  
  const montepremi = game.players.length * game.puntataIniziale;
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

app.post('/api/game/:gameId/draw', (req, res) => {
  const game = games[req.params.gameId];
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
          if (cartaCartella.valore === cartaEstratta.valore && cartaCartella.seme === cartaEstratta.seme) {
            player.coperte[r][c] = true;
            io.to(req.params.gameId).emit('cardCovered', { playerId: player.id, row: r, col: c });
          }
        }
      }
    }
  }

  autoClaimCollezioni(game, req.params.gameId);

  io.to(req.params.gameId).emit('cardDrawn', { carta: cartaEstratta });

  res.json({ carta: cartaEstratta });
});

app.post('/api/game/:gameId/claim', (req, res) => {
  const { gameId } = req.params;
  const { playerId, tipo } = req.body;
  
  const game = games[gameId];
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
  
  game.collezioni[tipo].vinto = true;
  game.collezioni[tipo].vincitore = playerId;
  player.collezioni.push(tipo);
  player.gettoni += game.collezioniDistribuzione[tipo];
  
  if (player.jollyPos && player.jollyUsato) {
    player.jollyUsedFor = tipo;
  }

  io.to(gameId).emit('collezioneVinta', { 
    tipo, 
    vincitore: { id: playerId, name: player.name },
    vincitori: [{ id: playerId, name: player.name }],
    ammontare: game.collezioniDistribuzione[tipo],
    divided: false,
    players: [player]
  });
  
  if (tipo === 'combocard_reale') {
    game.status = 'finished';
    io.to(gameId).emit('gameFinished', { 
      vincitore: { id: playerId, name: player.name },
      vincitori: [{ id: playerId, name: player.name }]
    });
  }
  
  res.json({ success: true, premio: game.collezioniDistribuzione[tipo] });
});

app.post('/api/game/:gameId/jolly', (req, res) => {
  const { gameId } = req.params;
  const { playerId, row, col, tipo } = req.body;
  
  const game = games[gameId];
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

  // Verifica che la collezione non sia già vinta
  if (game.collezioni[tipo].vinto) {
    return res.status(400).json({ error: 'Collezione già vinta' });
  }
  
  // Simula il jolly in quella posizione
  const jollyPosTemp = { row, col };
  
  // Trova la migliore conversione per completare la collezione
  const conversione = trovaMiglioreConversioneJolly(player.cartella, player.coperte, jollyPosTemp, tipo);
  
  if (!conversione) {
    return res.status(400).json({ 
      error: 'Il jolly non può completare questa collezione o la carta esiste già nella cartella' 
    });
  }
  
  // Converti la carta
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
    playerId, 
    row, 
    col, 
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

// ------------------------
// Socket.IO handlers
// ------------------------

io.on('connection', (socket) => {
  console.log("🔌 Client connected:", socket.id);
  
  socket.on('joinGame', (gameId) => {
    socket.join(gameId);
    console.log(`Socket ${socket.id} joined game ${gameId}`);
  });
  
  socket.on('coverCard', ({ gameId, playerId, row, col }) => {
    const game = games[gameId];
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

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🎴 COMBOCARD Server running on port ${PORT}`);
});