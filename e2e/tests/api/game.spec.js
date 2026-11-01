/**
 * Game API Tests
 * 
 * Complete E2E tests for game lifecycle.
 * @tags @api @game
 */

import { test, expect } from '@playwright/test';
import { registerPlayer } from '../helpers/auth.js';

const API_URL = process.env.E2E_API_URL || 'http://localhost:3001';

test.describe('Game Creation and Lobby', () => {
  let player1, player2;

  test.beforeEach(async ({ request }) => {
    // Register two players
    
    player1 = await registerPlayer(request, API_URL, `Creator${Date.now()}`);
    player2 = await registerPlayer(request, API_URL, `Joiner${Date.now()}`);
    
    // Buy credits for both
    await request.post(`${API_URL}/api/players/${player1.id}/buy-credits`, {
      headers: player1.headers,
      data: { amount: 1000 },
    });
    await request.post(`${API_URL}/api/players/${player2.id}/buy-credits`, {
      headers: player2.headers,
      data: { amount: 1000 },
    });
  });

  test('should create a game with custom required credits', async ({ request }) => {
    const response = await request.post(`${API_URL}/api/games`, {
      headers: player1.headers,
      data: {
        requiredCredits: 50,
        maxPlayers: 4,
      },
    });
    
    expect(response.ok()).toBe(true);
    
    const body = await response.json();
    const game = body.data.game;
    expect(game.requiredCredits).toBe(50);
    expect(game.maxPlayers).toBe(4);
    expect(game.status).toBe('waiting');
  });

  test('should create a private game', async ({ request }) => {
    const response = await request.post(`${API_URL}/api/games`, {
      headers: player1.headers,
      data: {
        requiredCredits: 100,
        isPrivate: true,
        maxPlayers: 3,
      },
    });
    
    expect(response.ok()).toBe(true);
    
    const body = await response.json();
    const game = body.data.game;
    expect(game.isPrivate).toBe(true);
    
    // Private games should not appear in lobby
    const lobbyRes = await request.get(`${API_URL}/api/games/lobby`, { headers: player1.headers });
    const lobby = (await lobbyRes.json()).data;
    expect(lobby.find(g => g.id === game.id)).toBeUndefined();
  });

  test('should join a game successfully', async ({ request }) => {
    // Create game
    const createRes = await request.post(`${API_URL}/api/games`, {
      headers: player1.headers,
      data: { requiredCredits: 100, maxPlayers: 4 },
    });
    const gameId = (await createRes.json()).data.gameId;
    
    // Creator joins first
    await request.post(`${API_URL}/api/games/${gameId}/join`, {
      headers: player1.headers,
    });
    
    // Second player joins
    const joinRes = await request.post(`${API_URL}/api/games/${gameId}/join`, {
      headers: player2.headers,
    });
    
    expect(joinRes.ok()).toBe(true);
    
    // Check both players are in game
    const gameRes = await request.get(`${API_URL}/api/games/${gameId}`, { headers: player2.headers });    const game = (await gameRes.json()).data;
    
    expect(game.players.length).toBe(2);
    expect(game.players.some(p => p.id === player1.id)).toBe(true);
    expect(game.players.some(p => p.id === player2.id)).toBe(true);
  });

  test('should show game in lobby with correct player count', async ({ request }) => {
    // Create game
    const createRes = await request.post(`${API_URL}/api/games`, {
      headers: player1.headers,
      data: { requiredCredits: 100, maxPlayers: 4 },
    });
    const gameId = (await createRes.json()).data.gameId;
    
    // Both players join
    await request.post(`${API_URL}/api/games/${gameId}/join`, {
      headers: player1.headers,
    });
    await request.post(`${API_URL}/api/games/${gameId}/join`, {
      headers: player2.headers,
    });
    
    // Check lobby shows correct data
    const lobbyRes = await request.get(`${API_URL}/api/games/lobby`, { headers: player2.headers });
    const lobby = (await lobbyRes.json()).data;
    const gameInLobby = lobby.find(g => g.id === gameId);
    
    expect(gameInLobby).toBeDefined();
    expect(gameInLobby.playerCount).toBe(2);
    expect(gameInLobby.maxPlayers).toBe(4);
  });

  test('should reject creation with insufficient credits', async ({ request }) => {
    // Try to create game with credits player doesn't have
    const createRes = await request.post(`${API_URL}/api/games`, {
      headers: player1.headers,
      data: { requiredCredits: 5000, maxPlayers: 4 },
    });
    
    // Creation should fail due to insufficient credits
    expect(createRes.ok()).toBe(false);
    expect(createRes.status()).toBe(400);
  });

  test('should reject join to non-existent game', async ({ request }) => {
    const response = await request.post(`${API_URL}/api/games/nonexistent123/join`, {
      headers: player1.headers,
    });
    
    expect(response.ok()).toBe(false);
  });
});

