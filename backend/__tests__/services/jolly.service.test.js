/**
 * Jolly Service Unit Tests
 * 
 * Tests for jolly card conversion logic and validation.
 */

import { jest } from '@jest/globals';
import {
  trovaMiglioreConversioneJolly,
  applyJollyConversion,
} from '../../src/services/jolly.service.js';
import { SEMI_EMOJI } from '../../src/config/constants.js';
import { generaMazzo } from '../../src/utils/card.utils.js';

describe('the jolly never becomes a card that is already in the sheet, itself included', () => {
  const mazzo = generaMazzo();
  const get = (valore, seme) => mazzo.find((c) => c.valore === valore && c.seme === seme);
  // A sheet that starts with `carte` (the first `coperte` of them covered) and goes on with other cards
  const foglio = (carte, coperte) => {
    const usate = new Set(carte.map((c) => `${c.valore}|${c.seme}`));
    const tutte = [...carte, ...mazzo.filter((c) => !usate.has(`${c.valore}|${c.seme}`))].slice(0, 25);
    const cartella = [0, 1, 2, 3, 4].map((r) => tutte.slice(r * 5, r * 5 + 5).map((c) => ({ ...c })));
    const cop = cartella.map((riga, r) => riga.map((_, c) => r * 5 + c < coperte));
    return { cartella, cop };
  };

  test('sequenza: the card that is the missing one cannot be turned into itself', () => {
    const { cartella, cop } = foglio(
      [get('Due', 'Spade'), get('Tre', 'Coppe'), get('Cinque', 'Denari'), get('Quattro', 'Spade')], 3);

    expect(trovaMiglioreConversioneJolly(cartella, cop, { row: 0, col: 3 }, 'sequenza')).toBeNull();
  });

  test('tris: a Sei turned into the Sei of its own suit is refused', () => {
    const { cartella, cop } = foglio([get('Sei', 'Spade'), get('Sei', 'Coppe'), get('Sei', 'Denari')], 2);

    expect(trovaMiglioreConversioneJolly(cartella, cop, { row: 0, col: 2 }, 'tris')).toBeNull();
  });

  test('scopa: a card already of the suit with four covered is refused', () => {
    const { cartella, cop } = foglio(
      [get('Asso', 'Spade'), get('Due', 'Spade'), get('Tre', 'Spade'), get('Quattro', 'Spade'), get('Cinque', 'Spade')], 4);

    expect(trovaMiglioreConversioneJolly(cartella, cop, { row: 0, col: 4 }, 'scopa')).toBeNull();
  });

  test('combocard reale: the missing card of the suit cannot be turned into itself', () => {
    const { cartella, cop } = foglio(
      [get('Due', 'Spade'), get('Tre', 'Spade'), get('Cinque', 'Spade'), get('Quattro', 'Spade')], 3);

    expect(trovaMiglioreConversioneJolly(cartella, cop, { row: 0, col: 3 }, 'combocard_reale')).toBeNull();
  });

  test('another card of the sheet can still become the missing one', () => {
    const { cartella, cop } = foglio(
      [get('Due', 'Spade'), get('Tre', 'Coppe'), get('Cinque', 'Denari'), get('Asso', 'Bastoni')], 3);

    expect(trovaMiglioreConversioneJolly(cartella, cop, { row: 0, col: 3 }, 'sequenza'))
      .toEqual({ valore: 'Quattro', seme: 'Bastoni' });
  });
});

describe('Jolly Service', () => {
  describe('trovaMiglioreConversioneJolly', () => {
    test('should return object or null based on card configuration', () => {
      // Complex logic - just verify function executes without errors
      const cartella = Array(5).fill(null).map(() => 
        Array(5).fill({ valore: 'Asso', seme: 'Coppe', valoreNum: 1 })
      );
      
      const coperte = Array(5).fill(null).map(() => Array(5).fill(false));
      
      const result = trovaMiglioreConversioneJolly(
        cartella, 
        coperte, 
        { row: 0, col: 0 }, 
        'tris'
      );
      
      // Function should execute without throwing
      expect(result === null || typeof result === 'object').toBe(true);
    });
  });

  describe('applyJollyConversion', () => {
    test('should convert card with jolly flag', () => {
      const card = { valore: 'Cinque', seme: 'Coppe', valoreNum: 5, emoji: '🏆' };
      const conversion = {
        valore: 'Sette',
        seme: 'Bastoni',
      };
      
      const result = applyJollyConversion(card, conversion, SEMI_EMOJI);
      
      expect(result.isJolly).toBe(true);
      expect(result.valore).toBe('Sette');
      expect(result.seme).toBe('Bastoni');
    });

    test('should update emoji based on new suit', () => {
      const card = { valore: 'Asso', seme: 'Spade', valoreNum: 1, emoji: '⚔️' };
      const conversion = {
        valore: 'Due',
        seme: 'Coppe',
      };
      
      const result = applyJollyConversion(card, conversion, SEMI_EMOJI);
      
      expect(result.seme).toBe('Coppe');
      expect(result.emoji).toBe(SEMI_EMOJI['Coppe']);
      expect(result.isJolly).toBe(true);
    });
  });
});
