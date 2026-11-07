/**
 * Admin screen: reset of the password
 *
 * The admin resets the password from the Utenti tab and reads the temporary one once. The user logs in
 * with it, can only choose a new password, and then reaches the hall. Needs a server on PostgreSQL
 * (E2E_DATABASE_URL).
 * @tags @mobile @admin
 */

import { test, expect } from '@playwright/test';
import { PASSWORD, registerPlayer } from '../helpers/auth.js';
import { E2E_DATABASE_URL, registerAdmin } from '../helpers/admin.js';

const API_URL = process.env.E2E_API_URL || 'http://localhost:3001';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });
test.skip(!E2E_DATABASE_URL, 'needs a server on PostgreSQL: set E2E_DATABASE_URL');

async function signIn(page, name, password) {
  await page.goto('/');
  await page.getByLabel(/nome utente/i).fill(name);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /accedi/i }).click();
}

test.describe('Admin screen: password reset @admin', () => {
  test('the admin reads the temporary password once, the user chooses a new one and plays', async ({ page, browser, request }) => {
    const admin = await registerAdmin(request, API_URL);
    const player = await registerPlayer(request, API_URL, 'Dimentica');

    await signIn(page, admin.name, PASSWORD);
    await expect(page.getByRole('heading', { name: 'Hall' })).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Amministrazione' }).click();
    await page.getByLabel('Cerca per nome').fill(player.name);
    await page.getByRole('button', { name: 'Cerca' }).click();
    await page.getByRole('button', { name: `Accesso di ${player.name}` }).click();
    await page.getByLabel('Motivo').fill('dimenticata');
    await page.getByRole('button', { name: 'Reimposta la password' }).click();

    const shown = page.getByLabel('Password provvisoria');
    await expect(shown).toBeVisible();
    const temporary = (await shown.textContent()).trim();
    expect(temporary).toMatch(/^[A-Z2-9]{4}(-[A-Z2-9]{4}){2}$/);
    await page.getByRole('button', { name: 'Fatto' }).click();
    await expect(page.getByText(temporary)).toHaveCount(0);

    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
    const playerPage = await context.newPage();
    await signIn(playerPage, player.name, PASSWORD);
    await expect(playerPage.getByRole('alert')).toContainText('non corretti');

    await playerPage.getByLabel(/password/i).fill(temporary);
    await playerPage.getByRole('button', { name: /accedi/i }).click();
    await expect(playerPage.getByRole('heading', { name: 'Scegli una nuova password' })).toBeVisible({ timeout: 10000 });
    await expect(playerPage.getByRole('heading', { name: 'Hall' })).toHaveCount(0);

    await playerPage.getByLabel('Password provvisoria').fill(temporary);
    await playerPage.getByLabel('Nuova password', { exact: true }).fill('una password mia');
    await playerPage.getByLabel('Ripeti la nuova password').fill('una password mia');
    await playerPage.getByRole('button', { name: 'Salva la nuova password' }).click();

    // A player who never read the rules goes through them first; the hall or the rules, never the password again
    await expect(playerPage.getByRole('heading', { name: 'Scegli una nuova password' })).toHaveCount(0);
    await expect(playerPage.getByRole('heading', { name: /Hall|Prima di giocare/ })).toBeVisible({ timeout: 10000 });
    await context.close();
  });

  for (const [width, height] of [[390, 844], [320, 640], [180, 370]]) {
    test(`the screen of the new password fits a phone at ${width}px`, async ({ page, request }) => {
      const admin = await registerAdmin(request, API_URL);
      const player = await registerPlayer(request, API_URL, 'Misura');
      const reset = await request.post(`${API_URL}/api/admin/users/${player.id}/password/reset`, { headers: admin.headers, data: { reason: 'misura' } });
      const { temporaryPassword } = (await reset.json()).data;
      await page.setViewportSize({ width, height });

      await signIn(page, player.name, temporaryPassword);
      await expect(page.getByRole('heading', { name: 'Scegli una nuova password' })).toBeVisible({ timeout: 10000 });

      const { overflow, small } = await page.evaluate(() => {
        const visible = (el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
        };
        const controls = [...document.querySelectorAll('button, a, input')].filter(visible);
        return {
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          small: controls.filter((el) => el.getBoundingClientRect().height < 44).map((el) => el.textContent || el.id),
        };
      });
      expect(overflow).toBeLessThanOrEqual(0);
      expect(small).toEqual([]);
    });
  }
});
