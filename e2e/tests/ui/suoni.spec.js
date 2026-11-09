/**
 * Sounds of a game
 *
 * The creator chooses at the creation whether the game has sounds; a game with sounds has a
 * button on the sheet to turn them off for oneself, and the screen still fits at 320 px.
 * @tags @mobile @suoni
 */

import { test, expect } from '@playwright/test';
import { registerPlayer, PASSWORD } from '../helpers/auth.js';

const API_URL = process.env.E2E_API_URL || 'http://localhost:3001';
const GUIDA_LETTA = () => window.localStorage.setItem('combocard.guida-letta', '1');

test.skip(({ browserName }) => browserName !== 'chromium', 'The layout is measured on Chromium');
test.use({ hasTouch: true });

async function startedGame(request, extra = {}) {
  const creator = await registerPlayer(request, API_URL, 'Creatore');
  const guest = await registerPlayer(request, API_URL, 'Ospite');
  for (const player of [creator, guest]) {
    await request.post(`${API_URL}/api/players/${player.id}/buy-credits`, { headers: player.headers, data: { amount: 500 } });
  }
  const created = await request.post(`${API_URL}/api/games`, {
    headers: creator.headers,
    data: { requiredCredits: 100, maxPlayers: 4, ...extra },
  });
  const { gameId } = (await created.json()).data;
  for (const player of [creator, guest]) {
    await request.post(`${API_URL}/api/games/${gameId}/join`, { headers: player.headers });
  }
  await request.post(`${API_URL}/api/games/${gameId}/start`, { headers: creator.headers });
  return { guest, gameId };
}

async function signIn(page, player) {
  await page.addInitScript(GUIDA_LETTA);
  await page.goto('/');
  await page.getByLabel(/nome utente/i).fill(player.name);
  await page.getByLabel(/password/i).fill(PASSWORD);
  await page.getByRole('button', { name: /accedi/i }).click();
  await expect(page.getByRole('heading', { name: 'La tua cartella' })).toBeVisible();
}

test.describe('Sounds of a game @suoni', () => {
  test('the game says whether it has sounds, to everybody who reads it', async ({ request }) => {
    const { guest, gameId } = await startedGame(request, { soundsEnabled: false });

    const view = await request.get(`${API_URL}/api/games/${gameId}`, { headers: guest.headers });

    expect((await view.json()).data.soundsEnabled).toBe(false);
  });

  test('a value that is not a boolean is refused', async ({ request }) => {
    const creator = await registerPlayer(request, API_URL, 'Creatore');

    const refused = await request.post(`${API_URL}/api/games`, { headers: creator.headers, data: { soundsEnabled: 'no' } });

    expect(refused.status()).toBe(400);
  });

  for (const width of [390, 320]) {
    test(`a game with sounds has the button, which fits the sheet at ${width}px and keeps the choice`, async ({ page, request }) => {
      const { guest } = await startedGame(request);
      await page.setViewportSize({ width, height: 700 });
      await signIn(page, guest);

      await page.getByRole('button', { name: 'Disattiva i suoni' }).click();
      await expect(page.getByRole('button', { name: 'Attiva i suoni' })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

      await page.reload();
      await expect(page.getByRole('button', { name: 'Attiva i suoni' })).toBeVisible();
    });
  }

  test('a game without sounds has no button', async ({ page, request }) => {
    const { guest } = await startedGame(request, { soundsEnabled: false });
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page, guest);

    await expect(page.getByRole('button', { name: /i suoni/ })).toHaveCount(0);
  });
});
