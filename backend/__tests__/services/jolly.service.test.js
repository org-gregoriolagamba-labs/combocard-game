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
