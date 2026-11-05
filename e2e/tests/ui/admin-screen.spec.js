/**
 * Admin screen
 *
 * A player never sees the way to the admin area. An admin finds the users, corrects their
 * credits with a reason (the player sees the balance change at once), renames them, and the
 * screen fits a phone. The admin is made with the script of the operator, on the database of the
 * server under test: those tests need E2E_DATABASE_URL.
 * @tags @mobile @admin
 */

import { test, expect } from '@playwright/test';
import { PASSWORD, registerPlayer } from '../helpers/auth.js';
import { E2E_DATABASE_URL, registerAdmin } from '../helpers/admin.js';

const API_URL = process.env.E2E_API_URL || 'http://localhost:3001';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

async function signIn(page, player) {
  await page.goto('/');
  await page.getByLabel(/nome utente/i).fill(player.name);
  await page.getByLabel(/password/i).fill(PASSWORD);
  await page.getByRole('button', { name: /accedi/i }).click();
  await expect(page.getByRole('heading', { name: 'Hall' })).toBeVisible({ timeout: 10000 });
}

const adminScreen = async (page, admin) => {
  await signIn(page, admin);
  await page.getByRole('button', { name: 'Amministrazione' }).click();
  await expect(page.getByRole('heading', { name: 'Amministrazione' })).toBeVisible();
};

const find = async (page, name) => {
  await page.getByLabel('Cerca per nome').fill(name);
  await page.getByRole('button', { name: 'Cerca' }).click();
  await expect(page.getByRole('list', { name: 'Utenti' }).getByRole('listitem')).toHaveCount(1);
};

test.describe('Admin screen: who cannot see it @admin', () => {
  test('a player has no way to the admin area', async ({ page, request }) => {
    const player = await registerPlayer(request, API_URL, 'Giocatore');

    await signIn(page, player);

    await expect(page.getByRole('button', { name: 'Amministrazione' })).toHaveCount(0);
    await expect(page.getByText(/amministrazione/i)).toHaveCount(0);
  });
});

test.describe('Admin screen @admin', () => {
  test.skip(!E2E_DATABASE_URL, 'needs a server on PostgreSQL: set E2E_DATABASE_URL');

  test('the admin finds a user and corrects the credits with a reason: the player sees it at once', async ({ page, browser, request }) => {
    const admin = await registerAdmin(request, API_URL);
    const player = await registerPlayer(request, API_URL, 'Ricevente');
    const playerContext = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
    const playerPage = await playerContext.newPage();
    await signIn(playerPage, player);

    await adminScreen(page, admin);
    await find(page, player.name);
    await page.getByRole('button', { name: `Rettifica crediti di ${player.name}` }).click();
    await page.getByLabel('Importo').fill('100');
    await page.getByLabel('Motivo').fill('regalo di benvenuto');
    await page.getByRole('button', { name: 'Conferma rettifica' }).click();

    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('list', { name: 'Utenti' })).toContainText('100 crediti');
    await expect(playerPage.getByText('I tuoi crediti').locator('..')).toContainText('100');

    await page.getByRole('tab', { name: 'Registro' }).click();
    await expect(page.getByRole('list', { name: 'Azioni registrate' }).first()).toContainText('ha aggiunto 100 crediti al saldo di');
    await playerContext.close();
  });

  test('a rename: the new name logs in', async ({ page, request }) => {
    const admin = await registerAdmin(request, API_URL);
    const player = await registerPlayer(request, API_URL, 'Vecchio');
    const newName = `${player.name}_nuovo`;

    await adminScreen(page, admin);
    await find(page, player.name);
    await page.getByRole('button', { name: `Modifica ${player.name}` }).click();
    await page.getByLabel('Nuovo nome utente').fill(newName);
    await page.getByRole('button', { name: 'Salva nome' }).click();

    await expect(page.getByRole('list', { name: 'Utenti' })).toContainText(newName);
    const login = await request.post(`${API_URL}/api/auth/login`, { data: { username: newName, password: PASSWORD } });
    expect(login.status()).toBe(200);
  });

  test('a name already in use is explained in the dialog', async ({ page, request }) => {
    const admin = await registerAdmin(request, API_URL);
    const player = await registerPlayer(request, API_URL, 'Primo');
    const other = await registerPlayer(request, API_URL, 'Secondo');

    await adminScreen(page, admin);
    await find(page, player.name);
    await page.getByRole('button', { name: `Modifica ${player.name}` }).click();
    await page.getByLabel('Nuovo nome utente').fill(other.name);
    await page.getByRole('button', { name: 'Salva nome' }).click();

    await expect(page.getByRole('alert')).toContainText('già in uso');
  });

  for (const [width, height] of [[390, 844], [320, 640], [180, 370]]) {
    test(`fits a phone at ${width}px: no sideways scroll, every control at least 44px`, async ({ page, request }) => {
      const admin = await registerAdmin(request, API_URL);
      await registerPlayer(request, API_URL, 'Misura');
      await page.setViewportSize({ width, height });

      await adminScreen(page, admin);
      await page.getByRole('list', { name: 'Utenti' }).waitFor();

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
});
