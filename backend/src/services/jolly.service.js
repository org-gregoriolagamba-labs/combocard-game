/**
 * Jolly Logic Service
 * 
 * Contains logic for Jolly card conversion to complete collections.
 */

import { VALORI_NUM, GAME_DEFAULTS } from "../config/constants.js";
import { cartaEsisteInCartella } from "../utils/card.utils.js";

/**
 * Find the best conversion for a Jolly card to complete a collection
 * @param {Array} cartella - Player's card grid
 * @param {Array} coperte - Boolean grid of covered cards
 * @param {Object} jollyPos - Position of the jolly card
 * @param {string} tipo - Collection type to aim for
 * @returns {Object|null} Best conversion { valore, seme } or null
 */
export function trovaMiglioreConversioneJolly(cartella, coperte, jollyPos, tipo) {
  if (!jollyPos) {
    return null;
  }

  const jollyCard = cartella[jollyPos.row][jollyPos.col];

  // Get all covered cards excluding the jolly position
  const covered = [];
  for (let r = 0; r < GAME_DEFAULTS.GRID_SIZE; r++) {
    for (let c = 0; c < GAME_DEFAULTS.GRID_SIZE; c++) {
      if (coperte[r][c] && !(r === jollyPos.row && c === jollyPos.col)) {
        covered.push(cartella[r][c]);
      }
    }
  }

  // Collections that don't require same suit -> Change VALUE, Keep SUIT
  if (tipo === "tris") {
    const counts = {};
    covered.forEach((c) => (counts[c.valore] = (counts[c.valore] || 0) + 1));

    for (const valore in counts) {
      if (counts[valore] >= 2) {
        if (!cartaEsisteInCartella(cartella, jollyPos, valore, jollyCard.seme)) {
          return { valore: valore, seme: jollyCard.seme };
        }
      }
    }
  } else if (tipo === "sequenza") {
    const nums = [...new Set(covered.map((c) => c.valoreNum))].sort((a, b) => a - b);

    for (let start = 1; start <= 10 - 4 + 1; start++) {
      const missing = [];
      const present = [];
      for (let v = start; v < start + 4; v++) {
        if (nums.includes(v)) {
          present.push(v);
        } else {
          missing.push(v);
        }
      }

      if (missing.length === 1 && present.length === 3) {
        const missingNum = missing[0];
        const missingValore = Object.keys(VALORI_NUM).find(
          (k) => VALORI_NUM[k] === missingNum,
        );

        if (!cartaEsisteInCartella(cartella, jollyPos, missingValore, jollyCard.seme)) {
          return { valore: missingValore, seme: jollyCard.seme };
        }
      }
    }
  } else if (tipo === "napola") {
    const values = {};
    covered.forEach((c) => (values[c.valore] = (values[c.valore] || 0) + 1));
    const counts = Object.entries(values).sort((a, b) => b[1] - a[1]);

    // Case: two pairs, need to complete one to tris
    if (counts.length >= 2 && counts[0][1] === 2 && counts[1][1] >= 2) {
      const valoreTarget = counts[0][0];
      if (!cartaEsisteInCartella(cartella, jollyPos, valoreTarget, jollyCard.seme)) {
        return { valore: valoreTarget, seme: jollyCard.seme };
      }
    }
    // Case: tris + single, need to make a pair
    if (counts.length >= 2 && counts[0][1] >= 3 && counts[1][1] === 1) {
      const valoreTarget = counts[1][0];
      if (!cartaEsisteInCartella(cartella, jollyPos, valoreTarget, jollyCard.seme)) {
        return { valore: valoreTarget, seme: jollyCard.seme };
      }
    }
  }

  // Collections that require same suit -> Change SUIT, Keep VALUE
  else if (tipo === "scopa") {
    const semiCounts = {};
    covered.forEach((c) => (semiCounts[c.seme] = (semiCounts[c.seme] || 0) + 1));

    let bestSeme = null;
    let maxCount = 0;
    for (const s in semiCounts) {
      if (semiCounts[s] > maxCount) {
        maxCount = semiCounts[s];
        bestSeme = s;
      }
    }

    if (bestSeme && maxCount >= 4) {
      if (!cartaEsisteInCartella(cartella, jollyPos, jollyCard.valore, bestSeme)) {
        return { valore: jollyCard.valore, seme: bestSeme };
      }
    }
  } else if (tipo === "combocard_reale") {
    // Find the suit with longest sequence and convert to that suit
    const perSeme = {};
    covered.forEach((c) => {
      if (!perSeme[c.seme]) {
        perSeme[c.seme] = [];
      }
      perSeme[c.seme].push(c.valoreNum);
    });

    for (const seme in perSeme) {
      const valori = [...new Set(perSeme[seme])].sort((a, b) => a - b);

      // Check if adding our card could complete a sequence of 4
      for (let start = 1; start <= 10 - 4 + 1; start++) {
        const missing = [];
        const present = [];
        for (let v = start; v < start + 4; v++) {
          if (valori.includes(v)) {
            present.push(v);
          } else {
            missing.push(v);
          }
        }

        if (missing.length === 1 && present.length === 3) {
          const missingNum = missing[0];
          const missingValore = Object.keys(VALORI_NUM).find(
            (k) => VALORI_NUM[k] === missingNum,
          );

          if (!cartaEsisteInCartella(cartella, jollyPos, missingValore, seme)) {
            return { valore: missingValore, seme: seme };
          }
        }
      }
    }
  }

  return null;
}

/**
 * Apply jolly conversion to a card
 * @param {Object} card - Original card
 * @param {Object} conversion - Conversion { valore, seme }
 * @param {Object} SEMI_EMOJI - Emoji mapping for suits
 * @returns {Object} New card with converted values
 */
export function applyJollyConversion(card, conversion, SEMI_EMOJI) {
  return {
    ...card,
    valore: conversion.valore,
    seme: conversion.seme,
    emoji: SEMI_EMOJI[conversion.seme],
    valoreNum: VALORI_NUM[conversion.valore],
    isJolly: true,
  };
}
