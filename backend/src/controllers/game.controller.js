/**
 * Game Controller
 * 
 * Handles HTTP requests related to games.
 */

import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess, sendCreated } from "../utils/response.utils.js";
import { AppError } from "../utils/AppError.js";
import { generateId, generaCartella, generaMazzo, shuffleArray } from "../utils/card.utils.js";
import {
  autoClaimCollezioni,
  gameViewFor,
  verificaCollezione,
  finishGame,
  settleGamePlayer,
} from "../services/game.service.js";
import { trovaMiglioreConversioneJolly } from "../services/jolly.service.js";
import {
  CREDIT_MOVEMENT,
  trackCredits,
  saveGameSafely,
  deleteGameSafely,
} from "../services/persistence.service.js";
import { SEMI_EMOJI, VALORI_NUM, GAME_DEFAULTS, GAME_STATUS } from "../config/constants.js";
import { playerRoom } from "../sockets/index.js";
import config from "../config/index.js";

/**
 * Notify each player of a started game, with their own view of it
 * @param {Object} io - Socket.IO instance
 * @param {Object} game - Game object
 */
function emitGameStarted(io, game) {
  for (const { id } of game.players) {
    io.to(playerRoom(id)).emit("gameStarted", { game: gameViewFor(game, id) });
  }
}

/**
 * Get lobby list (public waiting games)
 * GET /api/games/lobby
 */
export const getLobby = asyncHandler(async (req, res) => {
  const lobbies = Object.values(req.gameState.games)
    .filter((g) => g.status === GAME_STATUS.WAITING && !g.isPrivate)
    .map((g) => ({
      id: g.id,
      requiredCredits: g.requiredCredits,
      playerCount: g.players.length,
      maxPlayers: g.maxPlayers || GAME_DEFAULTS.MAX_PLAYERS,
      creatorName: g.players[0]?.name || "Unknown",
    }));

  sendSuccess(res, lobbies);
});

/**
 * Create a new game
 * POST /api/games
 */
export const createGame = asyncHandler(async (req, res) => {
  const { playerId } = req.auth;
  const { requiredCredits, isPrivate, maxPlayers } = req.body;

  const player = req.gameState.players[playerId];
  if (!player) {
    throw new AppError("Player not found", 404);
  }

  const credits = requiredCredits || GAME_DEFAULTS.REQUIRED_CREDITS;
  if (player.credits < credits) {
    throw new AppError("Insufficient credits", 400);
  }

  const gameId = generateId();

  req.gameState.games[gameId] = {
    id: gameId,
    createdBy: playerId,
    players: [],
    requiredCredits: credits,
    isPrivate: isPrivate || false,
    maxPlayers: maxPlayers || GAME_DEFAULTS.MAX_PLAYERS,
    status: GAME_STATUS.WAITING,
    mazzo: [],
    carteEstratte: [],
    montepremi: 0,
    collezioni: {
      tris: { vinto: false, vincitore: null },
      sequenza: { vinto: false, vincitore: null },
      scopa: { vinto: false, vincitore: null },
      napola: { vinto: false, vincitore: null },
      combocard_reale: { vinto: false, vincitore: null },
    },
    createdAt: new Date().toISOString(),
  };

  await saveGameSafely(req.store, req.gameState.games[gameId]);

  sendCreated(res, {
    gameId,
    game: gameViewFor(req.gameState.games[gameId], playerId),
  }, "Game created successfully");
});

/**
 * Get game by ID
 * GET /api/games/:gameId
 */
export const getGame = asyncHandler(async (req, res) => {
  // Finished games are not reloaded into memory after a restart
  const { gameId } = req.params;
  const game = (Object.hasOwn(req.gameState.games, gameId) ? req.gameState.games[gameId] : null)
    ?? await req.store.findGame(gameId);
  if (!game) {
    throw new AppError("Game not found", 404);
  }

  const { playerId } = req.auth;
  if (game.createdBy !== playerId && !game.players.some((p) => p.id === playerId)) {
    throw new AppError("You are not part of this game", 403);
  }

  sendSuccess(res, gameViewFor(game, playerId));
});

