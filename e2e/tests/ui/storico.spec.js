/**
 * History and statistics screen
 *
 * From the hall: the credit movements and the personal statistics fit the screen of a phone, with
 * targets of at least 44 px. The e2e server runs on the database, where the history is kept.
 * @tags @mobile @storico
 */

import { test, expect } from '@playwright/test';
import { registerPlayer, PASSWORD } from '../helpers/auth.js';

const API_URL = process.env.E2E_API_URL || 'http://localhost:3001';
const GUIDA_LETTA = () => window.localStorage.setItem('combocard.guida-letta', '1');

test.skip(({ browserName }) => browserName !== 'chromium', 'The layout is measured on Chromium');
test.use({ hasTouch: true });

async function playerWithHistory(request) {
  const player = await registerPlayer(request, API_URL, 'Storico');
  await request.post(`${API_URL}/api/players/${player.id}/buy-credits`, { headers: player.headers, data: { amount: 500 } });
  return player;
}

async function signIn(page, player) {
  await page.addInitScript(GUIDA_LETTA);
  await page.goto('/');
  await page.getByLabel(/nome utente/i).fill(player.name);
  await page.getByLabel(/password/i).fill(PASSWORD);
  await page.getByRole('button', { name: /accedi/i }).click();
  await expect(page.getByRole('heading', { name: 'Hall' })).toBeVisible();
}

const fits = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

test.describe('History and statistics @storico', () => {
  for (const [width, height] of [[390, 844], [320, 568]]) {
    test(`the movements and the statistics fit the screen at ${width}px`, async ({ page, request }) => {
      const player = await playerWithHistory(request);
      await page.setViewportSize({ width, height });
      await signIn(page, player);

      await page.getByRole('button', { name: /Storico e statistiche/ }).click();
      await expect(page.getByRole('heading', { name: 'Storico e statistiche' })).toBeVisible();
      const list = page.getByRole('list', { name: 'Movimenti' });
      await expect(list).toContainText('Crediti presi');
      await expect(list).toContainText('+500');
      expect(await fits(page)).toBe(true);

      const small = await page.evaluate(() =>
        [...document.querySelectorAll('button, select, input')]
          .filter((el) => el.getBoundingClientRect().width > 0)
          .map((el) => ({ el, r: el.getBoundingClientRect() }))
          .filter(({ r }) => r.width < 43.5 || r.height < 43.5)
          .map(({ el }) => el.getAttribute('aria-label') || el.tagName),
      );
      expect(small).toEqual([]);

      await page.getByRole('tab', { name: 'Statistiche' }).click();
      await expect(page.getByText('Partite giocate')).toBeVisible();
      await expect(page.getByRole('tabpanel')).toContainText(/Crediti spesi\s*0/);
      expect(await fits(page)).toBe(true);

      await page.getByRole('button', { name: /Torna alla hall/ }).click();
      await expect(page.getByRole('heading', { name: 'Hall' })).toBeVisible();
    });
  }

  test('only the own movements are shown', async ({ page, request }) => {
    const player = await playerWithHistory(request);
    const other = await registerPlayer(request, API_URL, 'Altro');
    await request.post(`${API_URL}/api/players/${other.id}/buy-credits`, { headers: other.headers, data: { amount: 321 } });
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page, player);

    await page.getByRole('button', { name: /Storico e statistiche/ }).click();

    await expect(page.getByRole('list', { name: 'Movimenti' })).not.toContainText('321');
  });
});
