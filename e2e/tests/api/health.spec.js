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
    expect(body.status).toBe('ok');
  });

  test('should include timestamp in health response', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/health`);
    
    const body = await response.json();
    expect(body.timestamp).toBeDefined();
  });

  test('should include uptime in health response', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/health`);
    
    const body = await response.json();
    expect(body.uptime).toBeDefined();
    expect(typeof body.uptime).toBe('number');
  });
});

test.describe('Player API', () => {
  test('should register a new player', async ({ request }) => {
    const response = await request.post(`${API_URL}/api/players/register`, {
      data: { name: 'APITestPlayer' },
    });
    
    expect(response.ok()).toBe(true);
    
    const body = await response.json();
    expect(body.id).toBeDefined();
    expect(body.name).toBe('APITestPlayer');
    expect(body.credits).toBe(100);
  });

  test('should return error for missing name', async ({ request }) => {
    const response = await request.post(`${API_URL}/api/players/register`, {
      data: {},
    });
    
    expect(response.ok()).toBe(false);
    expect(response.status()).toBe(400);
  });

  test('should get player by id', async ({ request }) => {
    // First register a player
    const registerResponse = await request.post(`${API_URL}/api/players/register`, {
      data: { name: 'GetTestPlayer' },
    });
    const player = await registerResponse.json();

    // Then get the player
    const getResponse = await request.get(`${API_URL}/api/players/${player.id}`);
    
    expect(getResponse.ok()).toBe(true);
    
    const body = await getResponse.json();
    expect(body.id).toBe(player.id);
    expect(body.name).toBe('GetTestPlayer');
  });
});

test.describe('Game API', () => {
  test('should get lobby (list of games)', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/games/lobby`);
    
    expect(response.ok()).toBe(true);
    
    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test('should create a new game', async ({ request }) => {
    // First register a player
    const registerResponse = await request.post(`${API_URL}/api/players/register`, {
      data: { name: 'GameCreatorAPI' },
    });
    const player = await registerResponse.json();

    // Create a game
    const createResponse = await request.post(`${API_URL}/api/games`, {
      data: { playerId: player.id },
    });
    
    expect(createResponse.ok()).toBe(true);
    
    const game = await createResponse.json();
    expect(game.id).toBeDefined();
    expect(game.status).toBe('waiting');
    expect(game.players).toHaveLength(1);
  });
});
