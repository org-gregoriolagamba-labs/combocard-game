/**
 * API Health Tests
 * 
 * Tests for the backend API endpoints.
 * @tags @smoke @api
 */

import { test, expect } from '@playwright/test';
import { registerPlayer } from '../helpers/auth.js';

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
  test('should get your own player', async ({ request }) => {
    const player = await registerPlayer(request, API_URL, 'GetTest');

    const response = await request.get(`${API_URL}/api/players/${player.id}`, { headers: player.headers });

    expect(response.ok()).toBe(true);
    const data = (await response.json()).data;
    expect(data.id).toBe(player.id);
    expect(data.name).toBe(player.name);
    expect(data.credits).toBe(0);
  });
});

test.describe('Game API', () => {
  test('should get lobby (list of games)', async ({ request }) => {
    const player = await registerPlayer(request, API_URL, 'LobbyTest');

    const response = await request.get(`${API_URL}/api/games/lobby`, { headers: player.headers });

    expect(response.ok()).toBe(true);
    expect(Array.isArray((await response.json()).data)).toBe(true);
  });

  test('should create a new game', async ({ request }) => {
    const player = await registerPlayer(request, API_URL, 'Creator');

    const buyCredits = await request.post(`${API_URL}/api/players/${player.id}/buy-credits`, {
      headers: player.headers,
      data: { amount: 100 },
    });
    expect(buyCredits.ok()).toBe(true);

    const response = await request.post(`${API_URL}/api/games`, { headers: player.headers });

    expect(response.ok()).toBe(true);
    const game = (await response.json()).data.game;
    expect(game.id).toBeDefined();
    expect(game.status).toBe('waiting');
    expect(game.players).toHaveLength(0);
  });
});
