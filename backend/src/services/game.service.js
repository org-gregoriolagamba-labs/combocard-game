/**
 * Game Logic Service
 * 
 * Contains all game logic for collection verification and auto-claiming.
 */

import { GAME_DEFAULTS } from "../config/constants.js";

/**
 * Verify TRIS collection (3 cards with same value)
 * @param {Array} cartella - Player's card grid
 * @param {Array} coperte - Boolean grid of covered cards
 * @returns {boolean} True if tris is complete
 */
export function verificaTris(cartella, coperte) {
  const valoriCoperti = {};

  for (let r = 0; r < GAME_DEFAULTS.GRID_SIZE; r++) {
    for (let c = 0; c < GAME_DEFAULTS.GRID_SIZE; c++) {
      if (coperte[r][c]) {
        const valore = cartella[r][c].valore;
        valoriCoperti[valore] = (valoriCoperti[valore] || 0) + 1;
      }
    }
  }

  for (const valore in valoriCoperti) {
    if (valoriCoperti[valore] >= 3) {
      return true;
    }
  }

  return false;
}

/**
 * Verify SEQUENZA collection (4 consecutive cards, mixed suits OK)
 * @param {Array} cartella - Player's card grid
 * @param {Array} coperte - Boolean grid of covered cards
 * @returns {boolean} True if sequenza is complete
 */
export function verificaSequenza(cartella, coperte) {
  const valoriCoperti = [];

  for (let r = 0; r < GAME_DEFAULTS.GRID_SIZE; r++) {
    for (let c = 0; c < GAME_DEFAULTS.GRID_SIZE; c++) {
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
      if (valoriUnici[i + k] !== valoriUnici[i] + k) {
        ok = false;
        break;
      }
    }
    if (ok) {
      return true;
    }
  }

  return false;
}

/**
 * Verify SCOPA collection (5 cards of same suit)
 * @param {Array} cartella - Player's card grid
 * @param {Array} coperte - Boolean grid of covered cards
 * @returns {boolean} True if scopa is complete
 */
export function verificaScopa(cartella, coperte) {
  const semiCoperti = {};

  for (let r = 0; r < GAME_DEFAULTS.GRID_SIZE; r++) {
    for (let c = 0; c < GAME_DEFAULTS.GRID_SIZE; c++) {
      if (coperte[r][c]) {
        const seme = cartella[r][c].seme;
        semiCoperti[seme] = (semiCoperti[seme] || 0) + 1;
      }
    }
  }

  for (const seme in semiCoperti) {
    if (semiCoperti[seme] >= 5) {
      return true;
    }
  }
  return false;
}

/**
 * Verify NAPOLA collection (Tris + Pair)
 * @param {Array} cartella - Player's card grid
 * @param {Array} coperte - Boolean grid of covered cards
 * @returns {boolean} True if napola is complete
 */
export function verificaNapola(cartella, coperte) {
  const valoriCoperti = {};

  for (let r = 0; r < GAME_DEFAULTS.GRID_SIZE; r++) {
    for (let c = 0; c < GAME_DEFAULTS.GRID_SIZE; c++) {
      if (coperte[r][c]) {
        const valore = cartella[r][c].valore;
        valoriCoperti[valore] = (valoriCoperti[valore] || 0) + 1;
      }
    }
  }

  const trisValori = [];
  const coppiaValori = [];

  for (const valore in valoriCoperti) {
    if (valoriCoperti[valore] >= 3) {
      trisValori.push(valore);
    } else if (valoriCoperti[valore] >= 2) {
      coppiaValori.push(valore);
    }
  }

  if (trisValori.length >= 1 && coppiaValori.length >= 1) {
    return true;
  }

  return false;
}

/**
 * Verify COMBOCARD REALE collection (4 consecutive cards of same suit)
 * @param {Array} cartella - Player's card grid
 * @param {Array} coperte - Boolean grid of covered cards
 * @returns {boolean} True if combocard reale is complete
 */
