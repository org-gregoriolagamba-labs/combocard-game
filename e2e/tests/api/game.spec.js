/**
 * Game API Tests
 * 
 * Complete E2E tests for game lifecycle.
 * @tags @api @game
 */

import { test, expect } from '@playwright/test';

const API_URL = process.env.E2E_API_URL || 'http://localhost:3001';

test.describe('Game Creation and Lobby', () => {
  let player1, player2;

  test.beforeEach(async ({ request }) => {
    // Register two players
    const res1 = await request.post(`${API_URL}/api/players/register`, {
      data: { playerName: `Creator${Date.now()}` },
    });
    const res2 = await request.post(`${API_URL}/api/players/register`, {
      data: { playerName: `Joiner${Date.now()}` },
    });
    
    player1 = (await res1.json()).data.player;
    player2 = (await res2.json()).data.player;
    
    // Buy credits for both
    await request.post(`${API_URL}/api/players/${player1.id}/buy-credits`, {
      data: { amount: 1000 },
    });
    await request.post(`${API_URL}/api/players/${player2.id}/buy-credits`, {
      data: { amount: 1000 },
    });
  });

  test('should create a game with custom required credits', async ({ request }) => {
    const response = await request.post(`${API_URL}/api/games`, {
      data: {
        playerId: player1.id,
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
      data: {
        playerId: player1.id,
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
    const lobbyRes = await request.get(`${API_URL}/api/games/lobby`);
    const lobby = (await lobbyRes.json()).data;
    expect(lobby.find(g => g.id === game.id)).toBeUndefined();
  });

  test('should join a game successfully', async ({ request }) => {
    // Create game
    const createRes = await request.post(`${API_URL}/api/games`, {
      data: { playerId: player1.id, requiredCredits: 100, maxPlayers: 4 },
    });
    const gameId = (await createRes.json()).data.gameId;
    
    // Creator joins first
    await request.post(`${API_URL}/api/games/${gameId}/join`, {
      data: { playerId: player1.id },
    });
    
    // Second player joins
    const joinRes = await request.post(`${API_URL}/api/games/${gameId}/join`, {
      data: { playerId: player2.id },
    });
    
    expect(joinRes.ok()).toBe(true);
    
    // Check both players are in game
    const gameRes = await request.get(`${API_URL}/api/games/${gameId}`);    const game = (await gameRes.json()).data;
    
    expect(game.players.length).toBe(2);
    expect(game.players.some(p => p.id === player1.id)).toBe(true);
    expect(game.players.some(p => p.id === player2.id)).toBe(true);
  });

  test('should show game in lobby with correct player count', async ({ request }) => {
    // Create game
    const createRes = await request.post(`${API_URL}/api/games`, {
      data: { playerId: player1.id, requiredCredits: 100, maxPlayers: 4 },
    });
    const gameId = (await createRes.json()).data.gameId;
    
    // Both players join
    await request.post(`${API_URL}/api/games/${gameId}/join`, {
      data: { playerId: player1.id },
    });
    await request.post(`${API_URL}/api/games/${gameId}/join`, {
      data: { playerId: player2.id },
    });
    
    // Check lobby shows correct data
    const lobbyRes = await request.get(`${API_URL}/api/games/lobby`);
    const lobby = (await lobbyRes.json()).data;
    const gameInLobby = lobby.find(g => g.id === gameId);
    
    expect(gameInLobby).toBeDefined();
    expect(gameInLobby.playerCount).toBe(2);
    expect(gameInLobby.maxPlayers).toBe(4);
  });

  test('should reject creation with insufficient credits', async ({ request }) => {
    // Try to create game with credits player doesn't have
    const createRes = await request.post(`${API_URL}/api/games`, {
      data: { playerId: player1.id, requiredCredits: 5000, maxPlayers: 4 },
    });
    
    // Creation should fail due to insufficient credits
    expect(createRes.ok()).toBe(false);
    expect(createRes.status()).toBe(400);
  });

  test('should reject join to non-existent game', async ({ request }) => {
    const response = await request.post(`${API_URL}/api/games/nonexistent123/join`, {
      data: {
        playerId: player1.id,
      },
    });
    
    expect(response.ok()).toBe(false);
  });
});

test.describe('Game Lobby Visibility', () => {
  test('should only show public games in lobby', async ({ request }) => {
    // Register creator
    const creatorRes = await request.post(`${API_URL}/api/players/register`, {
      data: { playerName: `LobbyCreator${Date.now()}` },
    });
    const creator = (await creatorRes.json()).data.player;
    
    await request.post(`${API_URL}/api/players/${creator.id}/buy-credits`, {
      data: { amount: 1000 },
    });
    
    // Create public game
    const publicRes = await request.post(`${API_URL}/api/games`, {
      data: {
        playerId: creator.id,
        requiredCredits: 100,
        isPrivate: false,
      },
    });
    const publicGameId = (await publicRes.json()).data.gameId;
    
    // Create private game
    const privateRes = await request.post(`${API_URL}/api/games`, {
      data: {
        playerId: creator.id,
        requiredCredits: 100,
        isPrivate: true,
      },
    });
    const privateGameId = (await privateRes.json()).data.gameId;
    
    // Check lobby
    const lobbyRes = await request.get(`${API_URL}/api/games/lobby`);
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
    const res = await request.post(`${API_URL}/api/players/register`, {
      data: { playerName: `CollectionPlayer${Date.now()}` },
    });
    player1 = (await res.json()).data.player;
    
    // Buy credits
    await request.post(`${API_URL}/api/players/${player1.id}/buy-credits`, {
      data: { amount: 1000 },
    });
    
    // Create game
    const createRes = await request.post(`${API_URL}/api/games`, {
      data: { playerId: player1.id, requiredCredits: 100, maxPlayers: 4 },
    });
    gameId = (await createRes.json()).data.gameId;
  });

  test('should initialize collections on game creation', async ({ request }) => {
    const gameRes = await request.get(`${API_URL}/api/games/${gameId}`);
    const game = (await gameRes.json()).data;
    
    expect(game.collezioni).toBeDefined();
    expect(game.collezioni.tris).toBeDefined();
    expect(game.collezioni.sequenza).toBeDefined();
    expect(game.collezioni.scopa).toBeDefined();
    expect(game.collezioni.napola).toBeDefined();
    expect(game.collezioni.combocard_reale).toBeDefined();
  });

  test('should track montepremi (prize pool)', async ({ request }) => {
    const gameRes = await request.get(`${API_URL}/api/games/${gameId}`);
    const game = (await gameRes.json()).data;
    
    expect(game.montepremi).toBeDefined();
    expect(typeof game.montepremi).toBe('number');
  });
});
