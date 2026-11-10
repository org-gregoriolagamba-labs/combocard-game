/**
 * Zoom on request of the cards
 *
 * A card of the sheet and a card of the list of the drawn ones open big in a dialog that
 * fits the screen, and close with Esc.
 * @tags @mobile @zoom
 */

import { test, expect } from '@playwright/test';
import { registerPlayer, PASSWORD } from '../helpers/auth.js';

const API_URL = process.env.E2E_API_URL || 'http://localhost:3001';
const GUIDA_LETTA = () => window.localStorage.setItem('combocard.guida-letta', '1');

test.skip(({ browserName }) => browserName !== 'chromium', 'The layout is measured on Chromium');
test.use({ hasTouch: true });

async function startedGame(request) {
  const creator = await registerPlayer(request, API_URL, 'Creatore');
  const guest = await registerPlayer(request, API_URL, 'Ospite');
  for (const player of [creator, guest]) {
    await request.post(`${API_URL}/api/players/${player.id}/buy-credits`, { headers: player.headers, data: { amount: 500 } });
  }
  const created = await request.post(`${API_URL}/api/games`, {
    headers: creator.headers,
    data: { requiredCredits: 100, maxPlayers: 4 },
  });
  const { gameId } = (await created.json()).data;
  for (const player of [creator, guest]) {
    await request.post(`${API_URL}/api/games/${gameId}/join`, { headers: player.headers });
  }
  await request.post(`${API_URL}/api/games/${gameId}/start`, { headers: creator.headers });
  const drawn = await request.post(`${API_URL}/api/games/${gameId}/draw`, { headers: creator.headers });
  const { carta } = (await drawn.json()).data;
  return { guest, carta };
}

async function signIn(page, player) {
  await page.addInitScript(GUIDA_LETTA);
  await page.goto('/');
  await page.getByLabel(/nome utente/i).fill(player.name);
  await page.getByLabel(/password/i).fill(PASSWORD);
  await page.getByRole('button', { name: /accedi/i }).click();
  await expect(page.getByRole('heading', { name: 'La tua cartella' })).toBeVisible();
}

const fitsTheScreen = async (page) => {
  const box = await page.getByRole('dialog').boundingBox();
  const { width, height } = page.viewportSize();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(width);
  expect(box.y + box.height).toBeLessThanOrEqual(height);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
};

test.describe('Zoom of the cards @zoom', () => {
  for (const [width, height] of [[390, 844], [320, 568]]) {
    test(`a card of the sheet opens big and closes with Esc at ${width}px`, async ({ page, request }) => {
      const { guest } = await startedGame(request);
      await page.setViewportSize({ width, height });
      await signIn(page, guest);

      const sheet = page.getByRole('table');
      const card = sheet.getByRole('button').first();
      await card.click();

      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await expect(dialog.getByRole('img')).toBeVisible();
      await fitsTheScreen(page);

      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
      await expect(card).toBeFocused();
    });

    test(`a card of the list of the drawn ones opens big at ${width}px`, async ({ page, request }) => {
      const { guest, carta } = await startedGame(request);
      await page.setViewportSize({ width, height });
      await signIn(page, guest);

      await page.getByRole('button', { name: /Carte uscite/ }).click();
      await page.getByRole('list').getByRole('button', { name: `${carta.valore} di ${carta.seme}` }).click();

      await expect(page.getByRole('dialog', { name: `${carta.valore} di ${carta.seme}` })).toBeVisible();
      await fitsTheScreen(page);
    });
  }
});
