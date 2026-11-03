/**
 * Rules confirmation
 *
 * A new player confirms that they read the rules. Until every player of a game has
 * confirmed, the game does not start.
 * @tags @api @rules
 */

import { test, expect } from '@playwright/test';
import { registerPlayer } from '../helpers/auth.js';

const API_URL = process.env.E2E_API_URL || 'http://localhost:3001';

async function fund(request, player) {
  await request.post(`${API_URL}/api/players/${player.id}/buy-credits`, {
    headers: player.headers,
    data: { amount: 500 },
  });
}

async function lobbyWith(request, creator, guest, maxPlayers = 4) {
  const created = await request.post(`${API_URL}/api/games`, {
    headers: creator.headers,
    data: { requiredCredits: 100, maxPlayers },
  });
  const { gameId } = (await created.json()).data;
  for (const player of [creator, guest]) {
    await request.post(`${API_URL}/api/games/${gameId}/join`, { headers: player.headers });
  }
  return gameId;
}

const gameOf = async (request, player, gameId) =>
  (await (await request.get(`${API_URL}/api/games/${gameId}`, { headers: player.headers })).json()).data;

test.describe('Rules confirmation @api', () => {
  test('a new account has not confirmed the rules, and confirming is saved', async ({ request }) => {
    const player = await registerPlayer(request, API_URL, 'Nuovo', { acceptRules: false });
    expect(player.regoleAccettateIl).toBeNull();

    const response = await request.post(`${API_URL}/api/players/${player.id}/accept-rules`, { headers: player.headers });
    expect(response.ok()).toBe(true);
    const first = (await response.json()).data.regoleAccettateIl;
    expect(first).toEqual(expect.any(String));

    const again = await request.post(`${API_URL}/api/players/${player.id}/accept-rules`, { headers: player.headers });
    expect((await again.json()).data.regoleAccettateIl).toBe(first);

    const me = await request.get(`${API_URL}/api/players/${player.id}`, { headers: player.headers });
    expect((await me.json()).data.regoleAccettateIl).toBe(first);
  });

  test('nobody can confirm for somebody else', async ({ request }) => {
    const anna = await registerPlayer(request, API_URL, 'Anna', { acceptRules: false });
    const bruno = await registerPlayer(request, API_URL, 'Bruno', { acceptRules: false });

    const response = await request.post(`${API_URL}/api/players/${bruno.id}/accept-rules`, { headers: anna.headers });

    expect(response.status()).toBe(403);
  });

  test('the creator cannot start a game while a player has not confirmed', async ({ request }) => {
    const creator = await registerPlayer(request, API_URL, 'Creatore');
    const guest = await registerPlayer(request, API_URL, 'Ospite', { acceptRules: false });
    await fund(request, creator);
    await fund(request, guest);
    const gameId = await lobbyWith(request, creator, guest);

    const start = await request.post(`${API_URL}/api/games/${gameId}/start`, { headers: creator.headers });

    expect(start.status()).toBe(409);
    const game = await gameOf(request, creator, gameId);
    expect(game.status).toBe('waiting');
    expect(game.players.find((p) => p.id === guest.id).regoleLette).toBe(false);
    expect(game.players.find((p) => p.id === creator.id).regoleLette).toBe(true);
  });

  test('once the player confirms, the creator can start', async ({ request }) => {
    const creator = await registerPlayer(request, API_URL, 'Creatore');
    const guest = await registerPlayer(request, API_URL, 'Ospite', { acceptRules: false });
    await fund(request, creator);
    await fund(request, guest);
    const gameId = await lobbyWith(request, creator, guest);

    await request.post(`${API_URL}/api/players/${guest.id}/accept-rules`, { headers: guest.headers });
    const start = await request.post(`${API_URL}/api/games/${gameId}/start`, { headers: creator.headers });

    expect(start.ok()).toBe(true);
    expect((await gameOf(request, creator, gameId)).status).toBe('playing');
  });

  test('a full game waits for the rules and starts by itself when the last player confirms', async ({ request }) => {
    const creator = await registerPlayer(request, API_URL, 'Creatore');
    const guest = await registerPlayer(request, API_URL, 'Ospite', { acceptRules: false });
    await fund(request, creator);
    await fund(request, guest);
    const gameId = await lobbyWith(request, creator, guest, 2);

    await expect.poll(async () => (await gameOf(request, creator, gameId)).status, { timeout: 1500 }).toBe('waiting');

    await request.post(`${API_URL}/api/players/${guest.id}/accept-rules`, { headers: guest.headers });

    await expect.poll(async () => (await gameOf(request, creator, gameId)).status, { timeout: 5000 }).toBe('playing');
  });
});
