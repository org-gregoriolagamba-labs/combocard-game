/**
 * Card Utils Tests
 * 
 * Unit tests for card generation and manipulation utilities.
 */

import { jest } from '@jest/globals';
import { generaMazzo, generaCartella, generateId, shuffleArray } from '../../src/utils/card.utils.js';
import { SEMI, VALORI, SEMI_EMOJI } from '../../src/config/constants.js';

describe('Card Utils', () => {
  describe('generaMazzo', () => {
    test('should create a deck with 40 cards', () => {
      const mazzo = generaMazzo();
      expect(mazzo).toHaveLength(40);
    });

    test('should have 10 cards for each suit', () => {
      const mazzo = generaMazzo();
      
      SEMI.forEach(seme => {
        const cardsOfSuit = mazzo.filter(card => card.seme === seme);
        expect(cardsOfSuit).toHaveLength(10);
      });
    });

    test('should have all values for each suit', () => {
      const mazzo = generaMazzo();
      
      SEMI.forEach(seme => {
        const cardsOfSuit = mazzo.filter(card => card.seme === seme);
        const values = cardsOfSuit.map(card => card.valore);
        
        VALORI.forEach(valore => {
          expect(values).toContain(valore);
        });
      });
    });

    test('each card should have required properties', () => {
      const mazzo = generaMazzo();
      
      mazzo.forEach(card => {
        expect(card).toHaveProperty('seme');
        expect(card).toHaveProperty('valore');
        expect(card).toHaveProperty('valoreNum');
        expect(card).toHaveProperty('emoji');
        expect(SEMI).toContain(card.seme);
        expect(VALORI).toContain(card.valore);
        expect(typeof card.valoreNum).toBe('number');
      });
    });
  });

  describe('generaCartella', () => {
    test('should create a 5x5 grid', () => {
      const cartella = generaCartella();
      
      expect(cartella).toHaveLength(5);
      cartella.forEach(row => {
        expect(row).toHaveLength(5);
      });
    });

    test('should use 25 cards', () => {
      const cartella = generaCartella();
      
      let totalCards = 0;
      cartella.forEach(row => {
        row.forEach(card => {
          if (card) totalCards++;
        });
      });
      
      expect(totalCards).toBe(25);
    });

    test('each cell should have a valid card', () => {
      const cartella = generaCartella();
      
      cartella.forEach(row => {
        row.forEach(card => {
          expect(card).toHaveProperty('seme');
          expect(card).toHaveProperty('valore');
          expect(card).toHaveProperty('valoreNum');
          expect(card).toHaveProperty('emoji');
        });
      });
    });

    test('cards should be unique in cartella', () => {
      const cartella = generaCartella();
      const cards = [];
      
      cartella.forEach(row => {
        row.forEach(card => {
          const cardKey = `${card.valore}-${card.seme}`;
          expect(cards).not.toContain(cardKey);
          cards.push(cardKey);
        });
      });
    });
  });

  describe('Constants', () => {
    test('SEMI should have 4 suits', () => {
      expect(SEMI).toHaveLength(4);
      expect(SEMI).toContain('Spade');
      expect(SEMI).toContain('Coppe');
      expect(SEMI).toContain('Denari');
      expect(SEMI).toContain('Bastoni');
    });

    test('VALORI should have 10 values', () => {
      expect(VALORI).toHaveLength(10);
      expect(VALORI).toContain('Asso');
      expect(VALORI).toContain('Re');
    });

    test('SEMI_EMOJI should have emojis for each suit', () => {
      expect(SEMI_EMOJI).toHaveProperty('Spade');
      expect(SEMI_EMOJI).toHaveProperty('Coppe');
      expect(SEMI_EMOJI).toHaveProperty('Denari');
      expect(SEMI_EMOJI).toHaveProperty('Bastoni');
    });
  });
});

describe('secure randomness', () => {
  // Ids, the deck and the grids decide who wins prizes: none of them may come from Math.random
  let random;

  beforeEach(() => {
    random = jest.spyOn(Math, 'random');
  });

  afterEach(() => {
    random.mockRestore();
  });

  describe('generateId', () => {
    test('is a version 4 UUID', () => {
      expect(generateId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });

    test('is different every time', () => {
      const ids = new Set(Array.from({ length: 2000 }, () => generateId()));

      expect(ids.size).toBe(2000);
    });

    test('does not use Math.random', () => {
      generateId();

      expect(random).not.toHaveBeenCalled();
    });
  });

  describe('shuffleArray', () => {
    test('gives back the same elements, and leaves the original as it was', () => {
      const original = [1, 2, 3, 4, 5, 6, 7, 8];

      const shuffled = shuffleArray(original);

      expect(original).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
      expect([...shuffled].sort((a, b) => a - b)).toEqual(original);
    });

    test('copes with an empty array and with one element', () => {
      expect(shuffleArray([])).toEqual([]);
      expect(shuffleArray(['a'])).toEqual(['a']);
    });

    test('does not use Math.random', () => {
      shuffleArray(generaMazzo());

      expect(random).not.toHaveBeenCalled();
    });

    test('is not biased: the six orders of three elements are about equally frequent', () => {
      const runs = 6000;
      const counts = {};
      for (let i = 0; i < runs; i += 1) {
        const key = shuffleArray([1, 2, 3]).join('');
        counts[key] = (counts[key] ?? 0) + 1;
      }

      expect(Object.keys(counts)).toHaveLength(6);
      // 1000 expected each, standard deviation about 29: five times that is a safe margin
      Object.values(counts).forEach((count) => expect(Math.abs(count - runs / 6)).toBeLessThan(150));
    });
  });

  describe('generaCartella', () => {
    test('does not use Math.random', () => {
      generaCartella();

      expect(random).not.toHaveBeenCalled();
    });

    test('is not biased: every card is about equally frequent in the first cell', () => {
      const runs = 8000;
      const counts = {};
      for (let i = 0; i < runs; i += 1) {
        const { valore, seme } = generaCartella()[0][0];
        counts[`${valore}-${seme}`] = (counts[`${valore}-${seme}`] ?? 0) + 1;
      }

      expect(Object.keys(counts)).toHaveLength(40);
      // 200 expected each, standard deviation about 14: five times that is a safe margin
      Object.values(counts).forEach((count) => expect(Math.abs(count - runs / 40)).toBeLessThan(75));
    });
  });
});
