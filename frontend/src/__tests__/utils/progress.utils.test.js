/**
 * Progress Utils Tests
 */

import { calcolaProgresso } from '../../utils/progress.utils';
import { carteConJolly } from '../../utils/jolly.utils';
import { VALORI_IN_ORDINE } from '../../utils/mazzo.utils';

describe('calcolaProgresso e Jolly', () => {
  // The count says "one card away" exactly when the jolly can complete the collection
  test.each(['sequenza', 'combocard_reale'])('%s: one card away if and only if the jolly has a card to offer', (tipo) => {
    const semi = ['Denari', 'Coppe', 'Spade', 'Bastoni'];
    const carta = (seme, i) => ({ seme, valore: VALORI_IN_ORDINE[i], valoreNum: i + 1 });
    // Row 0: Asso, Due, Quattro covered (three of a window, the Tre missing), the Tre of Spade not covered
    const cartella = Array(5).fill(null).map((_, r) =>
      Array(5).fill(null).map((__, c) => carta(semi[(r + c) % 4], (r * 5 + c) % 10)));
    const coperte = Array(5).fill(null).map(() => Array(5).fill(false));
    const uno = tipo === 'sequenza' ? ['Denari', 'Coppe', 'Spade'] : ['Spade', 'Spade', 'Spade'];
    cartella[0][0] = carta(uno[0], 0);
    cartella[0][1] = carta(uno[1], 1);
    cartella[0][2] = carta(uno[2], 3);
    cartella[1][0] = carta('Spade', 7); // a card the jolly can turn
    cartella[4][2] = carta('Coppe', 9); // the Tre of Spade must not be in the sheet already
    [[0, 0], [0, 1], [0, 2]].forEach(([r, c]) => { coperte[r][c] = true; });

    const { count, total } = calcolaProgresso({ cartella, coperte }, tipo);

    expect(total - count === 1).toBe(carteConJolly(cartella, coperte, tipo).length > 0);
  });
});

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

    test('a gap does not hide the card the jolly would complete: Asso, Due, Quattro make 3 of 4', () => {
      const player = createMockPlayer(
        [
          { row: 0, col: 0, seme: 'Spade', valore: 'Asso', valoreNum: 1 },
          { row: 0, col: 1, seme: 'Coppe', valore: 'Due', valoreNum: 2 },
          { row: 0, col: 2, seme: 'Denari', valore: 'Quattro', valoreNum: 4 },
        ],
        [[0, 0], [0, 1], [0, 2]]
      );

      expect(calcolaProgresso(player, 'sequenza').count).toBe(3);
    });

    test('a run with a gap and a longer run: Due, Tre, Cinque, Sei, Sette make 3 of 4', () => {
      const player = createMockPlayer(
        [
          { row: 0, col: 0, seme: 'Spade', valore: 'Due', valoreNum: 2 },
          { row: 0, col: 1, seme: 'Coppe', valore: 'Tre', valoreNum: 3 },
          { row: 0, col: 2, seme: 'Denari', valore: 'Cinque', valoreNum: 5 },
          { row: 0, col: 3, seme: 'Spade', valore: 'Sei', valoreNum: 6 },
          { row: 0, col: 4, seme: 'Coppe', valore: 'Sette', valoreNum: 7 },
        ],
        [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]]
      );

      expect(calcolaProgresso(player, 'sequenza').count).toBe(3);
    });

    test('two values far apart make 1 of 4, not more', () => {
      const player = createMockPlayer(
        [
          { row: 0, col: 0, seme: 'Spade', valore: 'Asso', valoreNum: 1 },
          { row: 0, col: 1, seme: 'Coppe', valore: 'Cavallo', valoreNum: 9 },
        ],
        [[0, 0], [0, 1]]
      );

      expect(calcolaProgresso(player, 'sequenza').count).toBe(1);
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

    test('a gap in one suit counts: Asso, Due, Quattro of Spade make 3 of 4', () => {
      const player = createMockPlayer(
        [
          { row: 0, col: 0, seme: 'Spade', valore: 'Asso', valoreNum: 1 },
          { row: 0, col: 1, seme: 'Spade', valore: 'Due', valoreNum: 2 },
          { row: 0, col: 2, seme: 'Spade', valore: 'Quattro', valoreNum: 4 },
        ],
        [[0, 0], [0, 1], [0, 2]]
      );

      expect(calcolaProgresso(player, 'combocard_reale').count).toBe(3);
    });

    test('values in mixed suits do not add up: Asso, Due, Quattro of three suits make 1 of 4', () => {
      const player = createMockPlayer(
        [
          { row: 0, col: 0, seme: 'Spade', valore: 'Asso', valoreNum: 1 },
          { row: 0, col: 1, seme: 'Coppe', valore: 'Due', valoreNum: 2 },
          { row: 0, col: 2, seme: 'Denari', valore: 'Quattro', valoreNum: 4 },
        ],
        [[0, 0], [0, 1], [0, 2]]
      );

      expect(calcolaProgresso(player, 'combocard_reale').count).toBe(1);
    });
  });
});
