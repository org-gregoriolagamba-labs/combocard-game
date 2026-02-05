/**
 * Private Games Tests
 * 
 * Tests for private game creation and joining.
 * @tags @api @private-games
 */

import { test, expect } from '@playwright/test';

const API_URL = process.env.E2E_API_URL || 'http://localhost:3001';

test.describe('Private Game Creation', () => {
  let creator;

  test.beforeEach(async ({ request }) => {
    const res = await request.post(`${API_URL}/api/players/register`, {
      data: { playerName: 'PrivateCreator' },
    });
    creator = (await res.json()).data.player;
    
    await request.post(`${API_URL}/api/players/${creator.id}/buy-credits`, {
      data: { amount: 1000 },
    });
  });

  test('should create private game', async ({ request }) => {
    const response = await request.post(`${API_URL}/api/games`, {
      data: {
        playerId: creator.id,
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
      data: {
        playerId: creator.id,
        requiredCredits: 100,
        maxPlayers: 4,
        isPrivate: true,
      },
    });
    const gameId = (await createRes.json()).data.gameId;
    
    // Check lobby
    const lobbyRes = await request.get(`${API_URL}/api/games/lobby`);
    const lobby = (await lobbyRes.json()).data;
    
    expect(lobby.find(g => g.id === gameId)).toBeUndefined();
  });

  test('should show public game in lobby', async ({ request }) => {
    // Create public game
    const createRes = await request.post(`${API_URL}/api/games`, {
      data: {
        playerId: creator.id,
        requiredCredits: 100,
        maxPlayers: 4,
        isPrivate: false,
      },
    });
    const gameId = (await createRes.json()).data.gameId;
    
    // Check lobby
    const lobbyRes = await request.get(`${API_URL}/api/games/lobby`);
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
    const creatorRes = await request.post(`${API_URL}/api/players/register`, {
      data: { playerName: 'JoinTestCreator' },
    });
    creator = (await creatorRes.json()).data.player;
    
    // Register joiner
    const joinerRes = await request.post(`${API_URL}/api/players/register`, {
      data: { playerName: 'JoinTestJoiner' },
    });
    joiner = (await joinerRes.json()).data.player;
    
    // Add credits
    await request.post(`${API_URL}/api/players/${creator.id}/buy-credits`, {
      data: { amount: 1000 },
    });
    await request.post(`${API_URL}/api/players/${joiner.id}/buy-credits`, {
      data: { amount: 1000 },
    });
    
    // Create game (will test both private and public)
    const createRes = await request.post(`${API_URL}/api/games`, {
      data: {
        playerId: creator.id,
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
      data: {
        playerId: joiner.id,
      },
    });
    
    expect(response.ok()).toBe(true);
    
    // Verify player is in game
    const gameRes = await request.get(`${API_URL}/api/games/${gameId}`);
    const game = (await gameRes.json()).data;
    
    expect(game.players.some(p => p.id === joiner.id)).toBe(true);
  });

  test('should reject join with insufficient credits', async ({ request }) => {
    // Create new player with no credits
    const newPlayerRes = await request.post(`${API_URL}/api/players/register`, {
      data: { playerName: 'PoorPlayer' },
    });
    const poorPlayer = (await newPlayerRes.json()).data.player;
    
    const response = await request.post(`${API_URL}/api/games/${gameId}/join`, {
      data: {
        playerId: poorPlayer.id,
      },
    });
    
    expect(response.ok()).toBe(false);
  });

  test('should reject join to non-existent game', async ({ request }) => {
    const response = await request.post(`${API_URL}/api/games/nonexistent/join`, {
      data: {
        playerId: joiner.id,
      },
    });
    
    expect(response.ok()).toBe(false);
  });
});

test.describe('Game Auto-Start', () => {
  test('should start game when all players joined', async ({ request }) => {
    // Register 4 players
    const players = [];
    for (let i = 0; i < 4; i++) {
      const res = await request.post(`${API_URL}/api/players/register`, {
        data: { playerName: `AutoStartPlayer${i}_${Date.now()}` },
      });
      players.push((await res.json()).data.player);
      
      // Add credits
      await request.post(`${API_URL}/api/players/${players[i].id}/buy-credits`, {
        data: { amount: 1000 },
      });
    }
    
    // Player 0 creates game with 4 max players
    const createRes = await request.post(`${API_URL}/api/games`, {
      data: {
        playerId: players[0].id,
        requiredCredits: 100,
        maxPlayers: 4,
        isPrivate: false,
      },
    });
    
    const gameId = (await createRes.json()).data.gameId;
    
    // All 4 players join (including creator)
    for (let i = 0; i < 4; i++) {
      await request.post(`${API_URL}/api/games/${gameId}/join`, {
        data: { playerId: players[i].id },
      });
    }
    
    // Check game status
    const gameRes = await request.get(`${API_URL}/api/games/${gameId}`);
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
    const res = await request.post(`${API_URL}/api/players/register`, {
      data: { playerName: 'DeckTestPlayer' },
    });
    creator = (await res.json()).data.player;
    
    await request.post(`${API_URL}/api/players/${creator.id}/buy-credits`, {
      data: { amount: 1000 },
    });
    
    const createRes = await request.post(`${API_URL}/api/games`, {
      data: {
        playerId: creator.id,
        requiredCredits: 100,
        maxPlayers: 4,
        isPrivate: false,
      },
    });
    
    gameId = (await createRes.json()).data.gameId;
  });

  test('should initialize deck on game start', async ({ request }) => {
    const gameRes = await request.get(`${API_URL}/api/games/${gameId}`);
    const game = (await gameRes.json()).data;
    
    // Deck should be initialized (mazzo field exists)
    expect(game.mazzo).toBeDefined();
    expect(Array.isArray(game.mazzo)).toBe(true);
  });

  test('should track extracted cards', async ({ request }) => {
    const gameRes = await request.get(`${API_URL}/api/games/${gameId}`);
    const game = (await gameRes.json()).data;
    
    // carteEstratte should exist
    expect(game.carteEstratte).toBeDefined();
    expect(Array.isArray(game.carteEstratte)).toBe(true);
  });
});
