/**
 * Admin screen: games and statistics
 *
 * The admin cancels a game that is stuck from the screen: the player in it goes back to the hall
 * with the entry fee back, and is told why. The tabs fit a phone. Needs a server on PostgreSQL
 * (E2E_DATABASE_URL): with the in-memory server nobody can be made admin.
 * @tags @mobile @admin
 */

import { test, expect } from '@playwright/test';
import { PASSWORD, registerPlayer } from '../helpers/auth.js';
import { E2E_DATABASE_URL, registerAdmin } from '../helpers/admin.js';

const API_URL = process.env.E2E_API_URL || 'http://localhost:3001';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });
test.skip(!E2E_DATABASE_URL, 'needs a server on PostgreSQL: set E2E_DATABASE_URL');

async function signIn(page, player) {
  await page.goto('/');
  await page.getByLabel(/nome utente/i).fill(player.name);
  await page.getByLabel(/password/i).fill(PASSWORD);
  await page.getByRole('button', { name: /accedi/i }).click();
}

async function startedGame(request) {
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
  await request.post(`${API_URL}/api/games/${gameId}/start`, { headers: creator.headers });
  return { gameId, creator, guest };
}

async function openTab(page, admin, tab) {
  await signIn(page, admin);
  await page.getByRole('button', { name: 'Amministrazione' }).click();
  await page.getByRole('tab', { name: tab }).click();
}

// The list is the oldest first and in pages: on a database with many games the one of the test is on a later page
async function gameRow(page, creator) {
  const rows = page.getByRole('list', { name: 'Partite' }).getByRole('listitem').filter({ hasText: creator.name });
  const next = page.getByRole('button', { name: 'Pagina successiva' });
  for (let guard = 0; guard < 50 && (await rows.count()) === 0 && (await next.isEnabled()); guard += 1) {
    await next.click();
    await page.waitForTimeout(300);
  }
  return rows;
}

test.describe('Admin screen: games and statistics @admin', () => {
  test('the admin cancels a game in progress: the player goes back to the hall, refunded and told', async ({ page, browser, request }) => {
    const admin = await registerAdmin(request, API_URL);
    const { creator, guest } = await startedGame(request);
    const playerContext = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
    const playerPage = await playerContext.newPage();
    await signIn(playerPage, guest);
    await expect(playerPage.getByRole('heading', { name: 'La tua cartella' })).toBeVisible({ timeout: 10000 });

    await openTab(page, admin, 'Partite');
    await page.getByRole('list', { name: 'Partite' }).waitFor();
    const game = await gameRow(page, creator);
    await expect(game).toContainText('In corso');
    await game.getByRole('button', { name: 'Annulla partita' }).click();
    await page.getByRole('button', { name: 'Conferma annullamento' }).click();
    await expect(page.getByText('Scrivi il motivo')).toBeVisible();
    await page.getByLabel('Motivo').fill('bloccata');
    await page.getByRole('button', { name: 'Conferma annullamento' }).click();

    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(game).toHaveCount(0);
    await expect(playerPage.getByRole('heading', { name: 'Hall' })).toBeVisible({ timeout: 10000 });
    await expect(playerPage.getByText("La partita è stata annullata dall'amministrazione")).toBeVisible();
    await expect(playerPage.getByText('I tuoi crediti').locator('..')).toContainText('500');

    await page.getByRole('tab', { name: 'Registro' }).click();
    await expect(page.getByRole('list', { name: 'Azioni registrate' }).first()).toContainText('ha annullato una partita in corso: «bloccata», rimborsati 200 crediti');
    await playerContext.close();
  });

  test('the statistics tab shows the numbers', async ({ page, request }) => {
    const admin = await registerAdmin(request, API_URL);
    await startedGame(request);

    await openTab(page, admin, 'Statistiche');

    await expect(page.getByText('Utenti registrati')).toBeVisible();
    await expect(page.getByText('Partite in corso').locator('..').locator('dd')).not.toHaveText('0');
  });

  for (const [width, height] of [[390, 844], [320, 640], [180, 370]]) {
    for (const tab of ['Partite', 'Statistiche']) {
      test(`${tab} fits a phone at ${width}px: no sideways scroll, every control at least 44px`, async ({ page, request }) => {
        const admin = await registerAdmin(request, API_URL);
        await startedGame(request);
        await page.setViewportSize({ width, height });

        await openTab(page, admin, tab);
        await (tab === 'Partite' ? page.getByRole('list', { name: 'Partite' }) : page.getByText('Utenti registrati')).waitFor();

        const { overflow, small } = await page.evaluate(() => {
          const visible = (el) => {
            const r = el.getBoundingClientRect();
            return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
          };
          const controls = [...document.querySelectorAll('button, a, input, select, [role=tab]')].filter(visible);
          return {
            overflow: document.documentElement.scrollWidth - window.innerWidth,
            small: controls
              .map((el) => ({ el, r: el.getBoundingClientRect() }))
              .filter(({ r }) => r.height < 43.5)
              .map(({ el, r }) => `${(el.innerText || el.getAttribute('aria-label') || el.tagName).trim().slice(0, 24)} ${Math.round(r.width)}x${Math.round(r.height)}`),
          };
        });

        expect(overflow).toBeLessThanOrEqual(0);
        expect(small).toEqual([]);
      });
    }
  }
});
