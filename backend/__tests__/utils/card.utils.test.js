/**
 * Card Utils Tests
 * 
 * Unit tests for card generation and manipulation utilities.
 */

import { jest } from '@jest/globals';
import { generaMazzo, generaCartella } from '../../src/utils/card.utils.js';
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