/**
 * Join a game
 * POST /api/games/:gameId/join
 */
export const joinGame = asyncHandler(async (req, res) => {
  const { gameId } = req.params;
  const { playerId } = req.auth;

  const game = req.gameState.games[gameId];
  if (!game) {
    throw new AppError("Game not found", 404);
  }

  const player = req.gameState.players[playerId];

  // Allow joining if status is waiting or just auto-started
  if (game.status !== GAME_STATUS.WAITING && game.status !== GAME_STATUS.PLAYING) {
    throw new AppError("Game already started", 400);
  }

  if (game.players.length >= game.maxPlayers) {
    throw new AppError(`Game full (max ${game.maxPlayers} players)`, 400);
  }

  if (player.credits < game.requiredCredits) {
    throw new AppError("Insufficient credits", 400);
  }

  // Check if player is already in the game
  if (game.players.some((p) => p.id === playerId)) {
    if (game.status === GAME_STATUS.PLAYING) {
      const existingPlayer = game.players.find((p) => p.id === playerId);
      return sendSuccess(res, { success: true, player: existingPlayer, autoStarted: true });
    }
    throw new AppError("Already in game", 400);
  }

  const cartella = generaCartella();
  const coperte = Array(GAME_DEFAULTS.GRID_SIZE)
    .fill(null)
    .map(() => Array(GAME_DEFAULTS.GRID_SIZE).fill(false));

  const gamePlayer = {
    id: playerId,
    name: player.name,
    cartella,
    coperte,
    gettoni: 0,
    gettoniSaldati: 0,
    collezioni: [],
    jollyUsato: false,
    jollyPos: null,
    jollyUsedFor: null,
  };

  game.players.push(gamePlayer);
  player.currentGameId = gameId;

  await saveGameSafely(req.store, game);

  req.io.to(gameId).emit("playerJoined", { player: { id: playerId, name: player.name } });
  req.io.in(playerRoom(playerId)).socketsJoin(gameId);

  // Respond BEFORE auto-start to avoid race condition
  const willAutoStart = game.players.length === game.maxPlayers;
  sendSuccess(res, { success: true, player: gamePlayer, willAutoStart });

  // Auto-start AFTER responding
  if (willAutoStart) {
    setTimeout(() => autoStartGame(game, gameId, req.io, req.gameState, req.store), 100);
  }
});

/**
 * Start a game
 * POST /api/games/:gameId/start
 */
export const startGame = asyncHandler(async (req, res) => {
  const game = req.gameState.games[req.params.gameId];
  if (!game) {
    throw new AppError("Game not found", 404);
  }

  if (req.auth.playerId !== game.players[0]?.id) {
    throw new AppError("Only the game creator can start the game", 403);
  }

  // Starting twice would charge the entry fee twice
  if (game.status !== GAME_STATUS.WAITING) {
    throw new AppError("Game already started", 400);
  }

  if (game.players.length < GAME_DEFAULTS.MIN_PLAYERS) {
    throw new AppError(`At least ${GAME_DEFAULTS.MIN_PLAYERS} players required`, 400);
  }

  const creditMovements = trackCredits(req.gameState, game);

  // Subtract credits and form prize pool
  let montepremi = 0;
  for (const gamePlayer of game.players) {
    const player = req.gameState.players[gamePlayer.id];
    if (player) {
      player.credits -= game.requiredCredits;
      gamePlayer.gettoni = player.credits;
      gamePlayer.gettoniSaldati = player.credits;
      montepremi += game.requiredCredits;
    }
  }

  game.status = GAME_STATUS.PLAYING;
  game.mazzo = shuffleArray(generaMazzo());
  game.montepremi = montepremi;

  game.collezioniDistribuzione = {
    tris: Math.floor(montepremi * config.prizeDistribution.tris),
    sequenza: Math.floor(montepremi * config.prizeDistribution.sequenza),
    scopa: Math.floor(montepremi * config.prizeDistribution.scopa),
    napola: Math.floor(montepremi * config.prizeDistribution.napola),
    combocard_reale: Math.floor(montepremi * config.prizeDistribution.combocard_reale),
  };

  await saveGameSafely(req.store, game, creditMovements(CREDIT_MOVEMENT.GAME_ENTRY));

  emitGameStarted(req.io, game);

  sendSuccess(res, { success: true, game: gameViewFor(game, req.auth.playerId) });
});

