/**
 * Draws are paused while a player chooses the jolly card
 *
 * Two players on two screens: when the guest declares the jolly the creator cannot draw,
 * is told who is choosing, and can draw again as soon as the guest gives up. The server
 * refuses a draw during the pause whatever the screen shows. The own pause survives a reload.
 * @tags @mobile @jolly
 */

import { test, expect } from '@playwright/test';
import { registerPlayer, PASSWORD } from '../helpers/auth.js';

const API_URL = process.env.E2E_API_URL || 'http://localhost:3001';
const VALORI = ['Asso', 'Due', 'Tre', 'Quattro', 'Cinque', 'Sei', 'Sette', 'Fante', 'Cavallo', 'Re'];
const GUIDA_LETTA = () => window.localStorage.setItem('combocard.guida-letta', '1');

test.skip(({ browserName }) => browserName !== 'chromium', 'Two screens are measured on Chromium');
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

/** The guest's sheet is replaced with one where a tris is one card away, so the jolly is offered */
async function withKnownSheet(page, player) {
  const mazzo = ['Spade', 'Coppe', 'Denari'].flatMap((seme) =>
    VALORI.map((valore, i) => ({ valore, seme, emoji: '', valoreNum: i + 1 })),
  );
  const carte = mazzo.slice(0, 25);
  const cartella = Array.from({ length: 5 }, (_, r) => carte.slice(r * 5, r * 5 + 5));
  const coperte = cartella.map((riga) =>
    riga.map((c) => c.valore === 'Sei' && (c.seme === 'Spade' || c.seme === 'Coppe')),
  );

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

test.describe('Jolly pause @jolly', () => {
  test('the creator cannot draw while the guest chooses, and can as soon as the guest gives up', async ({ page, browser, request }) => {
    const { creator, guest, gameId } = await startedGame(request);

    const creatorContext = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
    const creatorPage = await creatorContext.newPage();
    await signIn(creatorPage, creator);
    await withKnownSheet(page, guest);
    await signIn(page, guest);

    const draw = creatorPage.getByRole('button', { name: /Estrai Carta/ });
    await expect(draw).toBeEnabled();

    // The guest declares the jolly for the tris
    await page.getByRole('button', { name: 'Usa il Jolly per TRIS' }).click();
    await expect(page.getByTestId('barra-azione').getByText(/Le estrazioni sono ferme: hai ancora/)).toBeVisible();

    // The creator sees who is choosing, and the draw waits
    await expect(
      creatorPage.getByTestId('barra-azione').getByText(new RegExp(`${guest.name} sta scegliendo il Jolly`)),
    ).toBeVisible();
    await expect(creatorPage.getByRole('button', { name: /Estrazione in pausa/ })).toBeDisabled();
    await expect(creatorPage.getByRole('button', { name: /Estrai Carta/ })).toHaveCount(0);

    // The server refuses anyway: a screen is not a guard
    const refused = await request.post(`${API_URL}/api/games/${gameId}/draw`, { headers: creator.headers });
    expect(refused.status()).toBe(409);
    expect((await refused.json()).message ?? (await refused.json()).error).toMatch(/choosing the jolly/);

    // The guest gives up: the creator is told and can draw again
    await page.getByRole('group', { name: 'Modalità Jolly' }).getByRole('button', { name: 'Annulla' }).click();
    await expect(page.getByRole('group', { name: 'Modalità Jolly' })).toHaveCount(0);
    await expect(creatorPage.getByRole('button', { name: /Estrai Carta/ })).toBeEnabled();
    await creatorPage.getByRole('button', { name: /Estrai Carta/ }).click();
    await expect(creatorPage.getByTestId('barra-azione').getByText(/Attendi \d+s/)).toBeVisible();

    await creatorContext.close();
  });

  test('after a reload the guest is still choosing and can give up', async ({ page, request }) => {
    const { guest } = await startedGame(request);
    await withKnownSheet(page, guest);
    await signIn(page, guest);

    await page.getByRole('button', { name: 'Usa il Jolly per TRIS' }).click();
    await expect(page.getByTestId('barra-azione').getByText(/Le estrazioni sono ferme/)).toBeVisible();

    await page.reload();

    const mode = page.getByRole('group', { name: 'Modalità Jolly' });
    await expect(mode).toContainText('Jolly per TRIS: tocca una carta evidenziata');
    await mode.getByRole('button', { name: 'Annulla' }).click();
    await expect(page.getByRole('group', { name: 'Modalità Jolly' })).toHaveCount(0);
    await expect(page.getByTestId('barra-azione').getByText(/Le estrazioni sono ferme/)).toHaveCount(0);
  });

  test('another player cannot declare the jolly while the guest is choosing', async ({ request }) => {
    const { creator, guest, gameId } = await startedGame(request);

    const first = await request.post(`${API_URL}/api/games/${gameId}/jolly/start`, { headers: guest.headers, data: { tipo: 'tris' } });
    expect(first.ok()).toBe(true);
    const second = await request.post(`${API_URL}/api/games/${gameId}/jolly/start`, { headers: creator.headers, data: { tipo: 'scopa' } });
    expect(second.status()).toBe(409);

    await request.post(`${API_URL}/api/games/${gameId}/jolly/cancel`, { headers: guest.headers });
    const afterwards = await request.post(`${API_URL}/api/games/${gameId}/jolly/start`, { headers: creator.headers, data: { tipo: 'scopa' } });
    expect(afterwards.ok()).toBe(true);
  });
});
