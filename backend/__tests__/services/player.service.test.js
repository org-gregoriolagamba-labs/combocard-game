/**
 * Player Service Unit Tests
 * 
 * Tests for player registration, credits management, and player retrieval.
 */

import { jest } from '@jest/globals';
import {
  registerPlayer,
  getPlayer,
  buyCredits,
  getAllPlayers,
} from '../../src/services/player.service.js';

describe('Player Service', () => {
  let gameState;

  beforeEach(() => {
    gameState = {
      players: {},
    };
  });

  describe('registerPlayer', () => {
    test('should create new player with 0 credits', () => {
      const player = registerPlayer(gameState, 'TestPlayer');

      expect(player).toBeDefined();
      expect(player.name).toBe('TestPlayer');
      expect(player.credits).toBe(0);
      expect(player.id).toBeDefined();
    });

    test('should reject empty player name', () => {
      expect(() => registerPlayer(gameState, '')).toThrow();
    });

    test('should reject null player name', () => {
      expect(() => registerPlayer(gameState, null)).toThrow();
    });

    test('should store player in gameState', () => {
      const player = registerPlayer(gameState, 'StoredPlayer');

      expect(gameState.players[player.id]).toBeDefined();
      expect(gameState.players[player.id].name).toBe('StoredPlayer');
    });
  });

  describe('getPlayer', () => {
    test('should retrieve existing player', () => {
      const registered = registerPlayer(gameState, 'FindMe');
      const playerId = registered.id;

      const player = getPlayer(gameState, playerId);

      expect(player.name).toBe('FindMe');
    });

    test('should fail for non-existent player', () => {
      expect(() => getPlayer(gameState, 'non-existent-id')).toThrow('Player not found');
    });
  });

  describe('buyCredits', () => {
    test('should add credits to player balance', () => {
      const registered = registerPlayer(gameState, 'Buyer');
      const playerId = registered.id;

      const player = buyCredits(gameState, playerId, 500);

      expect(player.credits).toBe(500);
    });

    test('should handle multiple purchases', () => {
      const registered = registerPlayer(gameState, 'MultiPurchase');
      const playerId = registered.id;

      buyCredits(gameState, playerId, 100);
      const player = buyCredits(gameState, playerId, 200);

      expect(player.credits).toBe(300);
    });

    test('should reject negative amounts', () => {
      const registered = registerPlayer(gameState, 'NegativeTest');
      const playerId = registered.id;

      expect(() => buyCredits(gameState, playerId, -50)).toThrow();
    });

    test('should reject zero amount', () => {
      const registered = registerPlayer(gameState, 'ZeroTest');
      const playerId = registered.id;

      expect(() => buyCredits(gameState, playerId, 0)).toThrow();
    });
  });

  describe('getAllPlayers', () => {
    test('should return all registered players', () => {
      registerPlayer(gameState, 'Player1');
      registerPlayer(gameState, 'Player2');
      registerPlayer(gameState, 'Player3');

      const players = getAllPlayers(gameState);

      expect(players).toHaveLength(3);
    });

    test('should return empty array when no players', () => {
      const players = getAllPlayers(gameState);

      expect(players).toHaveLength(0);
    });

    test('should include player details', () => {
      const registered = registerPlayer(gameState, 'DetailPlayer');
      buyCredits(gameState, registered.id, 1000);

      const players = getAllPlayers(gameState);

      expect(players[0].name).toBe('DetailPlayer');
      expect(players[0].credits).toBe(1000);
    });
  });
});
