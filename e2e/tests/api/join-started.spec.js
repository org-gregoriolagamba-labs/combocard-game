/**
 * Joining a game
 *
 * A game accepts new players only while it waits for them: after the start the entry fees are
 * charged and the prizes fixed.
 * @tags @api @games
 */

import { test, expect } from '@playwright/test';
import { registerPlayer } from '../helpers/auth.js';

const API_URL = process.env.E2E_API_URL || 'http://localhost:3001';

async function fund(request, player, amount = 500) {
  await request.post(`${API_URL}/api/players/${player.id}/buy-credits`, { headers: player.headers, data: { amount } });
}

async function credits(request, player) {
  const response = await request.get(`${API_URL}/api/players/${player.id}`, { headers: player.headers });
  return (await response.json()).data.credits;
}

test.describe('Joining a game that started @games', () => {
  test('a new player is refused, keeps the credits and gets no grid; the ones inside are not affected', async ({ request }) => {
    const creator = await registerPlayer(request, API_URL, 'Creatore');
    const guest = await registerPlayer(request, API_URL, 'Ospite');
    const late = await registerPlayer(request, API_URL, 'Ritardo');
    for (const player of [creator, guest, late]) await fund(request, player);

    const created = await request.post(`${API_URL}/api/games`, {
      headers: creator.headers,
      data: { requiredCredits: 100, maxPlayers: 4 },
    });
    const { gameId } = (await created.json()).data;
    for (const player of [creator, guest]) {
      expect((await request.post(`${API_URL}/api/games/${gameId}/join`, { headers: player.headers })).status()).toBe(200);
    }
    expect((await request.post(`${API_URL}/api/games/${gameId}/start`, { headers: creator.headers })).status()).toBe(200);

    const refused = await request.post(`${API_URL}/api/games/${gameId}/join`, { headers: late.headers });
    expect(refused.status()).toBe(400);
    expect((await refused.json()).message).toBe('Game already started');
    expect(await credits(request, late)).toBe(500);
    expect((await request.get(`${API_URL}/api/games/${gameId}`, { headers: late.headers })).status()).toBe(403);

    const again = await request.post(`${API_URL}/api/games/${gameId}/join`, { headers: guest.headers });
    expect(again.status()).toBe(200);
    expect((await again.json()).data).toMatchObject({ success: true, autoStarted: true });
    expect(await credits(request, guest)).toBe(400);
  });

  test('a player who leaves a game started cannot come back', async ({ request }) => {
    const creator = await registerPlayer(request, API_URL, 'Creatore');
    const guest = await registerPlayer(request, API_URL, 'Ospite');
    const third = await registerPlayer(request, API_URL, 'Terzo');
    for (const player of [creator, guest, third]) await fund(request, player);
    const created = await request.post(`${API_URL}/api/games`, {
      headers: creator.headers,
      data: { requiredCredits: 100, maxPlayers: 4 },
    });
    const { gameId } = (await created.json()).data;
    for (const player of [creator, guest, third]) {
      await request.post(`${API_URL}/api/games/${gameId}/join`, { headers: player.headers });
    }
    await request.post(`${API_URL}/api/games/${gameId}/start`, { headers: creator.headers });

    await request.post(`${API_URL}/api/games/${gameId}/leave`, { headers: guest.headers });
    const back = await request.post(`${API_URL}/api/games/${gameId}/join`, { headers: guest.headers });

    expect(back.status()).toBe(400);
  });
});
