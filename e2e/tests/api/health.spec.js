/**
 * API Health Tests
 * 
 * Tests for the backend API endpoints.
 * @tags @smoke @api
 */

import { test, expect } from '@playwright/test';

const API_URL = process.env.E2E_API_URL || 'http://localhost:3001';

test.describe('API Health', () => {
  test('should return healthy status @smoke', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/health`);
    
    expect(response.ok()).toBe(true);
    
    const body = await response.json();
    expect(body.status).toBe('success');
  });

  test('should include timestamp in health response', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/health`);
    
    const body = await response.json();
    expect(body.data.timestamp).toBeDefined();
  });

  test('should include uptime in health response', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/health`);
    
    const body = await response.json();
    expect(body.data.uptime).toBeDefined();
    expect(typeof body.data.uptime).toBe('number');
  });
});

test.describe('Player API', () => {
  test('should register a new player', async ({ request }) => {
    const response = await request.post(`${API_URL}/api/players/register`, {
      headers: { 'Content-Type': 'application/json' },
      data: { playerName: 'APITestPlayer' },
    });
    
    if (!response.ok()) {
      const errorBody = await response.json().catch(() => ({}));
      console.error(`Player registration failed - Status: ${response.status()}`, errorBody);
    }
    
    expect(response.ok()).toBe(true);
    
    const body = await response.json();
    const player = body.data.player;
    expect(player.id).toBeDefined();
    expect(player.name).toBe('APITestPlayer');
    expect(player.credits).toBe(0);
  });

  test('should return error for missing name', async ({ request }) => {
    const response = await request.post(`${API_URL}/api/players/register`, {
      headers: { 'Content-Type': 'application/json' },
      data: {},
    });
    
    expect(response.ok()).toBe(false);
    expect(response.status()).toBe(400);
  });

  test('should get player by id', async ({ request }) => {
    // First register a player
    const registerResponse = await request.post(`${API_URL}/api/players/register`, {
      headers: { 'Content-Type': 'application/json' },
      data: { playerName: 'GetTestPlayer' },
    });
    
    expect(registerResponse.ok()).toBe(true);
    
    const registerBody = await registerResponse.json();
    const player = registerBody.data.player;
    
    // Validate player was registered with ID
    expect(player.id).toBeDefined();

    // Then get the player
    const getResponse = await request.get(`${API_URL}/api/players/${player.id}`);
    
    if (!getResponse.ok()) {
      const errorBody = await getResponse.json().catch(() => ({}));
      console.error(`Get player failed - Status: ${getResponse.status()}`, errorBody);
    }
    
    expect(getResponse.ok()).toBe(true);
    
    const body = await getResponse.json();
    const playerData = body.data;
    expect(playerData.id).toBe(player.id);
    expect(playerData.name).toBe('GetTestPlayer');
  });
});

test.describe('Game API', () => {
  test('should get lobby (list of games)', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/games/lobby`);
    
    expect(response.ok()).toBe(true);
    
    const body = await response.json();
    const games = body.data;
    expect(Array.isArray(games)).toBe(true);
  });

  test('should create a new game', async ({ request }) => {
    // First register a player
    const registerResponse = await request.post(`${API_URL}/api/players/register`, {
      headers: { 'Content-Type': 'application/json' },
      data: { playerName: 'GameCreatorAPI' },
    });
    
    expect(registerResponse.ok()).toBe(true);
    
    const registerBody = await registerResponse.json();
    const player = registerBody.data.player;
    
    // Validate player was registered with ID
    expect(player.id).toBeDefined();

    // Buy credits before creating a game
    const buyCreditsResponse = await request.post(`${API_URL}/api/players/${player.id}/buy-credits`, {
      headers: { 'Content-Type': 'application/json' },
      data: { amount: 100 },
    });
    
    expect(buyCreditsResponse.ok()).toBe(true);

    // Create a game
    const createResponse = await request.post(`${API_URL}/api/games`, {
      headers: { 'Content-Type': 'application/json' },
      data: { playerId: player.id },
    });
    
    if (!createResponse.ok()) {
      const errorBody = await createResponse.json().catch(() => ({}));
      if (process.env.E2E_DEBUG) {
        console.error(`Game creation failed - Status: ${createResponse.status()}`, errorBody);
      }
    }
    
    expect(createResponse.ok()).toBe(true);
    
    const gameBody = await createResponse.json();
    const game = gameBody.data.game;
    expect(game.id).toBeDefined();
    expect(game.status).toBe('waiting');
    // Note: Game creation and player joining are separate operations.
    // Games are created with an empty players array; players join via the /join endpoint.
    expect(game.players).toHaveLength(0);
  });
});
