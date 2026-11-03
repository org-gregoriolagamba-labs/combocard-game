/**
 * Narrow screens
 *
 * The suit names of the sheet are read in full on a small phone, and no screen scrolls sideways
 * when the browser is zoomed to 200% on a 360 px phone (180 px wide).
 * @tags @mobile @narrow
 */

import { test, expect } from '@playwright/test';
import { registerPlayer, PASSWORD } from '../helpers/auth.js';

const API_URL = process.env.E2E_API_URL || 'http://localhost:3001';
const GUIDA_LETTA = () => window.localStorage.setItem('combocard.guida-letta', '1');

test.skip(({ browserName }) => browserName !== 'chromium', 'The layout is measured on Chromium');
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

/** Two players in a game: still waiting in the lobby, or started with no card drawn */
async function game(request, { start }) {
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
  if (start) await request.post(`${API_URL}/api/games/${gameId}/start`, { headers: creator.headers });
  return { creator, guest };
}

async function signIn(page, player) {
  await page.addInitScript(GUIDA_LETTA);
  await page.goto('/');
  await page.getByLabel(/nome utente/i).fill(player.name);
  await page.getByLabel(/password/i).fill(PASSWORD);
  await page.getByRole('button', { name: /accedi/i }).click();
}

const sidewaysBy = (page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

test.describe('Narrow screens @narrow', () => {
  for (const [width, height] of [[320, 640], [360, 740], [390, 844]]) {
    test(`the four suit names of the sheet are read in full at ${width}px`, async ({ page, request }) => {
      const { guest } = await game(request, { start: true });
      await page.setViewportSize({ width, height });
      await signIn(page, guest);
      await expect(page.getByRole('heading', { name: 'La tua cartella' })).toBeVisible();

      const cut = await page.getByRole('columnheader').evaluateAll((headers) =>
        headers
          .filter((th) => th.querySelector('span').scrollWidth > th.clientWidth)
          .map((th) => th.textContent.trim()),
      );

      expect(cut).toEqual([]);
    });
  }

  // 180 px is a 360 px phone zoomed to 200%, 160 px a 320 px phone
  for (const [width, height] of [[180, 370], [160, 340]]) {
    test(`no screen scrolls sideways at ${width}px`, async ({ page, request, browser }) => {
      await page.setViewportSize({ width, height });
      // Every screen has its own session: a page of the same context would be signed in as the same player
      const freshPage = async () => (await browser.newContext({ viewport: { width, height }, hasTouch: true })).newPage();
      const wide = {};

      await page.addInitScript(GUIDA_LETTA);
      await page.goto('/');
      wide.login = await sidewaysBy(page);

      await page.getByRole('button', { name: /crea un account/i }).click();
      wide.registrazione = await sidewaysBy(page);

      const novice = await registerPlayer(request, API_URL, 'Nuovo', { acceptRules: false });
      await signIn(page, novice);
      await expect(page.getByRole('heading', { name: 'Prima di giocare: le regole' })).toBeVisible();
      wide.regole = await sidewaysBy(page);

      // A game waiting for players is listed in the hall, with the long name of its creator
      const waiting = await game(request, { start: false });
      const hall = await registerPlayer(request, API_URL, 'Hall');
      const hallPage = await freshPage();
      await signIn(hallPage, hall);
      await expect(hallPage.getByRole('button', { name: 'Prendi crediti' })).toBeVisible();
      wide.hall = await sidewaysBy(hallPage);
      await hallPage.getByRole('button', { name: 'Prendi crediti' }).click();
      await expect(hallPage.getByRole('dialog')).toBeVisible();
      wide.cassa = await sidewaysBy(hallPage);

      const lobbyPage = await freshPage();
      await signIn(lobbyPage, waiting.creator);
      await expect(lobbyPage.getByRole('button', { name: 'Inizia Partita' })).toBeVisible();
      wide.lobby = await sidewaysBy(lobbyPage);

      const started = await game(request, { start: true });
      const gamePage = await freshPage();
      await signIn(gamePage, started.guest);
      await expect(gamePage.getByRole('heading', { name: 'La tua cartella' })).toBeVisible();
      wide.partita = await sidewaysBy(gamePage);

      const sideways = Object.entries(wide).filter(([, by]) => by > 0).map(([screen, by]) => `${screen} +${by}px`);
      expect(sideways).toEqual([]);
    });
  }
});
