/**
 * Drawing Service
 *
 * How the cards are drawn. In the classic mode the creator draws and nothing else happens here.
 * With `estrazione: "tutti"` the server picks who draws each card: a shuffled round gives every
 * player one turn before anyone has a second one, a player who is away or has a red card is skipped.
 * The player on turn has a time limit; when it runs out the card is drawn by itself and the player
 * gets a yellow card, a red one the second time, and a player with a red card no longer draws.
 * If nobody can draw any more the server draws by itself after the wait. The time limit stops
 * while a player chooses the card for the jolly.
 *
 * The turn is part of the game (`game.turno`, `game.codaEstrattori`) and is saved with it; the
 * timers are not, so they are armed again at startup (riarmaTurni).
 */

import { AppError } from "../utils/AppError.js";
import { shuffleArray } from "../utils/card.utils.js";
import { GAME_DEFAULTS, GAME_STATUS } from "../config/constants.js";
import config from "../config/index.js";
import { autoClaimCollezioni } from "./game.service.js";
import { CREDIT_MOVEMENT, trackCredits, saveGameSafely } from "./persistence.service.js";
import { playerRoom } from "../sockets/index.js";

// Yellow cards a player can get before the red one
const AMMONIZIONI_PER_ESPULSIONE = 2;

const timers = new Map();
// The end of a pause of the jolly that nobody ends: the time limit must not stay stopped
const timersSospensione = new Map();
// What a timer needs when it fires: { io, gameState, getStore }, renewed at every request
const contesti = new Map();

const attesaMs = () => config.drawCooldownSeconds * 1000;
const limiteMs = () => config.drawTurnSeconds * 1000;

// The turn is stopped by a pause of the jolly: it remembers when (a number) or not (null)
const inSospeso = (turno) => typeof turno.sospesoDa === "number";

export const usaTurni = (game) => game.estrazione === "tutti";

export function registraContesto(gameId, ctx) {
  contesti.set(gameId, ctx);
}

const collegato = (io, playerId) => {
  const stanze = io?.sockets?.adapter?.rooms;
  if (!stanze?.get) {
    return true;
  }
  return (stanze.get(playerRoom(playerId))?.size ?? 0) > 0;
};

// Someone who is away is skipped; if nobody at all is connected (a restart, a network failure) the server
// cannot tell who is away, so it skips nobody
const puoEstrarre = (game, ctx, giocatore) =>
  !giocatore.espulso &&
  (collegato(ctx.io, giocatore.id) || !game.players.some((p) => collegato(ctx.io, p.id)));

/** The next player of the round, or null when nobody can draw */
function prossimoEstrattore(game, ctx) {
  let coda = game.codaEstrattori ?? [];
  const valido = (id) => {
    const giocatore = game.players.find((p) => p.id === id);
    return Boolean(giocatore) && puoEstrarre(game, ctx, giocatore);
  };

  for (let giro = 0; giro < 2; giro++) {
    while (coda.length > 0) {
      const id = coda.shift();
      if (valido(id)) {
        game.codaEstrattori = coda;
        return id;
      }
    }

    const idonei = game.players.filter((p) => puoEstrarre(game, ctx, p)).map((p) => p.id);
    if (idonei.length === 0) {
      break;
    }
    coda = shuffleArray(idonei);
    // The last of a round does not open the next one
    if (coda.length > 1 && coda[0] === game.ultimoEstrattore) {
      [coda[0], coda[1]] = [coda[1], coda[0]];
    }
  }

  game.codaEstrattori = [];
  return null;
}

function assegnaTurno(game, ctx, { mantieniAttesa = false } = {}) {
  const adesso = Date.now();
  const playerId = prossimoEstrattore(game, ctx);
  const attesaFino = mantieniAttesa && game.turno ? game.turno.attesaFino : adesso + attesaMs();
  game.turno = {
    playerId,
    attesaFino,
    // Nobody on turn: the card is drawn by itself as soon as the wait is over
    scadenza: playerId ? adesso + limiteMs() : attesaFino,
    sospesoDa: game.turno?.sospesoDa ?? null,
  };
  if (playerId) {
    game.ultimoEstrattore = playerId;
  }
}

