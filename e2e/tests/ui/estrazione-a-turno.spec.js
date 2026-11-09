/**
 * Drawing by turns
 *
 * With `estrazione: "tutti"` the server decides who draws each card: the creator has no
 * privilege, the player on turn draws after the wait, everybody sees who it is and the time left.
 * The time limit and the cards of discipline are covered by the backend tests (fake timers).
 * @tags @mobile @turni
 */

import { test, expect } from '@playwright/test';
import { registerPlayer, PASSWORD } from '../helpers/auth.js';

const API_URL = process.env.E2E_API_URL || 'http://localhost:3001';
const GUIDA_LETTA = () => window.localStorage.setItem('combocard.guida-letta', '1');

test.skip(({ browserName }) => browserName !== 'chromium', 'The layout is measured on Chromium');
test.use({ hasTouch: true });

async function startedGame(request, body = { estrazione: 'tutti' }) {
  const creator = await registerPlayer(request, API_URL, 'Creatore');
  const guest = await registerPlayer(request, API_URL, 'Ospite');
  for (const player of [creator, guest]) {
    await request.post(`${API_URL}/api/players/${player.id}/buy-credits`, { headers: player.headers, data: { amount: 500 } });
  }
  const created = await request.post(`${API_URL}/api/games`, {
    headers: creator.headers,
    data: { requiredCredits: 100, maxPlayers: 4, ...body },
  });
  const { gameId } = (await created.json()).data;
  for (const player of [creator, guest]) {
    await request.post(`${API_URL}/api/games/${gameId}/join`, { headers: player.headers });
  }
  await request.post(`${API_URL}/api/games/${gameId}/start`, { headers: creator.headers });
  return { creator, guest, gameId };
}

const viewOf = async (request, player, gameId) =>
  (await (await request.get(`${API_URL}/api/games/${gameId}`, { headers: player.headers })).json()).data;

async function signIn(page, player) {
  await page.addInitScript(GUIDA_LETTA);
  await page.goto('/');
  await page.getByLabel(/nome utente/i).fill(player.name);
  await page.getByLabel(/password/i).fill(PASSWORD);
  await page.getByRole('button', { name: /accedi/i }).click();
  await expect(page.getByRole('heading', { name: 'La tua cartella' })).toBeVisible();
}

test.describe('Drawing by turns @turni', () => {
  test('the game says who is on turn, the times left, and keeps the round to itself', async ({ request }) => {
    const { creator, gameId } = await startedGame(request);

    const game = await viewOf(request, creator, gameId);

    expect(game.estrazione).toBe('tutti');
    expect([creator.id, game.players.find((p) => p.id !== creator.id).id]).toContain(game.turno.playerId);
    expect(game.turno.scadenzaIn).toBeGreaterThan(0);
    expect(game.turno.attesaIn).toBeGreaterThan(0);
    expect(game.codaEstrattori).toBeUndefined();
  });

  test('only the player on turn draws, after the wait; then the turn goes to the other one', async ({ request }) => {
    const { creator, guest, gameId } = await startedGame(request);
    const game = await viewOf(request, creator, gameId);
    const onTurn = game.turno.playerId === creator.id ? creator : guest;
    const other = onTurn === creator ? guest : creator;

    const notYourTurn = await request.post(`${API_URL}/api/games/${gameId}/draw`, { headers: other.headers });
    expect(notYourTurn.status()).toBe(403);
    const tooSoon = await request.post(`${API_URL}/api/games/${gameId}/draw`, { headers: onTurn.headers });
    expect(tooSoon.status()).toBe(409);

    await new Promise((resolve) => setTimeout(resolve, game.turno.attesaIn + 300));
    const drawn = await request.post(`${API_URL}/api/games/${gameId}/draw`, { headers: onTurn.headers });
    expect(drawn.status()).toBe(200);

    const after = await viewOf(request, creator, gameId);
    expect(after.turno.playerId).toBe(other.id);
    expect(after.carteEstratte).toHaveLength(1);
  });

  test('a game made without the choice keeps the creator as the only one who draws', async ({ request }) => {
    const { creator, guest, gameId } = await startedGame(request, {});

    const game = await viewOf(request, creator, gameId);
    expect(game.estrazione).toBe('creatore');
    expect(game.turno).toBeNull();
    const refused = await request.post(`${API_URL}/api/games/${gameId}/draw`, { headers: guest.headers });
    expect(refused.status()).toBe(403);
  });

  test('a value that is not allowed is refused', async ({ request }) => {
    const creator = await registerPlayer(request, API_URL, 'Creatore');

    const refused = await request.post(`${API_URL}/api/games`, { headers: creator.headers, data: { estrazione: 'chiunque' } });

    expect(refused.status()).toBe(400);
  });

  for (const [width, height] of [[390, 844], [320, 568]]) {
    test(`everybody sees who draws and the time left, and the screen fits at ${width}px`, async ({ page, request }) => {
      const { creator, guest, gameId } = await startedGame(request);
      const game = await viewOf(request, creator, gameId);
      const onTurn = game.turno.playerId === creator.id ? creator : guest;
      const other = onTurn === creator ? guest : creator;
      await page.setViewportSize({ width, height });

      await signIn(page, other);
      await expect(page.getByRole('status').filter({ hasText: `Estrae ${onTurn.name}` })).toBeVisible();
      await expect(page.locator('[data-testid="conto-turno"]:visible').first()).toBeVisible();
      await expect(page.getByRole('button', { name: /Estrai Carta/ })).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    });
  }

  test('the player on turn has the button, with the wait first', async ({ page, request }) => {
    const { creator, guest, gameId } = await startedGame(request);
    const game = await viewOf(request, creator, gameId);
    const onTurn = game.turno.playerId === creator.id ? creator : guest;
    await page.setViewportSize({ width: 390, height: 844 });

    await signIn(page, onTurn);

    await expect(page.getByRole('button', { name: /Attendi|Estrai Carta/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Estrai Carta/ })).toBeEnabled({ timeout: 15_000 });
    await expect(page.locator('[data-testid="conto-turno"]:visible').first()).toBeVisible();
  });
});
