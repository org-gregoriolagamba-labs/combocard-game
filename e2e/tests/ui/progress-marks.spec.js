/**
 * Progress marks on the sheet
 *
 * The corner of the sheet says how near sequenza, napola and combocard reale are, in the
 * space above the row names, without moving the layout.
 * @tags @mobile @progress
 */

import { test, expect } from '@playwright/test';
import { registerPlayer, PASSWORD } from '../helpers/auth.js';

const API_URL = process.env.E2E_API_URL || 'http://localhost:3001';
const VALORI = ['Asso', 'Due', 'Tre', 'Quattro', 'Cinque', 'Sei', 'Sette', 'Fante', 'Cavallo', 'Re'];
const GUIDA_LETTA = () => window.localStorage.setItem('combocard.guida-letta', '1');

test.skip(({ browserName }) => browserName !== 'chromium', 'The layout is measured on Chromium');
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

/** A started game with two players and no card drawn: no collection can have been won by chance */
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

  return { creator, guest, gameId };
}

async function signIn(page, player) {
  await page.addInitScript(GUIDA_LETTA);
  await page.goto('/');
  await page.getByLabel(/nome utente/i).fill(player.name);
  await page.getByLabel(/password/i).fill(PASSWORD);
  await page.getByRole('button', { name: /accedi/i }).click();
  await expect(page.getByRole('heading', { name: 'La tua cartella' })).toBeVisible();
}

/**
 * The guest's sheet is replaced with a known one: Asso, Due and Tre of Spade covered (a sequenza and a
 * combocard reale three cards out of four), plus Asso and Sei of Coppe and Sei of Spade (two pairs and
 * two singles: a napola four cards out of five)
 */
async function withKnownSheet(page, player) {
  const mazzo = ['Spade', 'Coppe', 'Denari'].flatMap((seme) =>
    VALORI.map((valore, i) => ({ valore, seme, emoji: '', valoreNum: i + 1 })),
  );
  const carte = mazzo.slice(0, 25);
  const cartella = Array.from({ length: 5 }, (_, r) => carte.slice(r * 5, r * 5 + 5));
  const coperti = new Set(['Spade|Asso', 'Spade|Due', 'Spade|Tre', 'Coppe|Asso', 'Coppe|Sei', 'Spade|Sei']);
  const coperte = cartella.map((riga) => riga.map((c) => coperti.has(`${c.seme}|${c.valore}`)));

  await page.route(/\/api\/games\/[^/]+$/, async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    const response = await route.fetch();
    const body = await response.json();
    const game = body.data?.game ?? body.data;
    if (game?.players) {
      game.players = game.players.map((p) =>
        p.id === player.id ? { ...p, cartella, coperte, collezioni: [], jollyUsato: false, jollyPos: null } : p,
      );
    }
    await route.fulfill({ response, json: body });
  });
}

test.describe('Progress marks on the sheet @progress', () => {
  for (const [width, height] of [[390, 844], [360, 740], [320, 640]]) {
    test(`the corner says how near the figures are, on one line and not cut at ${width}px`, async ({ page, request }) => {
      const { guest } = await startedGame(request);
      await page.setViewportSize({ width, height });
      await withKnownSheet(page, guest);
      await signIn(page, guest);

      const corner = page.getByRole('table').locator('thead td').first();
      await expect(corner).toContainText('SEQ 3/4');
      await expect(corner).toContainText('NAPOLA 4/5');
      await expect(corner).toContainText('REALE 3/4');

      const cut = await corner.evaluate((td) => {
        const cell = td.getBoundingClientRect();
        return [...td.querySelectorAll('li > span[aria-hidden]')]
          .filter((chip) => chip.getBoundingClientRect().right > cell.right + 0.5 || chip.getBoundingClientRect().height > 16)
          .map((chip) => chip.textContent);
      });
      expect(cut).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

      if (width >= 360) {
        const bar = await page.getByTestId('barra-azione').boundingBox();
        const table = await page.getByRole('table').boundingBox();
        expect(table.y + table.height).toBeLessThanOrEqual(bar.y);
      }
    });
  }
});