function emettiTurno(game, gameId, ctx) {
  const { turno } = game;
  if (!turno) {
    return;
  }
  const riferimento = turno.sospesoDa ?? Date.now();
  ctx.io.to(gameId).emit("turnoEstrazione", {
    playerId: turno.playerId,
    name: game.players.find((p) => p.id === turno.playerId)?.name ?? null,
    attesaIn: Math.max(0, turno.attesaFino - riferimento),
    scadenzaIn: Math.max(0, turno.scadenza - riferimento),
    sospeso: inSospeso(turno),
  });
}

function fermaTimer(gameId) {
  clearTimeout(timers.get(gameId));
  timers.delete(gameId);
}

function armaTimer(game, gameId) {
  fermaTimer(gameId);
  if (!game.turno || inSospeso(game.turno)) {
    return;
  }
  const timer = setTimeout(() => scaduto(gameId), Math.max(0, game.turno.scadenza - Date.now()));
  // A timer never keeps the process alive
  timer.unref?.();
  timers.set(gameId, timer);
}

function ammonisci(game, gameId, ctx, playerId) {
  const giocatore = game.players.find((p) => p.id === playerId);
  if (!giocatore) {
    return;
  }
  giocatore.ammonizioni = (giocatore.ammonizioni ?? 0) + 1;
  if (giocatore.ammonizioni >= AMMONIZIONI_PER_ESPULSIONE) {
    giocatore.espulso = true;
  }
  ctx.io.to(gameId).emit("ammonizione", {
    playerId,
    name: giocatore.name,
    colore: giocatore.espulso ? "rossa" : "gialla",
    ammonizioni: giocatore.ammonizioni,
  });
}

async function scaduto(gameId) {
  const ctx = contesti.get(gameId);
  const game = ctx?.gameState.games[gameId];
  if (!game || game.status !== GAME_STATUS.PLAYING || !usaTurni(game) || !game.turno || inSospeso(game.turno)) {
    return;
  }
  if (game.turno.scadenza > Date.now()) {
    armaTimer(game, gameId);
    return;
  }
  if (game.mazzo.length === 0) {
    return;
  }

  try {
    if (game.turno.playerId) {
      ammonisci(game, gameId, ctx, game.turno.playerId);
    }
    await eseguiEstrazione(game, gameId, ctx);
  } catch (err) {
    console.error(`❌ Automatic draw failed for game ${gameId}: ${err.message}`);
  }
}

/**
 * Draw the next card for everybody: cover the matching cards, claim the collections, move the turn
 * @returns {Promise<Object>} The card drawn
 */
export async function eseguiEstrazione(game, gameId, ctx) {
  registraContesto(gameId, ctx);
  const creditMovements = trackCredits(ctx.gameState, game);

  const cartaEstratta = game.mazzo.pop();
  game.carteEstratte.push(cartaEstratta);

  for (const player of game.players) {
    for (let r = 0; r < GAME_DEFAULTS.GRID_SIZE; r++) {
      for (let c = 0; c < GAME_DEFAULTS.GRID_SIZE; c++) {
        if (!player.coperte[r][c]) {
          const cartaCartella = player.cartella[r][c];
          if (cartaCartella.valore === cartaEstratta.valore && cartaCartella.seme === cartaEstratta.seme) {
            player.coperte[r][c] = true;
            ctx.io.to(playerRoom(player.id)).emit("cardCovered", { playerId: player.id, row: r, col: c });
          }
        }
      }
    }
  }

  autoClaimCollezioni(game, gameId, ctx.io, ctx.gameState);

  const continua = usaTurni(game) && game.status === GAME_STATUS.PLAYING && game.mazzo.length > 0;
  if (continua) {
    assegnaTurno(game, ctx);
  } else {
    fermaTimer(gameId);
  }
  ctx.io.to(gameId).emit("cardDrawn", { carta: cartaEstratta });

  await saveGameSafely(ctx.getStore(), game, creditMovements(CREDIT_MOVEMENT.GAME_PAYOUT));

  if (continua) {
    armaTimer(game, gameId);
    emettiTurno(game, gameId, ctx);
  }

  return cartaEstratta;
}

