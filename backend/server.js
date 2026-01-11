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

let games = {};

// Carte napoletane
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
// Middleware functions
// ------------------------

// Genera il mazzo completo (40 carte uniche)
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

// Genera una cartella 5x5 (25 carte casuali uniche)
function generaCartella() {
  const mazzoCompleto = generaMazzo();
  const cartelle = [];
  
  // Mescola il mazzo
  const mazzoMescolato = mazzoCompleto.sort(() => Math.random() - 0.5);
  
  // Prendi 25 carte per la cartella
  const carte25 = mazzoMescolato.slice(0, 25);
  
  // Crea griglia 5x5
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

// Verifica TRIS (3 carte stesso valore)
function verificaTris(cartella, coperte) {
  const valoriCoperti = {};
  
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (coperte[r][c]) {
        const valore = cartella[r][c].valore;
        valoriCoperti[valore] = (valoriCoperti[valore] || 0) + 1;
      }
    }
  }
  
  // Verifica se c'è un valore con almeno 3 carte
  for (let valore in valoriCoperti) {
    if (valoriCoperti[valore] >= 3) {
      return true;
    }
  }
  return false;
}

// Verifica SEQUENZA (4 carte in fila, semi misti OK)
function verificaSequenza(cartella, coperte) {
  const valoriCoperti = [];
  
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (coperte[r][c]) {
        valoriCoperti.push(cartella[r][c].valoreNum);
      }
    }
  }
  
  // Ordina e rimuovi duplicati
  const valoriUnici = [...new Set(valoriCoperti)].sort((a, b) => a - b);
  
  // Cerca sequenza di 4 consecutivi
  for (let i = 0; i <= valoriUnici.length - 4; i++) {
    if (valoriUnici[i+1] === valoriUnici[i] + 1 &&
        valoriUnici[i+2] === valoriUnici[i] + 2 &&
        valoriUnici[i+3] === valoriUnici[i] + 3) {
      return true;
    }
  }
  return false;
}

// Verifica SCOPA (5 carte stesso seme)
function verificaScopa(cartella, coperte) {
  const semiCoperti = {};
  
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (coperte[r][c]) {
        const seme = cartella[r][c].seme;
        semiCoperti[seme] = (semiCoperti[seme] || 0) + 1;
      }
    }
  }
  
  // Verifica se c'è un seme con almeno 5 carte
  for (let seme in semiCoperti) {
    if (semiCoperti[seme] >= 5) {
      return true;
    }
  }
  return false;
}

// Verifica NAPOLA (Tris + Coppia)
function verificaNapola(cartella, coperte) {
  const valoriCoperti = {};
  
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (coperte[r][c]) {
        const valore = cartella[r][c].valore;
        valoriCoperti[valore] = (valoriCoperti[valore] || 0) + 1;
      }
    }
  }
  
  let hasTris = false;
  let hasCoppia = false;
  
  for (let valore in valoriCoperti) {
    if (valoriCoperti[valore] >= 3) hasTris = true;
    if (valoriCoperti[valore] >= 2 && valoriCoperti[valore] < 3) hasCoppia = true;
  }
  
  return hasTris && hasCoppia;
}

// Verifica COMBOCARD REALE (4 carte in sequenza stesso seme)
function verificaCombocardReale(cartella, coperte) {
  const carteCoperte = [];
  
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (coperte[r][c]) {
        carteCoperte.push(cartella[r][c]);
      }
    }
  }
  
  // Raggruppa per seme
  const perSeme = {};
  carteCoperte.forEach(carta => {
    if (!perSeme[carta.seme]) perSeme[carta.seme] = [];
    perSeme[carta.seme].push(carta.valoreNum);
  });
  
  // Per ogni seme, verifica se c'è sequenza di 4
  for (let seme in perSeme) {
    const valori = perSeme[seme].sort((a, b) => a - b);
    
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
function verificaCollezione(cartella, coperte, tipo) {
  switch(tipo) {
    case 'tris': return verificaTris(cartella, coperte);
    case 'sequenza': return verificaSequenza(cartella, coperte);
    case 'scopa': return verificaScopa(cartella, coperte);
    case 'napola': return verificaNapola(cartella, coperte);
    case 'combocard_reale': return verificaCombocardReale(cartella, coperte);
    default: return false;
  }
}

// ------------------------
// API Routes
// ------------------------

// Health Check Endpoint: useful for load balancers and quick checks.
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
    jollyPos: null
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
  
  const cartaEstratta = game.mazzo.pop();
  game.carteEstratte.push(cartaEstratta);
  
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
  
  const completata = verificaCollezione(player.cartella, player.coperte, tipo);
  
  if (!completata) {
    return res.status(400).json({ error: 'Collezione non completata' });
  }
  
  game.collezioni[tipo].vinto = true;
  game.collezioni[tipo].vincitore = playerId;
  player.collezioni.push(tipo);
  player.gettoni += game.collezioniDistribuzione[tipo];
  
  io.to(gameId).emit('collezioneVinta', { 
    tipo, 
    vincitore: { id: playerId, name: player.name },
    ammontare: game.collezioniDistribuzione[tipo]
  });
  
  if (tipo === 'combocard_reale') {
    game.status = 'finished';
    io.to(gameId).emit('gameFinished', { vincitore: { id: playerId, name: player.name } });
  }
  
  res.json({ success: true, premio: game.collezioniDistribuzione[tipo] });
});

app.post('/api/game/:gameId/jolly', (req, res) => {
  const { gameId } = req.params;
  const { playerId, row, col } = req.body;
  
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
  
  player.jollyUsato = true;
  player.jollyPos = { row, col };
  
  io.to(gameId).emit('jollyUsato', { playerId, row, col });
  
  res.json({ success: true });
});

// ------------------------
// Socket.IO handlers
// ------------------------

// Keep socket handlers small and emit events for other layers to handle.
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