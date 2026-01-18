/**
 * Progress Utils Tests
 */

import { calcolaProgresso } from '../../utils/progress.utils';

describe('calcolaProgresso', () => {
  // Helper to create mock player with cartella and coperte
  const createMockPlayer = (cards, coveredPositions = []) => {
    const cartella = Array(5).fill(null).map(() => 
      Array(5).fill(null).map(() => ({ 
        seme: 'Spade', 
        valore: 'Asso', 
        valoreNum: 1 
      }))
    );
    
    const coperte = Array(5).fill(null).map(() => Array(5).fill(false));
    
    cards.forEach(({ row, col, seme, valore, valoreNum }) => {
      cartella[row][col] = { seme, valore, valoreNum };
    });
    
    coveredPositions.forEach(([r, c]) => {
      coperte[r][c] = true;
    });
    
    return { cartella, coperte };
  };

  test('should return zeros for null player', () => {
    const result = calcolaProgresso(null, 'tris');
    
    expect(result.count).toBe(0);
    expect(result.total).toBe(0);
    expect(result.status).toBe('far');
  });

  describe('tris', () => {
    test('should calculate tris progress correctly', () => {
      const player = createMockPlayer(
        [
          { row: 0, col: 0, seme: 'Spade', valore: 'Asso', valoreNum: 1 },
          { row: 0, col: 1, seme: 'Coppe', valore: 'Asso', valoreNum: 1 },
          { row: 0, col: 2, seme: 'Denari', valore: 'Due', valoreNum: 2 },
        ],
        [[0, 0], [0, 1], [0, 2]]
      );
      
      const result = calcolaProgresso(player, 'tris');
      
      expect(result.total).toBe(3);
      expect(result.count).toBe(2); // 2 Asso cards
    });

    test('should show near status when close to completing', () => {
      const player = createMockPlayer(
        [
          { row: 0, col: 0, seme: 'Spade', valore: 'Asso', valoreNum: 1 },
          { row: 0, col: 1, seme: 'Coppe', valore: 'Asso', valoreNum: 1 },
        ],
        [[0, 0], [0, 1]]
      );
      
      const result = calcolaProgresso(player, 'tris');
      
      expect(result.status).toBe('near');
    });
  });

  describe('sequenza', () => {
    test('should calculate sequenza progress correctly', () => {
      const player = createMockPlayer(
        [
          { row: 0, col: 0, seme: 'Spade', valore: 'Asso', valoreNum: 1 },
          { row: 0, col: 1, seme: 'Coppe', valore: 'Due', valoreNum: 2 },
          { row: 0, col: 2, seme: 'Denari', valore: 'Tre', valoreNum: 3 },
        ],
        [[0, 0], [0, 1], [0, 2]]
      );
      
      const result = calcolaProgresso(player, 'sequenza');
      
      expect(result.total).toBe(4);
      expect(result.count).toBe(3); // 3 consecutive
    });
  });

  describe('scopa', () => {
    test('should calculate scopa progress correctly', () => {
      const player = createMockPlayer(
        [
          { row: 0, col: 0, seme: 'Spade', valore: 'Asso', valoreNum: 1 },
          { row: 0, col: 1, seme: 'Spade', valore: 'Due', valoreNum: 2 },
          { row: 0, col: 2, seme: 'Spade', valore: 'Tre', valoreNum: 3 },
          { row: 0, col: 3, seme: 'Coppe', valore: 'Quattro', valoreNum: 4 },
        ],
        [[0, 0], [0, 1], [0, 2], [0, 3]]
      );
      
      const result = calcolaProgresso(player, 'scopa');
      
      expect(result.total).toBe(5);
      expect(result.count).toBe(3); // 3 Spade cards
    });
  });

  describe('napola', () => {
    test('should calculate napola progress correctly', () => {
      const player = createMockPlayer(
        [
          { row: 0, col: 0, seme: 'Spade', valore: 'Asso', valoreNum: 1 },
          { row: 0, col: 1, seme: 'Coppe', valore: 'Asso', valoreNum: 1 },
          { row: 0, col: 2, seme: 'Denari', valore: 'Asso', valoreNum: 1 },
          { row: 0, col: 3, seme: 'Spade', valore: 'Due', valoreNum: 2 },
          { row: 0, col: 4, seme: 'Coppe', valore: 'Due', valoreNum: 2 },
        ],
        [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]]
      );
      
      const result = calcolaProgresso(player, 'napola');
      
      expect(result.total).toBe(5);
      expect(result.count).toBe(5); // Full house: 3 + 2
    });
  });

  describe('combocard_reale', () => {
    test('should calculate combocard_reale progress correctly', () => {
      const player = createMockPlayer(
        [
          { row: 0, col: 0, seme: 'Spade', valore: 'Asso', valoreNum: 1 },
          { row: 0, col: 1, seme: 'Spade', valore: 'Due', valoreNum: 2 },
          { row: 0, col: 2, seme: 'Spade', valore: 'Tre', valoreNum: 3 },
        ],
        [[0, 0], [0, 1], [0, 2]]
      );
      
      const result = calcolaProgresso(player, 'combocard_reale');
      
      expect(result.total).toBe(4);
      expect(result.count).toBe(3); // 3 consecutive of same suit
      expect(result.status).toBe('near');
    });
  });
});
