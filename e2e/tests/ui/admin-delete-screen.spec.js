/**
 * Admin screen: deletion of an account
 *
 * The admin deletes an account from the Utenti tab: only after writing the username and the reason. The
 * user, who is connected, is sent back to the login with the notice and cannot log in again. Needs a
 * server on PostgreSQL (E2E_DATABASE_URL).
 * @tags @mobile @admin
 */

import { test, expect } from '@playwright/test';
import { PASSWORD, registerPlayer } from '../helpers/auth.js';
import { E2E_DATABASE_URL, registerAdmin } from '../helpers/admin.js';

const API_URL = process.env.E2E_API_URL || 'http://localhost:3001';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });
test.skip(!E2E_DATABASE_URL, 'needs a server on PostgreSQL: set E2E_DATABASE_URL');

async function signIn(page, name, password = PASSWORD) {
  await page.goto('/');
  await page.getByLabel(/nome utente/i).fill(name);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /accedi/i }).click();
}

async function openDeleteDialog(page, admin, player) {
  await signIn(page, admin.name);
  await expect(page.getByRole('heading', { name: 'Hall' })).toBeVisible({ timeout: 10000 });
  await page.getByRole('button', { name: 'Amministrazione' }).click();
  await page.getByLabel('Cerca per nome').fill(player.name);
  await page.getByRole('button', { name: 'Cerca' }).click();
  await page.getByRole('button', { name: `Accesso di ${player.name}` }).click();
  await page.getByRole('button', { name: "Elimina l'account" }).click();
  await expect(page.getByRole('dialog', { name: `Elimina l'account di ${player.name}` })).toBeVisible();
}

test.describe('Admin screen: deletion of an account @admin', () => {
  test('the admin deletes a connected user: the button waits for the name, the user is sent to the login and cannot come back', async ({ page, browser, request }) => {
    const admin = await registerAdmin(request, API_URL);
    const player = await registerPlayer(request, API_URL, 'Eliminato');
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
    const playerPage = await context.newPage();
    await signIn(playerPage, player.name);
    await expect(playerPage.getByRole('heading', { name: 'Hall' })).toBeVisible({ timeout: 10000 });

    await openDeleteDialog(page, admin, player);
    const confirm = page.getByRole('button', { name: 'Elimina definitivamente' });
    await expect(confirm).toBeDisabled();
    await page.getByLabel('Motivo').fill('richiesta di cancellazione');
    await page.getByLabel('Scrivi il nome utente per confermare').fill(player.name.toLowerCase());
    await expect(confirm).toBeDisabled();
    await page.getByLabel('Scrivi il nome utente per confermare').fill(player.name);
    await confirm.click();

    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByText('Nessun utente trovato')).toBeVisible();
    await expect(playerPage.getByText('Il tuo account è stato eliminato')).toBeVisible({ timeout: 10000 });
    await expect(playerPage.getByLabel(/nome utente/i)).toBeVisible();

    await playerPage.getByLabel(/nome utente/i).fill(player.name);
    await playerPage.getByLabel(/password/i).fill(PASSWORD);
    await playerPage.getByRole('button', { name: /accedi/i }).click();
    await expect(playerPage.getByRole('alert')).toContainText('non corretti');

    await page.getByRole('tab', { name: 'Registro' }).click();
    await expect(page.getByRole('list', { name: 'Azioni registrate' }).first()).toContainText('ha eliminato un account: «richiesta di cancellazione»');
    await context.close();
  });

  test('a user who is in a game is explained in the dialog, and stays', async ({ page, request }) => {
    const admin = await registerAdmin(request, API_URL);
    const player = await registerPlayer(request, API_URL, 'Giocatore');
    await request.post(`${API_URL}/api/players/${player.id}/buy-credits`, { headers: player.headers, data: { amount: 500 } });
    const created = await request.post(`${API_URL}/api/games`, { headers: player.headers, data: { requiredCredits: 100, maxPlayers: 4 } });
    await request.post(`${API_URL}/api/games/${(await created.json()).data.gameId}/join`, { headers: player.headers });

    await openDeleteDialog(page, admin, player);
    await page.getByLabel('Motivo').fill('x');
    await page.getByLabel('Scrivi il nome utente per confermare').fill(player.name);
    await page.getByRole('button', { name: 'Elimina definitivamente' }).click();

    await expect(page.getByRole('alert')).toContainText('sta giocando una partita');
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  for (const [width, height] of [[320, 640], [180, 370]]) {
    test(`the dialog fits a phone at ${width}px: no sideways scroll, every control at least 44px`, async ({ page, request }) => {
      const admin = await registerAdmin(request, API_URL);
      const player = await registerPlayer(request, API_URL, 'Misura');
      await page.setViewportSize({ width, height });

      await openDeleteDialog(page, admin, player);

      const { overflow, small } = await page.evaluate(() => {
        const visible = (el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
        };
        const dialog = document.querySelector('[role=dialog]');
        const controls = [...dialog.querySelectorAll('button, a, input')].filter(visible);
        return {
          overflow: Math.max(document.documentElement.scrollWidth - document.documentElement.clientWidth, dialog.scrollWidth - dialog.clientWidth),
          small: controls.filter((el) => el.getBoundingClientRect().height < 44).map((el) => el.getAttribute('aria-label') || el.textContent || el.id),
        };
      });
      expect(overflow).toBeLessThanOrEqual(0);
      expect(small).toEqual([]);
    });
  }
});