export function verificaCombocardReale(cartella, coperte) {
  const carteCoperte = [];

  for (let r = 0; r < GAME_DEFAULTS.GRID_SIZE; r++) {
    for (let c = 0; c < GAME_DEFAULTS.GRID_SIZE; c++) {
      if (coperte[r][c]) {
        carteCoperte.push(cartella[r][c]);
      }
    }
  }

  const perSeme = {};
  carteCoperte.forEach((carta) => {
    if (!perSeme[carta.seme]) {
      perSeme[carta.seme] = [];
    }
    perSeme[carta.seme].push(carta.valoreNum);
  });

  for (const seme in perSeme) {
    const valori = [...new Set(perSeme[seme])].sort((a, b) => a - b);

    for (let i = 0; i <= valori.length - 4; i++) {
      if (
        valori[i + 1] === valori[i] + 1 &&
        valori[i + 2] === valori[i] + 2 &&
        valori[i + 3] === valori[i] + 3
      ) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Verify any collection type
 * @param {Array} cartella - Player's card grid
 * @param {Array} coperte - Boolean grid of covered cards
 * @param {string} tipo - Collection type
 * @returns {boolean} True if collection is complete
 */
export function verificaCollezione(cartella, coperte, tipo) {
  switch (tipo) {
    case "tris":
      return verificaTris(cartella, coperte);
    case "sequenza":
      return verificaSequenza(cartella, coperte);
    case "scopa":
      return verificaScopa(cartella, coperte);
    case "napola":
      return verificaNapola(cartella, coperte);
    case "combocard_reale":
      return verificaCombocardReale(cartella, coperte);
    default:
      return false;
  }
}

/**
 * Auto-claim collections for all players
 * @param {Object} game - Game object
 * @param {string} gameId - Game ID
 * @param {Object} io - Socket.IO instance
 * @param {Object} gameState - Global game state
 */
export function autoClaimCollezioni(game, gameId, io, gameState) {
  const tipiCollezioni = ["tris", "sequenza", "scopa", "napola", "combocard_reale"];

  for (const tipo of tipiCollezioni) {
    if (game.collezioni[tipo].vinto) {
      continue;
    }

    const vincitori = [];

    for (const player of game.players) {
      if (player.collezioni && player.collezioni.includes(tipo)) {
        continue;
      }

      const completata = verificaCollezione(player.cartella, player.coperte, tipo);
      if (completata) {
        vincitori.push(player);
      }
    }

    if (vincitori.length > 0) {
      const ammontare = game.collezioniDistribuzione[tipo];
      const premioPerGiocatore = Math.floor(ammontare / vincitori.length);

      game.collezioni[tipo].vinto = true;
      game.collezioni[tipo].vincitore = vincitori.map((v) => v.id);

      for (const vincitore of vincitori) {
        vincitore.collezioni = vincitore.collezioni || [];
        vincitore.collezioni.push(tipo);
        vincitore.gettoni += premioPerGiocatore;

        if (vincitore.jollyPos && vincitore.jollyUsato) {
          vincitore.jollyUsedFor = tipo;
        }

        io.to(gameId).emit("gettoniAggiornati", {
          playerId: vincitore.id,
          gettoni: vincitore.gettoni,
        });
      }

      const vincitoriInfo = vincitori.map((v) => ({ id: v.id, name: v.name }));

      io.to(gameId).emit("collezioneVinta", {
        tipo,
        vincitore: vincitori.length === 1 ? vincitoriInfo[0] : vincitoriInfo,
        vincitori: vincitoriInfo,
        ammontare: premioPerGiocatore,
        divided: vincitori.length > 1,
        players: vincitori,
      });

      if (tipo === "combocard_reale") {
        finishGame(game, gameId, io, gameState);
      }
    }
  }
}

/**
 * Finish the game and distribute remaining prizes
 * @param {Object} game - Game object
 * @param {string} gameId - Game ID
 * @param {Object} io - Socket.IO instance
 * @param {Object} gameState - Global game state
 */
export function finishGame(game, gameId, io, gameState) {
  game.status = "finished";

  // Calculate remaining undistributed prizes
  let premiRimanenti = 0;
  const collezioniNonVinte = [];

  for (const tipo in game.collezioniDistribuzione) {
    if (!game.collezioni[tipo].vinto) {
      premiRimanenti += game.collezioniDistribuzione[tipo];
      collezioniNonVinte.push(tipo);
    }
  }

  // Distribute remaining prizes among all players
  if (premiRimanenti > 0 && game.players.length > 0) {
    const premioPerGiocatore = Math.floor(premiRimanenti / game.players.length);

    if (premioPerGiocatore > 0) {
      for (const gamePlayer of game.players) {
        gamePlayer.gettoni += premioPerGiocatore;

        const player = gameState.players[gamePlayer.id];
        if (player) {
          player.credits = gamePlayer.gettoni;
        }
      }

      io.to(gameId).emit("premiRimanentiDivisi", {
        ammontare: premioPerGiocatore,
        collezioniNonVinte,
        totaleRimanente: premiRimanenti,
      });
    }
  }

  // Credit final tokens to players
  for (const gamePlayer of game.players) {
    const player = gameState.players[gamePlayer.id];
    if (player) {
      player.credits = gamePlayer.gettoni;
      player.currentGameId = null;
    }
  }

  const vincitori = game.players
    .filter((p) => p.collezioni.includes("combocard_reale"))
    .map((p) => ({ id: p.id, name: p.name }));

  io.to(gameId).emit("gameFinished", {
    vincitore: vincitori.length === 1 ? vincitori[0] : null,
    vincitori: vincitori,
  });
}
