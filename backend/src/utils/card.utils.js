/**
 * Card Utilities
 * 
 * Utility functions for card generation and manipulation.
 */

import { SEMI, SEMI_EMOJI, VALORI, VALORI_NUM, GAME_DEFAULTS } from "../config/constants.js";

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

/**
 * Generate a shuffled card grid (cartella) for a player
 * @returns {Array} 5x5 grid of cards
 */
export function generaCartella() {
  const mazzoCompleto = generaMazzo();
  const mazzoMescolato = mazzoCompleto.sort(() => Math.random() - 0.5);
  const carte25 = mazzoMescolato.slice(0, GAME_DEFAULTS.GRID_SIZE * GAME_DEFAULTS.GRID_SIZE);
  
  const cartella = Array(GAME_DEFAULTS.GRID_SIZE).fill(null).map(() => 
    Array(GAME_DEFAULTS.GRID_SIZE).fill(null)
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
 * Shuffle an array using Fisher-Yates algorithm
 * @param {Array} array - Array to shuffle
 * @returns {Array} Shuffled array
 */
export function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Generate a unique ID
 * @returns {string} Random ID string
 */
export function generateId() {
  return Math.random().toString(36).substr(2, 9);
}