test.describe('Game Lobby Visibility', () => {
  test('should only show public games in lobby', async ({ request }) => {
    // Register creator
    const creator = await registerPlayer(request, API_URL, `LobbyCreator${Date.now()}`);
    
    await request.post(`${API_URL}/api/players/${creator.id}/buy-credits`, {
      headers: creator.headers,
      data: { amount: 1000 },
    });
    
    // Create public game
    const publicRes = await request.post(`${API_URL}/api/games`, {
      headers: creator.headers,
      data: {
        requiredCredits: 100,
        isPrivate: false,
      },
    });
    const publicGameId = (await publicRes.json()).data.gameId;
    
    // Create private game
    const privateRes = await request.post(`${API_URL}/api/games`, {
      headers: creator.headers,
      data: {
        requiredCredits: 100,
        isPrivate: true,
      },
    });
    const privateGameId = (await privateRes.json()).data.gameId;
    
    // Check lobby
    const lobbyRes = await request.get(`${API_URL}/api/games/lobby`, { headers: creator.headers });
    const lobby = (await lobbyRes.json()).data;
    
    // Public game should be in lobby
    expect(lobby.some(g => g.id === publicGameId)).toBe(true);
    
    // Private game should NOT be in lobby
    expect(lobby.some(g => g.id === privateGameId)).toBe(false);
  });
});

test.describe('Game Collection System', () => {
  let player1;
  let gameId;

  test.beforeEach(async ({ request }) => {
    // Register player
    player1 = await registerPlayer(request, API_URL, `CollectionPlayer${Date.now()}`);
    
    // Buy credits
    await request.post(`${API_URL}/api/players/${player1.id}/buy-credits`, {
      headers: player1.headers,
      data: { amount: 1000 },
    });
    
    // Create game
    const createRes = await request.post(`${API_URL}/api/games`, {
      headers: player1.headers,
      data: { requiredCredits: 100, maxPlayers: 4 },
    });
    gameId = (await createRes.json()).data.gameId;
  });

  test('should initialize collections on game creation', async ({ request }) => {
    const gameRes = await request.get(`${API_URL}/api/games/${gameId}`, { headers: player1.headers });
    const game = (await gameRes.json()).data;
    
    expect(game.collezioni).toBeDefined();
    expect(game.collezioni.tris).toBeDefined();
    expect(game.collezioni.sequenza).toBeDefined();
    expect(game.collezioni.scopa).toBeDefined();
    expect(game.collezioni.napola).toBeDefined();
    expect(game.collezioni.combocard_reale).toBeDefined();
  });

  test('should track montepremi (prize pool)', async ({ request }) => {
    const gameRes = await request.get(`${API_URL}/api/games/${gameId}`, { headers: player1.headers });
    const game = (await gameRes.json()).data;
    
    expect(game.montepremi).toBeDefined();
    expect(typeof game.montepremi).toBe('number');
  });
});
