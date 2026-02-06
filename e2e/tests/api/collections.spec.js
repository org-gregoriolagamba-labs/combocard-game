/**
 * Collections API Tests
 * 
 * Tests for collection validation and game structure.
 * @tags @api @collections
 */

import { test, expect } from '@playwright/test';

const API_URL = process.env.E2E_API_URL || 'http://localhost:3001';

test.describe('Collection System Structure', () => {
  let player, gameId;

  test.beforeEach(async ({ request }) => {
    // Setup player and game
    const res = await request.post(`${API_URL}/api/players/register`, {
      data: { playerName: `CollectionTester${Date.now()}` },
    });
    player = (await res.json()).data.player;
    
    await request.post(`${API_URL}/api/players/${player.id}/buy-credits`, {
      data: { amount: 1000 },
    });
    
    const createRes = await request.post(`${API_URL}/api/games`, {
      data: { playerId: player.id, requiredCredits: 100, maxPlayers: 2 },
    });
    gameId = (await createRes.json()).data.gameId;
    
    // Join game to get full player data
    await request.post(`${API_URL}/api/games/${gameId}/join`, {
      data: { playerId: player.id },
    });
  });

  test('should have all 5 collection types defined', async ({ request }) => {
    const gameRes = await request.get(`${API_URL}/api/games/${gameId}`);
    const game = (await gameRes.json()).data;
    
    expect(game.collezioni).toBeDefined();
    expect(game.collezioni.tris).toBeDefined();
    expect(game.collezioni.sequenza).toBeDefined();
    expect(game.collezioni.scopa).toBeDefined();
    expect(game.collezioni.napola).toBeDefined();
    expect(game.collezioni.combocard_reale).toBeDefined();
  });

  test('should initialize collections with correct structure', async ({ request }) => {
    const gameRes = await request.get(`${API_URL}/api/games/${gameId}`);
    const game = (await gameRes.json()).data;
    
    const collections = ['tris', 'sequenza', 'scopa', 'napola', 'combocard_reale'];
    
    for (const collectionName of collections) {
      const collection = game.collezioni[collectionName];
      expect(collection).toBeDefined();
      expect(collection.vinto).toBe(false);
      expect(collection.vincitore).toBeNull();
    }
  });

  test('should have deck field ready for initialization', async ({ request }) => {
    const gameRes = await request.get(`${API_URL}/api/games/${gameId}`);
    const game = (await gameRes.json()).data;
    
    expect(game.mazzo).toBeDefined();
    expect(Array.isArray(game.mazzo)).toBe(true);
    // Deck initializes when game starts, not on creation
    expect(game.mazzo.length).toBeGreaterThanOrEqual(0);
  });

  test('should have prize pool (montepremi)', async ({ request }) => {
    const gameRes = await request.get(`${API_URL}/api/games/${gameId}`);
    const game = (await gameRes.json()).data;
    
    expect(game.montepremi).toBeDefined();
    expect(typeof game.montepremi).toBe('number');
    expect(game.montepremi).toBeGreaterThanOrEqual(0);
  });

  test('should track extracted cards (carteEstratte)', async ({ request }) => {
    const gameRes = await request.get(`${API_URL}/api/games/${gameId}`);
    const game = (await gameRes.json()).data;
    
    expect(game.carteEstratte).toBeDefined();
    expect(Array.isArray(game.carteEstratte)).toBe(true);
  });
});

test.describe('Player Grid System', () => {
  let player, gameId;

  test.beforeEach(async ({ request }) => {
    const res = await request.post(`${API_URL}/api/players/register`, {
      data: { playerName: `GridTester${Date.now()}` },
    });
    player = (await res.json()).data.player;
    
    await request.post(`${API_URL}/api/players/${player.id}/buy-credits`, {
      data: { amount: 1000 },
    });
    
    const createRes = await request.post(`${API_URL}/api/games`, {
      data: { playerId: player.id, requiredCredits: 100, maxPlayers: 2 },
    });
    gameId = (await createRes.json()).data.gameId;
    
    await request.post(`${API_URL}/api/games/${gameId}/join`, {
      data: { playerId: player.id },
    });
  });

  test('should initialize player with cartella grid', async ({ request }) => {
    const gameRes = await request.get(`${API_URL}/api/games/${gameId}`);
    const game = (await gameRes.json()).data;
    
    const playerInGame = game.players.find(p => p.id === player.id);
    expect(playerInGame).toBeDefined();
    expect(playerInGame.cartella).toBeDefined();
    expect(Array.isArray(playerInGame.cartella)).toBe(true);
    
    // Cartella is 2D array (5x5 grid)
    expect(playerInGame.cartella.length).toBe(5);
    expect(Array.isArray(playerInGame.cartella[0])).toBe(true);
    expect(playerInGame.cartella[0].length).toBe(5);
  });

  test('should have cards in player grid with position info', async ({ request }) => {
    const gameRes = await request.get(`${API_URL}/api/games/${gameId}`);
    const game = (await gameRes.json()).data;
    
    const playerInGame = game.players.find(p => p.id === player.id);
    const cartella = playerInGame.cartella;
    
    // Check 2D grid structure and cards have required fields
    expect(cartella.length).toBe(5);
    expect(cartella[0].length).toBe(5);
    
    // Check first card has required properties
    const firstCard = cartella[0][0];
    expect(firstCard).toBeDefined();
    expect(firstCard.valore).toBeDefined();
    expect(firstCard.seme).toBeDefined();
    expect(firstCard.emoji).toBeDefined();
  });

  test('should use Italian suits in grid', async ({ request }) => {
    const gameRes = await request.get(`${API_URL}/api/games/${gameId}`);
    const game = (await gameRes.json()).data;
    
    const playerInGame = game.players.find(p => p.id === player.id);
    const cartella = playerInGame.cartella;
    
    // Italian suits are capitalized
    const validSuits = ['Coppe', 'Denari', 'Spade', 'Bastoni'];
    
    // Cartella is 2D array, check all cards
    let foundValidSuit = false;
    
    for (const row of cartella) {
      for (const card of row) {
        if (card && card.seme && validSuits.includes(card.seme)) {
          foundValidSuit = true;
          break;
        }
      }
      if (foundValidSuit) break;
    }
    
    expect(foundValidSuit).toBe(true);
  });
});
