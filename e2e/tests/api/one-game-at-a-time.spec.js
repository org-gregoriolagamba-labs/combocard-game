/**
 * One game at a time
 *
 * A player is in one game at a time: the entry fee is checked when joining and charged at the
 * start, so with two games the same credits would be promised twice.
 * @tags @api @games @credits
 */

import { test, expect } from '@playwright/test';
import { registerPlayer } from '../helpers/auth.js';

const API_URL = process.env.E2E_API_URL || 'http://localhost:3001';
const ANOTHER_GAME = 'You are already in another game';

async function fund(request, player, amount = 100) {
  await request.post(`${API_URL}/api/players/${player.id}/buy-credits`, { headers: player.headers, data: { amount } });
}

async function createGame(request, player) {
  return request.post(`${API_URL}/api/games`, { headers: player.headers, data: { requiredCredits: 100, maxPlayers: 4 } });
}

test.describe('One game at a time @games', () => {
  test('a player with the fee for one game cannot be in three, so the balance never goes negative', async ({ request }) => {
    const player = await registerPlayer(request, API_URL, 'Giocatore');
    const host = await registerPlayer(request, API_URL, 'Ospitante');
    await fund(request, player);
    await fund(request, host, 500);

    const games = [];
    for (let i = 0; i < 3; i += 1) {
      games.push((await (await createGame(request, host)).json()).data.gameId);
    }
    // the host is in none of them yet: the three are open to the player
    const first = await request.post(`${API_URL}/api/games/${games[0]}/join`, { headers: player.headers });
    expect(first.status()).toBe(200);

    const second = await request.post(`${API_URL}/api/games/${games[1]}/join`, { headers: player.headers });
    expect(second.status()).toBe(400);
    expect((await second.json()).message).toBe(ANOTHER_GAME);
    const third = await request.post(`${API_URL}/api/games/${games[2]}/join`, { headers: player.headers });
    expect(third.status()).toBe(400);

    await request.post(`${API_URL}/api/games/${games[0]}/join`, { headers: host.headers });
    expect((await request.post(`${API_URL}/api/games/${games[0]}/start`, { headers: player.headers })).status()).toBe(200);

    const profile = await request.get(`${API_URL}/api/players/${player.id}`, { headers: player.headers });
    expect((await profile.json()).data.credits).toBe(0);
  });

  test('a player in a game cannot create another one, and can again after leaving', async ({ request }) => {
    const player = await registerPlayer(request, API_URL, 'Creatore');
    await fund(request, player, 300);
    const { gameId } = (await (await createGame(request, player)).json()).data;
    await request.post(`${API_URL}/api/games/${gameId}/join`, { headers: player.headers });

    const refused = await createGame(request, player);
    expect(refused.status()).toBe(400);
    expect((await refused.json()).message).toBe(ANOTHER_GAME);

    await request.post(`${API_URL}/api/games/${gameId}/leave`, { headers: player.headers });
    expect((await createGame(request, player)).status()).toBe(201);
  });
});
