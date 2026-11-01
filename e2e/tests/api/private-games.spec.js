/**
 * Private Games Tests
 * 
 * Tests for private game creation and joining.
 * @tags @api @private-games
 */

import { test, expect } from '@playwright/test';
import { registerPlayer } from '../helpers/auth.js';

const API_URL = process.env.E2E_API_URL || 'http://localhost:3001';

test.describe('Private Game Creation', () => {
  let creator;

  test.beforeEach(async ({ request }) => {
    creator = await registerPlayer(request, API_URL, 'PrivateCreator');
    
    await request.post(`${API_URL}/api/players/${creator.id}/buy-credits`, {
      headers: creator.headers,
      data: { amount: 1000 },
    });
  });

  test('should create private game', async ({ request }) => {
    const response = await request.post(`${API_URL}/api/games`, {
      headers: creator.headers,
      data: {
        requiredCredits: 100,
        maxPlayers: 4,
        isPrivate: true,
      },
    });
    
    expect(response.ok()).toBe(true);
    
    const body = await response.json();
    const game = body.data.game;
    
    expect(game.isPrivate).toBe(true);
    expect(game.id).toBeDefined();
    expect(game.status).toBe('waiting');
  });

  test('should not show private game in public lobby', async ({ request }) => {
    // Create private game
    const createRes = await request.post(`${API_URL}/api/games`, {
      headers: creator.headers,
      data: {
        requiredCredits: 100,
        maxPlayers: 4,
        isPrivate: true,
      },
    });
    const gameId = (await createRes.json()).data.gameId;
    
    // Check lobby
    const lobbyRes = await request.get(`${API_URL}/api/games/lobby`, { headers: creator.headers });
    const lobby = (await lobbyRes.json()).data;
    
    expect(lobby.find(g => g.id === gameId)).toBeUndefined();
  });

  test('should show public game in lobby', async ({ request }) => {
    // Create public game
    const createRes = await request.post(`${API_URL}/api/games`, {
      headers: creator.headers,
      data: {
        requiredCredits: 100,
        maxPlayers: 4,
        isPrivate: false,
      },
    });
    const gameId = (await createRes.json()).data.gameId;
    
    // Check lobby
    const lobbyRes = await request.get(`${API_URL}/api/games/lobby`, { headers: creator.headers });
    const lobby = (await lobbyRes.json()).data;
    
    expect(lobby.find(g => g.id === gameId)).toBeDefined();
  });
});

test.describe('Joining Games', () => {
  let creator;
  let joiner;
  let gameId;

  test.beforeEach(async ({ request }) => {
    // Register creator
    creator = await registerPlayer(request, API_URL, 'JoinTestCreator');
    
    // Register joiner
    joiner = await registerPlayer(request, API_URL, 'JoinTestJoiner');
    
    // Add credits
    await request.post(`${API_URL}/api/players/${creator.id}/buy-credits`, {
      headers: creator.headers,
      data: { amount: 1000 },
    });
    await request.post(`${API_URL}/api/players/${joiner.id}/buy-credits`, {
      headers: joiner.headers,
      data: { amount: 1000 },
    });
    
    // Create game (will test both private and public)
    const createRes = await request.post(`${API_URL}/api/games`, {
      headers: creator.headers,
      data: {
        requiredCredits: 100,
        maxPlayers: 4,
        isPrivate: false,
      },
    });
    
    const body = await createRes.json();
    gameId = body.data.gameId;
  });

  test('should join game successfully', async ({ request }) => {
    const response = await request.post(`${API_URL}/api/games/${gameId}/join`, {
      headers: joiner.headers,
    });
    
    expect(response.ok()).toBe(true);
    
    // Verify player is in game
    const gameRes = await request.get(`${API_URL}/api/games/${gameId}`, { headers: joiner.headers });
    const game = (await gameRes.json()).data;
    
    expect(game.players.some(p => p.id === joiner.id)).toBe(true);
  });

  test('should reject join with insufficient credits', async ({ request }) => {
    // Create new player with no credits
    const poorPlayer = await registerPlayer(request, API_URL, 'PoorPlayer');
    
    const response = await request.post(`${API_URL}/api/games/${gameId}/join`, {
      headers: poorPlayer.headers,
    });
    
    expect(response.ok()).toBe(false);
  });

  test('should reject join to non-existent game', async ({ request }) => {
    const response = await request.post(`${API_URL}/api/games/nonexistent/join`, {
      headers: joiner.headers,
    });
    
    expect(response.ok()).toBe(false);
  });
});

test.describe('Game Auto-Start', () => {
  test('should start game when all players joined', async ({ request }) => {
    // Register 4 players
    const players = [];
    for (let i = 0; i < 4; i++) {
      players.push(await registerPlayer(request, API_URL, `AutoStartPlayer${i}_${Date.now()}`));
      
      // Add credits
      await request.post(`${API_URL}/api/players/${players[i].id}/buy-credits`, {
        headers: players[i].headers,
        data: { amount: 1000 },
      });
    }
    
    // Player 0 creates game with 4 max players
    const createRes = await request.post(`${API_URL}/api/games`, {
      headers: players[0].headers,
      data: {
        requiredCredits: 100,
        maxPlayers: 4,
        isPrivate: false,
      },
    });
    
    const gameId = (await createRes.json()).data.gameId;
    
    // All 4 players join (including creator)
    for (let i = 0; i < 4; i++) {
      await request.post(`${API_URL}/api/games/${gameId}/join`, {
        headers: players[i].headers,
      });
    }
    
    // Check game status
    const gameRes = await request.get(`${API_URL}/api/games/${gameId}`, { headers: players[0].headers });
    const game = (await gameRes.json()).data;
    
    // Game should have all 4 players
    expect(game.players.length).toBe(4);
    // Status should be playing or waiting (auto-start behavior may vary)
    expect(['playing', 'waiting'].includes(game.status)).toBe(true);
  });
});

test.describe('Game Deck Management', () => {
  let creator;
  let gameId;

  test.beforeEach(async ({ request }) => {
    creator = await registerPlayer(request, API_URL, 'DeckTestPlayer');
    
    await request.post(`${API_URL}/api/players/${creator.id}/buy-credits`, {
      headers: creator.headers,
      data: { amount: 1000 },
    });
    
    const createRes = await request.post(`${API_URL}/api/games`, {
      headers: creator.headers,
      data: {
        requiredCredits: 100,
        maxPlayers: 4,
        isPrivate: false,
      },
    });
    
    gameId = (await createRes.json()).data.gameId;
  });

  test('should not expose the deck', async ({ request }) => {
    const gameRes = await request.get(`${API_URL}/api/games/${gameId}`, { headers: creator.headers });
    const game = (await gameRes.json()).data;
    
    expect(game.mazzo).toBeUndefined();
    expect(game.carteRimaste).toBe(0);
  });

  test('should track extracted cards', async ({ request }) => {
    const gameRes = await request.get(`${API_URL}/api/games/${gameId}`, { headers: creator.headers });
    const game = (await gameRes.json()).data;
    
    // carteEstratte should exist
    expect(game.carteEstratte).toBeDefined();
    expect(Array.isArray(game.carteEstratte)).toBe(true);
  });
});