/**
 * The player who is choosing the card for the jolly, or null. A choice that has run out of time
 * is ended here, so the game never stays paused if the player has gone away.
 */
function activeJollyHold(game, gameId, io) {
  const hold = game.jollyInCorso;
  if (!hold) {
    return null;
  }

  if (hold.scadenza <= Date.now()) {
    endJollyHold(game, gameId, io);
    return null;
  }

  return hold;
}

function endJollyHold(game, gameId, io) {
  const hold = game.jollyInCorso;
  game.jollyInCorso = null;
  if (hold) {
    io.to(gameId).emit("jollyAnnullato", { playerId: hold.playerId });
  }
}

/**
 * Draw a card
 * POST /api/games/:gameId/draw
 */
export const drawCard = asyncHandler(async (req, res) => {
  const { gameId } = req.params;
  const game = req.gameState.games[gameId];
  
  if (!game) {
    throw new AppError("Game not found", 404);
  }

  if (game.status !== GAME_STATUS.PLAYING) {
    throw new AppError("Game not in playing state", 400);
  }

  if (game.mazzo.length === 0) {
    throw new AppError("Deck exhausted", 400);
  }

  if (req.auth.playerId !== game.players[0]?.id) {
    throw new AppError("Only the game creator can draw cards", 403);
  }

  if (activeJollyHold(game, gameId, req.io)) {
    throw new AppError("A player is choosing the jolly: wait a few seconds", 409);
  }

  const creditMovements = trackCredits(req.gameState, game);

  const cartaEstratta = game.mazzo.pop();
  game.carteEstratte.push(cartaEstratta);

  // Cover matching cards for all players
  for (const player of game.players) {
    for (let r = 0; r < GAME_DEFAULTS.GRID_SIZE; r++) {
      for (let c = 0; c < GAME_DEFAULTS.GRID_SIZE; c++) {
        if (!player.coperte[r][c]) {
          const cartaCartella = player.cartella[r][c];
          if (
            cartaCartella.valore === cartaEstratta.valore &&
            cartaCartella.seme === cartaEstratta.seme
          ) {
            player.coperte[r][c] = true;
            req.io.to(playerRoom(player.id)).emit("cardCovered", {
              playerId: player.id,
              row: r,
              col: c,
            });
          }
        }
      }
    }
  }

  autoClaimCollezioni(game, gameId, req.io, req.gameState);
  req.io.to(gameId).emit("cardDrawn", { carta: cartaEstratta });

  await saveGameSafely(req.store, game, creditMovements(CREDIT_MOVEMENT.GAME_PAYOUT));

  sendSuccess(res, { carta: cartaEstratta });
});

/**
 * Claim a collection
 * POST /api/games/:gameId/claim
 */
export const claimCollection = asyncHandler(async (req, res) => {
  const { gameId } = req.params;
  const { playerId } = req.auth;
  const { tipo } = req.body;

  const game = req.gameState.games[gameId];
  if (!game) {
    throw new AppError("Game not found", 404);
  }

  const player = game.players.find((p) => p.id === playerId);
  if (!player) {
    throw new AppError("Player not found", 404);
  }

  if (game.collezioni[tipo].vinto) {
    throw new AppError("Collection already won", 400);
  }

  const completata = verificaCollezione(player.cartella, player.coperte, tipo);

  if (!completata) {
    throw new AppError("Collection not complete", 400);
  }

  const creditMovements = trackCredits(req.gameState, game);
  const premio = game.collezioniDistribuzione[tipo];

  game.collezioni[tipo].vinto = true;
  game.collezioni[tipo].vincitore = playerId;
  player.collezioni.push(tipo);
  player.gettoni += premio;

  if (player.jollyPos && player.jollyUsato) {
    player.jollyUsedFor = tipo;
  }

  req.io.to(gameId).emit("collezioneVinta", {
    tipo,
    vincitore: { id: playerId, name: player.name },
    vincitori: [{ id: playerId, name: player.name }],
    ammontare: premio,
    divided: false,
  });

  req.io.to(gameId).emit("gettoniAggiornati", {
    playerId,
    gettoni: player.gettoni,
  });

  if (tipo === "combocard_reale") {
    finishGame(game, gameId, req.io, req.gameState);
  }

  await saveGameSafely(req.store, game, creditMovements(CREDIT_MOVEMENT.GAME_PAYOUT));

  sendSuccess(res, { success: true, premio });
});

