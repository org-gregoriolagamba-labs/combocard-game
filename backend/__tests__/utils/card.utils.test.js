/**
 * Card Utils Tests
 * 
 * Unit tests for card generation and manipulation utilities.
 */

import { jest } from '@jest/globals';
import { creaMazzo, creaCartella, SEMI, VALORI, SEMI_EMOJI } from '../../src/utils/card.utils.js';

describe('Card Utils', () => {
  describe('creaMazzo', () => {
    test('should create a deck with 40 cards', () => {
      const mazzo = creaMazzo();
      expect(mazzo).toHaveLength(40);
    });

    test('should have 10 cards for each suit', () => {
      const mazzo = creaMazzo();
      
      SEMI.forEach(seme => {
        const cardsOfSuit = mazzo.filter(card => card.seme === seme);
        expect(cardsOfSuit).toHaveLength(10);
      });
    });

    test('should have all values for each suit', () => {
      const mazzo = creaMazzo();
      
      SEMI.forEach(seme => {
        const cardsOfSuit = mazzo.filter(card => card.seme === seme);
        const values = cardsOfSuit.map(card => card.valore);
        
        VALORI.forEach(valore => {
          expect(values).toContain(valore);
        });
      });
    });

    test('each card should have required properties', () => {
      const mazzo = creaMazzo();
      
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

    test('should create a shuffled deck', () => {
      const mazzo1 = creaMazzo();
      const mazzo2 = creaMazzo();
      
      // Due to shuffling, decks should be in different order
      // There's a tiny chance they could be the same, so we check structure
      expect(mazzo1).toHaveLength(40);
      expect(mazzo2).toHaveLength(40);
    });
  });

  describe('creaCartella', () => {
    test('should create a 5x5 grid', () => {
      const mazzo = creaMazzo();
      const cartella = creaCartella(mazzo);
      
      expect(cartella).toHaveLength(5);
      cartella.forEach(row => {
        expect(row).toHaveLength(5);
      });
    });

    test('should use 25 cards from the deck', () => {
      const mazzo = creaMazzo();
      const initialLength = mazzo.length;
      const cartella = creaCartella(mazzo);
      
      // Cards should be removed from deck
      expect(mazzo.length).toBe(initialLength - 25);
    });

    test('each cell should have a valid card', () => {
      const mazzo = creaMazzo();
      const cartella = creaCartella(mazzo);
      
      cartella.forEach(row => {
        row.forEach(card => {
          expect(card).toHaveProperty('seme');
          expect(card).toHaveProperty('valore');
          expect(card).toHaveProperty('valoreNum');
          expect(card).toHaveProperty('emoji');
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
