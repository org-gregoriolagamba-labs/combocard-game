/**
 * Card Utilities
 * 
 * Utility functions for card generation and manipulation.
 */

import { randomInt, randomUUID } from "crypto";
import { SEMI, SEMI_EMOJI, VALORI, VALORI_NUM, GAME_DEFAULTS, COLLECTION_TYPES } from "../config/constants.js";
import { verificaCollezione } from "../services/game.service.js";

/**
 * Generate a complete deck of cards
 * @returns {Array} Array of card objects
 */
export function generaMazzo() {
  const mazzo = [];
  for (const seme of SEMI) {
    for (const valore of VALORI) {
      mazzo.push({
        valore,
        seme,
        emoji: SEMI_EMOJI[seme],
        valoreNum: VALORI_NUM[valore],
      });
    }
  }
  return mazzo;
}

// How many random grids are tried before giving up: a grid is refused about 3 times in 100
const TENTATIVI_CARTELLA = 1000;

/**
 * Which collections a grid allows: a collection is possible when it would be complete if every
 * card of the grid were covered. The rules are the ones of the game (verificaCollezione), the
 * jolly is not counted.
 * @param {Array} cartella - 5x5 grid of cards
 * @returns {Object} Map of collection type to boolean
 */
export function collezioniPossibili(cartella) {
  const tutteCoperte = cartella.map((riga) => riga.map(() => true));
  return Object.fromEntries(
    Object.values(COLLECTION_TYPES).map((tipo) => [tipo, verificaCollezione(cartella, tutteCoperte, tipo)]),
  );
}

/**
 * Generate a shuffled card grid (cartella) for a player. Every grid allows every collection
 * of the game: a random grid that does not (about 3 in 100 have no Combocard Reale) is
 * discarded and drawn again, so the odds of the cards stay random.
 * @returns {Array} 5x5 grid of cards
 */
export function generaCartella() {
  for (let i = 0; i < TENTATIVI_CARTELLA; i++) {
    const cartella = generaCartellaCasuale();
    if (Object.values(collezioniPossibili(cartella)).every(Boolean)) {
      return cartella;
    }
  }
  throw new Error("Impossibile generare una cartella che permetta tutte le collezioni");
}

function generaCartellaCasuale() {
  const mazzoMescolato = shuffleArray(generaMazzo());
  const carte25 = mazzoMescolato.slice(0, GAME_DEFAULTS.GRID_SIZE * GAME_DEFAULTS.GRID_SIZE);
  
  const cartella = Array(GAME_DEFAULTS.GRID_SIZE).fill(null).map(() => 
    Array(GAME_DEFAULTS.GRID_SIZE).fill(null),
  );
  
  let idx = 0;
  for (let r = 0; r < GAME_DEFAULTS.GRID_SIZE; r++) {
    for (let c = 0; c < GAME_DEFAULTS.GRID_SIZE; c++) {
      cartella[r][c] = { ...carte25[idx] };
      idx++;
    }
  }
  
  return cartella;
}

/**
 * Check if a card exists in the player's grid
 * @param {Array} cartella - Player's card grid
 * @param {Object} jollyPos - Position to exclude (jolly position)
 * @param {string} valore - Card value to search
 * @param {string} seme - Card suit to search
 * @returns {boolean} True if card exists
 */
export function cartaEsisteInCartella(cartella, jollyPos, valore, seme) {
  for (let r = 0; r < GAME_DEFAULTS.GRID_SIZE; r++) {
    for (let c = 0; c < GAME_DEFAULTS.GRID_SIZE; c++) {
      if (jollyPos && jollyPos.row === r && jollyPos.col === c) {
        continue;
      }
      
      const carta = cartella[r][c];
      if (carta.valore === valore && carta.seme === seme) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Shuffle an array using Fisher-Yates algorithm. The deck and the grids decide who wins
 * prizes, so the indexes come from a cryptographically secure source, never Math.random.
 * @param {Array} array - Array to shuffle
 * @returns {Array} Shuffled copy: the original is not changed
 */
export function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Generate a unique ID, from a cryptographically secure source. The ID of a private game is also
 * its invite code, so it must not be guessable.
 * @returns {string} Random version 4 UUID
 */
export function generateId() {
  return randomUUID();
}