/**
 * Declare the jolly for a collection: the draws are paused until the jolly is used,
 * cancelled, the player leaves, or the time runs out.
 * POST /api/games/:gameId/jolly/start
 */
export const startJollyChoice = asyncHandler(async (req, res) => {
  const { gameId } = req.params;
  const { playerId } = req.auth;
  const { tipo } = req.body;

  const game = req.gameState.games[gameId];
  if (!game) {
    throw new AppError("Game not found", 404);
  }

  const player = game.players.find((p) => p.id === playerId);
  if (!player) {
    throw new AppError("Player not found", 404);
  }

  if (game.status !== GAME_STATUS.PLAYING) {
    throw new AppError("Game not in playing state", 400);
  }

  if (player.jollyUsato) {
    throw new AppError("Jolly already used", 400);
  }

  if (game.collezioni[tipo].vinto) {
    throw new AppError("Collection already won", 400);
  }

  const hold = activeJollyHold(game, gameId, req.io);
  if (hold && hold.playerId !== playerId) {
    throw new AppError("Another player is choosing the jolly", 409);
  }

  game.jollyInCorso = {
    playerId,
    name: player.name,
    tipo,
    scadenza: Date.now() + GAME_DEFAULTS.JOLLY_HOLD_MS,
  };

  req.io.to(gameId).emit("jollyInCorso", game.jollyInCorso);

  sendSuccess(res, { success: true, jollyInCorso: game.jollyInCorso });
});

/**
 * Give the jolly choice up: the draws can go on
 * POST /api/games/:gameId/jolly/cancel
 */
export const cancelJollyChoice = asyncHandler(async (req, res) => {
  const { gameId } = req.params;
  const { playerId } = req.auth;

  const game = req.gameState.games[gameId];
  if (!game) {
    throw new AppError("Game not found", 404);
  }

  const hold = activeJollyHold(game, gameId, req.io);
  if (hold) {
    if (hold.playerId !== playerId) {
      throw new AppError("Only the player who is choosing can cancel", 403);
    }
    endJollyHold(game, gameId, req.io);
  }

  sendSuccess(res, { success: true });
});

/**
 * Use jolly card
 * POST /api/games/:gameId/jolly
 */
