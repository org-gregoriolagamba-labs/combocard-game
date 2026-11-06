/**
 * Admin area: games and statistics
 *
 * The admin sees the games with their metadata only, cancels one that is stuck (the players still in
 * it get the entry fee back) and reads the numbers of the platform. Needs a server on PostgreSQL
 * (E2E_DATABASE_URL): with the in-memory server nobody can be made admin.
 * @tags @api @admin
 */

import { test, expect } from '@playwright/test';
import { registerPlayer } from '../helpers/auth.js';
import { E2E_DATABASE_URL, registerAdmin } from '../helpers/admin.js';

const API_URL = process.env.E2E_API_URL || 'http://localhost:3001';

test.skip(!E2E_DATABASE_URL, 'needs a server on PostgreSQL: set E2E_DATABASE_URL');

const credits = async (request, player) =>
  (await (await request.get(`${API_URL}/api/players/${player.id}`, { headers: player.headers })).json()).data.credits;

async function startedGame(request) {
  const creator = await registerPlayer(request, API_URL, 'Creatore');
  const guest = await registerPlayer(request, API_URL, 'Ospite');
  for (const player of [creator, guest]) {
    await request.post(`${API_URL}/api/players/${player.id}/buy-credits`, { headers: player.headers, data: { amount: 500 } });
  }
  const created = await request.post(`${API_URL}/api/games`, { headers: creator.headers, data: { requiredCredits: 100, maxPlayers: 4 } });
  const { gameId } = (await created.json()).data;
  for (const player of [creator, guest]) {
    await request.post(`${API_URL}/api/games/${gameId}/join`, { headers: player.headers });
  }
  await request.post(`${API_URL}/api/games/${gameId}/start`, { headers: creator.headers });
  return { gameId, creator, guest };
}

test.describe('Admin area: games and statistics @admin', () => {
  test('a player gets 403 on the games routes', async ({ request }) => {
    const player = await registerPlayer(request, API_URL, 'Giocatore');

    for (const [method, url] of [['get', '/api/admin/games'], ['post', '/api/admin/games/x/cancel'], ['get', '/api/admin/stats']]) {
      const response = await request[method](`${API_URL}${url}`, { headers: player.headers, data: { reason: 'x' } });
      expect(response.status(), `${method} ${url}`).toBe(403);
    }
  });

  test('the list has metadata only: no deck, no grids, no balances', async ({ request }) => {
    const admin = await registerAdmin(request, API_URL);
    const { gameId, creator } = await startedGame(request);

    // The list is the oldest first and in pages: on a database shared by many tests the game is on a later page
    let game;
    for (let page = 1; !game && page <= 50; page += 1) {
      const response = await request.get(`${API_URL}/api/admin/games?status=playing&limit=100&page=${page}`, { headers: admin.headers });
      expect(response.status()).toBe(200);
      const { items } = (await response.json()).data;
      game = items.find((g) => g.id === gameId);
      if (items.length === 0) break;
    }

    expect(game).toMatchObject({ status: 'playing', requiredCredits: 100, montepremi: 200 });
    expect(game.players.map((p) => p.id)).toContain(creator.id);
    expect(JSON.stringify(game)).not.toMatch(/mazzo|cartella|coperte|carteEstratte|gettoni|credits/);
  });

  test('cancelling a game in progress refunds the players, frees them and is in the audit log', async ({ request }) => {
    const admin = await registerAdmin(request, API_URL);
    const { gameId, creator, guest } = await startedGame(request);
    expect(await credits(request, creator)).toBe(400);

    const noReason = await request.post(`${API_URL}/api/admin/games/${gameId}/cancel`, { headers: admin.headers, data: {} });
    expect(noReason.status()).toBe(400);

    const response = await request.post(`${API_URL}/api/admin/games/${gameId}/cancel`, { headers: admin.headers, data: { reason: 'bloccata' } });
    expect(response.status()).toBe(200);
    expect((await response.json()).data).toMatchObject({ gameId, previousStatus: 'playing' });

    expect(await credits(request, creator)).toBe(500);
    expect(await credits(request, guest)).toBe(500);
    expect((await request.get(`${API_URL}/api/games/${gameId}`, { headers: creator.headers })).status()).toBe(404);
    const again = await request.post(`${API_URL}/api/admin/games/${gameId}/cancel`, { headers: admin.headers, data: { reason: 'bloccata' } });
    expect(again.status()).toBe(404);
    const audit = await (await request.get(`${API_URL}/api/admin/audit?targetId=${gameId}`, { headers: admin.headers })).json();
    expect(audit.data.items[0]).toMatchObject({ action: 'game_cancelled', actorId: admin.id, details: { reason: 'bloccata' } });

    // The players are free: they can create a new game
    const next = await request.post(`${API_URL}/api/games`, { headers: creator.headers, data: { requiredCredits: 100, maxPlayers: 4 } });
    expect(next.status()).toBe(201);
  });

  test('the statistics have numbers and no names', async ({ request }) => {
    const admin = await registerAdmin(request, API_URL);
    const { creator } = await startedGame(request);

    const response = await request.get(`${API_URL}/api/admin/stats`, { headers: admin.headers });

    expect(response.status()).toBe(200);
    const stats = (await response.json()).data;
    expect(stats.users.registered).toBeGreaterThanOrEqual(3);
    expect(stats.users.admins).toBeGreaterThanOrEqual(1);
    expect(stats.games.playing).toBeGreaterThanOrEqual(1);
    expect(stats.credits.inPlay).toBeGreaterThanOrEqual(200);
    expect(JSON.stringify(stats)).not.toContain(creator.name);
  });
});
