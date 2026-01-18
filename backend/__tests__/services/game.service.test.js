/**
 * Game Service Tests
 * 
 * Unit tests for game business logic including collection verification.
 */

import { jest } from '@jest/globals';
import GameService from '../../src/services/game.service.js';

describe('GameService', () => {
  // Helper to create a covered cards matrix
  const createCoperte = (coveredPositions = []) => {
    const coperte = Array(5).fill(null).map(() => Array(5).fill(false));
    coveredPositions.forEach(([r, c]) => {
      coperte[r][c] = true;
    });
    return coperte;
  };

  // Helper to create a cartella with specific cards
  const createCartella = (cards) => {
    const cartella = Array(5).fill(null).map(() => 
      Array(5).fill(null).map(() => ({ 
        seme: 'Spade', 
        valore: 'Asso', 
        valoreNum: 1, 
        emoji: '⚔️' 
      }))
    );
    
    cards.forEach(({ row, col, seme, valore, valoreNum }) => {
      cartella[row][col] = { 
        seme, 
        valore, 
        valoreNum, 
        emoji: '⚔️' 
      };
    });
    
    return cartella;
  };

  describe('verificaTris', () => {
    test('should return true when 3 cards of same value are covered', () => {
      const cartella = createCartella([
        { row: 0, col: 0, seme: 'Spade', valore: 'Asso', valoreNum: 1 },
        { row: 0, col: 1, seme: 'Coppe', valore: 'Asso', valoreNum: 1 },
        { row: 0, col: 2, seme: 'Denari', valore: 'Asso', valoreNum: 1 },
      ]);
      const coperte = createCoperte([[0, 0], [0, 1], [0, 2]]);
      
      expect(GameService.verificaTris(cartella, coperte)).toBe(true);
    });

    test('should return false when less than 3 cards of same value', () => {
      const cartella = createCartella([
        { row: 0, col: 0, seme: 'Spade', valore: 'Asso', valoreNum: 1 },
        { row: 0, col: 1, seme: 'Coppe', valore: 'Asso', valoreNum: 1 },
        { row: 0, col: 2, seme: 'Denari', valore: 'Due', valoreNum: 2 },
      ]);
      const coperte = createCoperte([[0, 0], [0, 1], [0, 2]]);
      
      expect(GameService.verificaTris(cartella, coperte)).toBe(false);
    });

    test('should return false when cards are not covered', () => {
      const cartella = createCartella([
        { row: 0, col: 0, seme: 'Spade', valore: 'Asso', valoreNum: 1 },
        { row: 0, col: 1, seme: 'Coppe', valore: 'Asso', valoreNum: 1 },
        { row: 0, col: 2, seme: 'Denari', valore: 'Asso', valoreNum: 1 },
      ]);
      const coperte = createCoperte([[0, 0], [0, 1]]); // Only 2 covered
      
      expect(GameService.verificaTris(cartella, coperte)).toBe(false);
    });
  });

  describe('verificaSequenza', () => {
    test('should return true when 4 consecutive values are covered', () => {
      const cartella = createCartella([
        { row: 0, col: 0, seme: 'Spade', valore: 'Asso', valoreNum: 1 },
        { row: 0, col: 1, seme: 'Coppe', valore: 'Due', valoreNum: 2 },
        { row: 0, col: 2, seme: 'Denari', valore: 'Tre', valoreNum: 3 },
        { row: 0, col: 3, seme: 'Bastoni', valore: 'Quattro', valoreNum: 4 },
      ]);
      const coperte = createCoperte([[0, 0], [0, 1], [0, 2], [0, 3]]);
      
      expect(GameService.verificaSequenza(cartella, coperte)).toBe(true);
    });

    test('should return false when values are not consecutive', () => {
      const cartella = createCartella([
        { row: 0, col: 0, seme: 'Spade', valore: 'Asso', valoreNum: 1 },
        { row: 0, col: 1, seme: 'Coppe', valore: 'Due', valoreNum: 2 },
        { row: 0, col: 2, seme: 'Denari', valore: 'Quattro', valoreNum: 4 }, // Gap
        { row: 0, col: 3, seme: 'Bastoni', valore: 'Cinque', valoreNum: 5 },
      ]);
      const coperte = createCoperte([[0, 0], [0, 1], [0, 2], [0, 3]]);
      
      expect(GameService.verificaSequenza(cartella, coperte)).toBe(false);
    });
  });

  describe('verificaScopa', () => {
    test('should return true when 5 cards of same suit are covered', () => {
      const cartella = createCartella([
        { row: 0, col: 0, seme: 'Spade', valore: 'Asso', valoreNum: 1 },
        { row: 0, col: 1, seme: 'Spade', valore: 'Due', valoreNum: 2 },
        { row: 0, col: 2, seme: 'Spade', valore: 'Tre', valoreNum: 3 },
        { row: 0, col: 3, seme: 'Spade', valore: 'Quattro', valoreNum: 4 },
        { row: 0, col: 4, seme: 'Spade', valore: 'Cinque', valoreNum: 5 },
      ]);
      const coperte = createCoperte([[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]]);
      
      expect(GameService.verificaScopa(cartella, coperte)).toBe(true);
    });

    test('should return false when less than 5 cards of same suit', () => {
      const cartella = createCartella([
        { row: 0, col: 0, seme: 'Spade', valore: 'Asso', valoreNum: 1 },
        { row: 0, col: 1, seme: 'Spade', valore: 'Due', valoreNum: 2 },
        { row: 0, col: 2, seme: 'Spade', valore: 'Tre', valoreNum: 3 },
        { row: 0, col: 3, seme: 'Spade', valore: 'Quattro', valoreNum: 4 },
        { row: 0, col: 4, seme: 'Coppe', valore: 'Cinque', valoreNum: 5 }, // Different suit
      ]);
      const coperte = createCoperte([[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]]);
      
      expect(GameService.verificaScopa(cartella, coperte)).toBe(false);
    });
  });

  describe('verificaNapola', () => {
    test('should return true for full house (3+2 of same value)', () => {
      const cartella = createCartella([
        // Tris of Asso
        { row: 0, col: 0, seme: 'Spade', valore: 'Asso', valoreNum: 1 },
        { row: 0, col: 1, seme: 'Coppe', valore: 'Asso', valoreNum: 1 },
        { row: 0, col: 2, seme: 'Denari', valore: 'Asso', valoreNum: 1 },
        // Pair of Due
        { row: 0, col: 3, seme: 'Spade', valore: 'Due', valoreNum: 2 },
        { row: 0, col: 4, seme: 'Coppe', valore: 'Due', valoreNum: 2 },
      ]);
      const coperte = createCoperte([[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]]);
      
      expect(GameService.verificaNapola(cartella, coperte)).toBe(true);
    });

    test('should return false without full house', () => {
      const cartella = createCartella([
        { row: 0, col: 0, seme: 'Spade', valore: 'Asso', valoreNum: 1 },
        { row: 0, col: 1, seme: 'Coppe', valore: 'Asso', valoreNum: 1 },
        { row: 0, col: 2, seme: 'Denari', valore: 'Asso', valoreNum: 1 },
        { row: 0, col: 3, seme: 'Spade', valore: 'Due', valoreNum: 2 },
        { row: 0, col: 4, seme: 'Coppe', valore: 'Tre', valoreNum: 3 }, // No pair
      ]);
      const coperte = createCoperte([[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]]);
      
      expect(GameService.verificaNapola(cartella, coperte)).toBe(false);
    });
  });

  describe('verificaCombocardReale', () => {
    test('should return true for 4 consecutive cards of same suit', () => {
      const cartella = createCartella([
        { row: 0, col: 0, seme: 'Spade', valore: 'Asso', valoreNum: 1 },
        { row: 0, col: 1, seme: 'Spade', valore: 'Due', valoreNum: 2 },
        { row: 0, col: 2, seme: 'Spade', valore: 'Tre', valoreNum: 3 },
        { row: 0, col: 3, seme: 'Spade', valore: 'Quattro', valoreNum: 4 },
      ]);
      const coperte = createCoperte([[0, 0], [0, 1], [0, 2], [0, 3]]);
      
      expect(GameService.verificaCombocardReale(cartella, coperte)).toBe(true);
    });

    test('should return false when cards are not of same suit', () => {
      const cartella = createCartella([
        { row: 0, col: 0, seme: 'Spade', valore: 'Asso', valoreNum: 1 },
        { row: 0, col: 1, seme: 'Coppe', valore: 'Due', valoreNum: 2 }, // Different suit
        { row: 0, col: 2, seme: 'Spade', valore: 'Tre', valoreNum: 3 },
        { row: 0, col: 3, seme: 'Spade', valore: 'Quattro', valoreNum: 4 },
      ]);
      const coperte = createCoperte([[0, 0], [0, 1], [0, 2], [0, 3]]);
      
      expect(GameService.verificaCombocardReale(cartella, coperte)).toBe(false);
    });

    test('should return false when cards are not consecutive', () => {
      const cartella = createCartella([
        { row: 0, col: 0, seme: 'Spade', valore: 'Asso', valoreNum: 1 },
        { row: 0, col: 1, seme: 'Spade', valore: 'Due', valoreNum: 2 },
        { row: 0, col: 2, seme: 'Spade', valore: 'Quattro', valoreNum: 4 }, // Gap
        { row: 0, col: 3, seme: 'Spade', valore: 'Cinque', valoreNum: 5 },
      ]);
      const coperte = createCoperte([[0, 0], [0, 1], [0, 2], [0, 3]]);
      
      expect(GameService.verificaCombocardReale(cartella, coperte)).toBe(false);
    });
  });
});
