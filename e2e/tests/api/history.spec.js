/**
 * History of the movements and personal statistics
 *
 * A player reads only their own movements and statistics, from the token. The e2e server runs on the
 * database, where the history is kept.
 * @tags @critical
 */

import { test, expect } from '@playwright/test';
import { registerPlayer } from '../helpers/auth.js';

const API_URL = process.env.E2E_API_URL || 'http://localhost:3001';

async function playedGame(request) {
  const creator = await registerPlayer(request, API_URL, 'Creatore');
  const guest = await registerPlayer(request, API_URL, 'Ospite');
  for (const p of [creator, guest]) {
    await request.post(`${API_URL}/api/players/${p.id}/buy-credits`, { headers: p.headers, data: { amount: 500 } });
  }
  const created = await request.post(`${API_URL}/api/games`, { headers: creator.headers, data: { requiredCredits: 100, maxPlayers: 4 } });
  const { gameId } = (await created.json()).data;
  for (const p of [creator, guest]) {
    await request.post(`${API_URL}/api/games/${gameId}/join`, { headers: p.headers });
  }
  await request.post(`${API_URL}/api/games/${gameId}/start`, { headers: creator.headers });
  return { creator, guest, gameId };
}

const read = async (request, player, path) => (await request.get(`${API_URL}${path}`, { headers: player.headers })).json();

test.describe('History and statistics @critical', () => {
  test('the movements are the own ones, latest first, with the fee of the game', async ({ request }) => {
    const { creator, guest, gameId } = await playedGame(request);

    const { data } = await read(request, creator, '/api/me/movements');

    expect(data.disponibile).toBe(true);
    expect(data.items.map((m) => m.tipo)).toEqual(['game_entry', 'purchase']);
    expect(data.items[0]).toMatchObject({ importo: -100, saldoDopo: 400, partita: { id: gameId } });
    expect(data.items[1]).toMatchObject({ importo: 500, saldoDopo: 500, partita: null });
    expect(data.total).toBe(2);

    // The guest has their own, not the creator's
    const other = await read(request, guest, '/api/me/movements');
    expect(other.data.items.map((m) => m.tipo)).toEqual(['game_entry', 'purchase']);
    expect(other.data.items.every((m) => m.partita === null || m.partita.id === gameId)).toBe(true);
  });

  test('another player id in the request changes nothing', async ({ request }) => {
    const { creator, guest } = await playedGame(request);
    const loner = await registerPlayer(request, API_URL, 'Solo');

    const { data } = await read(request, loner, `/api/me/movements?playerId=${creator.id}&limit=5`);

    expect(data.items).toEqual([]);
    expect(data.total).toBe(0);
    expect(guest.id).not.toBe(loner.id);
  });

  test('can be paged and filtered by type', async ({ request }) => {
    const { creator } = await playedGame(request);

    const page = (await read(request, creator, '/api/me/movements?limit=1&page=2')).data;
    const entries = (await read(request, creator, '/api/me/movements?type=game_entry')).data;

    expect(page.items).toHaveLength(1);
    expect(page.items[0].tipo).toBe('purchase');
    expect(page.total).toBe(2);
    expect(entries.items.map((m) => m.tipo)).toEqual(['game_entry']);
  });

  test('refuses what is not a page, a type or a period', async ({ request }) => {
    const { creator } = await playedGame(request);

    for (const query of ['page=0', 'limit=101', 'type=password', 'from=ieri', 'from=2026-02-01&to=2026-01-01']) {
      const response = await request.get(`${API_URL}/api/me/movements?${query}`, { headers: creator.headers });
      expect(response.status(), query).toBe(400);
    }
  });

  test('the statistics count the game played and the fee spent', async ({ request }) => {
    const { creator } = await playedGame(request);

    const { data } = await read(request, creator, '/api/me/stats');

    expect(data.disponibile).toBe(true);
    expect(data.statistiche).toMatchObject({ partiteGiocate: 1, creditiSpesi: 100, creditiVinti: 0, saldoNetto: -100 });
    expect(Object.keys(data.statistiche.collezioniVinte).sort()).toEqual(['combocard_reale', 'napola', 'scopa', 'sequenza', 'tris']);
  });

  test('a new player has empty statistics', async ({ request }) => {
    const loner = await registerPlayer(request, API_URL, 'Nuovo');

    const { data } = await read(request, loner, '/api/me/stats');

    expect(data.statistiche).toMatchObject({ partiteGiocate: 0, creditiSpesi: 0, creditiVinti: 0, incassoMassimo: 0 });
  });
});