/** Can this player draw now? Throws the answer the client gets when not */
export function verificaTurno(game, playerId) {
  const giocatore = game.players.find((p) => p.id === playerId);
  if (giocatore?.espulso) {
    throw new AppError("You have a red card: you can no longer draw in this game", 403);
  }
  if (!game.turno || game.turno.playerId !== playerId) {
    throw new AppError("It is not your turn to draw", 403);
  }
}

/** The draws wait a few seconds from each other; the server keeps the wait */
export function verificaAttesa(game) {
  const residuo = game.turno.attesaFino - Date.now();
  if (residuo > 0) {
    throw new AppError(`Wait ${Math.ceil(residuo / 1000)} seconds before drawing`, 409);
  }
}

/** The first turn of a game that has just started */
export function iniziaTurni(game, gameId, ctx) {
  if (!usaTurni(game)) {
    return;
  }
  registraContesto(gameId, ctx);
  game.codaEstrattori = [];
  game.turno = null;
  assegnaTurno(game, ctx);
  armaTimer(game, gameId);
  emettiTurno(game, gameId, ctx);
}

/** The player on turn has left: the turn goes to another one, with the wait that was running */
export function cambiaEstrattore(game, gameId, ctx) {
  if (!usaTurni(game) || game.status !== GAME_STATUS.PLAYING || !game.turno) {
    return;
  }
  registraContesto(gameId, ctx);
  assegnaTurno(game, ctx, { mantieniAttesa: true });
  armaTimer(game, gameId);
  emettiTurno(game, gameId, ctx);
}

/**
 * A player declares the jolly: the time limit stops. If nobody ends the pause, it ends by itself
 * when the player's time to choose runs out (`fineScelta`, in ms).
 */
export function sospendiTurno(game, gameId, fineScelta) {
  const ctx = contesti.get(gameId);
  if (!usaTurni(game) || !game.turno || inSospeso(game.turno) || !ctx) {
    return;
  }
  game.turno.sospesoDa = Date.now();
  fermaTimer(gameId);
  emettiTurno(game, gameId, ctx);

  const timer = setTimeout(() => {
    timersSospensione.delete(gameId);
    const hold = game.jollyInCorso;
    if (hold && hold.scadenza <= Date.now()) {
      game.jollyInCorso = null;
      ctx.io.to(gameId).emit("jollyAnnullato", { playerId: hold.playerId });
    }
    riprendiTurno(game, gameId);
  }, Math.max(0, fineScelta - Date.now()) + 50);
  timer.unref?.();
  timersSospensione.set(gameId, timer);
}

/** The jolly is over: the time limit goes on from where it stopped */
export function riprendiTurno(game, gameId) {
  const ctx = contesti.get(gameId);
  if (!usaTurni(game) || !game.turno || !inSospeso(game.turno) || !ctx) {
    return;
  }
  clearTimeout(timersSospensione.get(gameId));
  timersSospensione.delete(gameId);
  const sospeso = Date.now() - game.turno.sospesoDa;
  game.turno.attesaFino += sospeso;
  game.turno.scadenza += sospeso;
  game.turno.sospesoDa = null;
  armaTimer(game, gameId);
  emettiTurno(game, gameId, ctx);
}

/** At startup: the games in progress get their timers back */
export function riarmaTurni(gameState, io, getStore) {
  let armati = 0;
  for (const [gameId, game] of Object.entries(gameState.games)) {
    if (game.status !== GAME_STATUS.PLAYING || !usaTurni(game) || !game.turno) {
      continue;
    }
    registraContesto(gameId, { io, gameState, getStore });
    // A pause of the jolly does not survive a restart: the time limit goes on
    if (inSospeso(game.turno)) {
      const sospeso = Date.now() - game.turno.sospesoDa;
      game.turno.attesaFino += sospeso;
      game.turno.scadenza += sospeso;
      game.turno.sospesoDa = null;
    }
    armaTimer(game, gameId);
    armati++;
  }
  return armati;
}