export const useJolly = asyncHandler(async (req, res) => {
  const { gameId } = req.params;
  const { playerId } = req.auth;
  const { row, col, tipo } = req.body;

  const game = req.gameState.games[gameId];
  if (!game) {
    throw new AppError("Game not found", 404);
  }

  const player = game.players.find((p) => p.id === playerId);
  if (!player) {
    throw new AppError("Player not found", 404);
  }

  const hold = activeJollyHold(game, gameId, req.io);
  if (hold && hold.playerId !== playerId) {
    throw new AppError("Another player is choosing the jolly", 409);
  }

  if (player.jollyUsato) {
    throw new AppError("Jolly already used", 400);
  }

  if (!tipo) {
    throw new AppError("Collection type not specified", 400);
  }

  if (game.collezioni[tipo].vinto) {
    throw new AppError("Collection already won", 400);
  }

  const creditMovements = trackCredits(req.gameState, game);

  const jollyPosTemp = { row, col };
  const conversione = trovaMiglioreConversioneJolly(
    player.cartella,
    player.coperte,
    jollyPosTemp,
    tipo,
  );

  if (!conversione) {
    throw new AppError(
      "Jolly cannot complete this collection or card already exists in grid",
      400,
    );
  }

  player.cartella[row][col] = {
    valore: conversione.valore,
    seme: conversione.seme,
    emoji: SEMI_EMOJI[conversione.seme],
    valoreNum: VALORI_NUM[conversione.valore],
    wasJolly: true,
  };

  player.jollyUsato = true;
  player.jollyPos = { row, col };
  // The choice is over: the draws can go on (clients learn it from "jollyUsato")
  if (game.jollyInCorso?.playerId === playerId) {
    game.jollyInCorso = null;
  }
  if (!player.coperte[row]) {
    player.coperte[row] = [];
  }
  player.coperte[row][col] = true;

  req.io.to(gameId).emit("jollyUsato", { playerId, tipo });
  req.io.to(playerRoom(playerId)).emit("cardCovered", { playerId, row, col });

  // Auto-claim after using jolly
  autoClaimCollezioni(game, gameId, req.io, req.gameState);

  await saveGameSafely(req.store, game, creditMovements(CREDIT_MOVEMENT.GAME_PAYOUT));

  sendSuccess(res, {
    success: true,
    convertedTo: conversione,
    newCard: player.cartella[row][col],
  });
});

/**
 * Leave a game
 * POST /api/games/:gameId/leave
 */
export const leaveGame = asyncHandler(async (req, res) => {
  const { gameId } = req.params;
  const { playerId } = req.auth;

  const game = req.gameState.games[gameId];
  const player = req.gameState.players[playerId];

  if (game && player) {
    const creditMovements = trackCredits(req.gameState, game);
    const gamePlayer = game.players.find((p) => p.id === playerId);

    if (gamePlayer && game.status === GAME_STATUS.PLAYING) {
      settleGamePlayer(gamePlayer, player);
    }

    if (game.jollyInCorso?.playerId === playerId) {
      endJollyHold(game, gameId, req.io);
    }

    game.players = game.players.filter((p) => p.id !== playerId);
    player.currentGameId = null;

    req.io.to(gameId).emit("playerLeft", { playerId, playerName: player.name });
    req.io.in(playerRoom(playerId)).socketsLeave(gameId);

    // Delete game if waiting and no players left
    if (game.status === GAME_STATUS.WAITING && game.players.length === 0) {
      delete req.gameState.games[gameId];
      await deleteGameSafely(req.store, gameId);
    } else {
      await saveGameSafely(req.store, game, creditMovements(CREDIT_MOVEMENT.GAME_PAYOUT));
    }
  }

  sendSuccess(res, { success: true });
});

/**
 * Helper function to auto-start a game when max players reached
 */
async function autoStartGame(game, gameId, io, gameState, store) {
  // The creator may have started the game in the meantime
  if (game.status !== GAME_STATUS.WAITING) {
    return;
  }

  const creditMovements = trackCredits(gameState, game);

  let montepremi = 0;
  for (const gamePlayer of game.players) {
    const player = gameState.players[gamePlayer.id];
    if (player) {
      player.credits -= game.requiredCredits;
      gamePlayer.gettoni = player.credits;
      gamePlayer.gettoniSaldati = player.credits;
      montepremi += game.requiredCredits;
    }
  }

  game.status = GAME_STATUS.PLAYING;
  game.mazzo = shuffleArray(generaMazzo());
  game.montepremi = montepremi;

  game.collezioniDistribuzione = {
    tris: Math.floor(montepremi * config.prizeDistribution.tris),
    sequenza: Math.floor(montepremi * config.prizeDistribution.sequenza),
    scopa: Math.floor(montepremi * config.prizeDistribution.scopa),
    napola: Math.floor(montepremi * config.prizeDistribution.napola),
    combocard_reale: Math.floor(montepremi * config.prizeDistribution.combocard_reale),
  };

  await saveGameSafely(store, game, creditMovements(CREDIT_MOVEMENT.GAME_ENTRY));

  emitGameStarted(io, game);
}
