/**
 * Game Constants
 * 
 * Defines all constants used in the card game.
 */

// Card suits (Italian style)
export const SEMI = ["Spade", "Coppe", "Denari", "Bastoni"];

// Suit emojis for display
export const SEMI_EMOJI = {
  Spade: "⚔️",
  Coppe: "🏆",
  Denari: "💰",
  Bastoni: "🪵",
};

// Card values (Italian style)
export const VALORI = [
  "Asso", "Due", "Tre", "Quattro", "Cinque",
  "Sei", "Sette", "Fante", "Cavallo", "Re",
];

// Numeric values for card comparison
export const VALORI_NUM = {
  Asso: 1,
  Due: 2,
  Tre: 3,
  Quattro: 4,
  Cinque: 5,
  Sei: 6,
  Sette: 7,
  Fante: 8,
  Cavallo: 9,
  Re: 10,
};

// Collection types
export const COLLECTION_TYPES = {
  TRIS: "tris",
  SEQUENZA: "sequenza",
  SCOPA: "scopa",
  NAPOLA: "napola",
  COMBOCARD_REALE: "combocard_reale",
};

// Game status
export const GAME_STATUS = {
  WAITING: "waiting",
  PLAYING: "playing",
  FINISHED: "finished",
};

// Default game settings
export const GAME_DEFAULTS = {
  MIN_PLAYERS: 2,
  MAX_PLAYERS: 10,
  REQUIRED_CREDITS: 100,
  GRID_SIZE: 5,
};
