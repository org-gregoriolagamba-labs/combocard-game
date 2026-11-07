/**
 * Deletion of one's own account, from the hall
 *
 * The button waits for the username written by hand; with the password the player is taken to the login
 * with the notice and cannot come back; a wrong password is explained in the dialog. The dialog fits a phone.
 * @tags @mobile
 */

import { test, expect } from '@playwright/test';
import { PASSWORD, registerPlayer } from '../helpers/auth.js';

const API_URL = process.env.E2E_API_URL || 'http://localhost:3001';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

async function signIn(page, name, password = PASSWORD) {
  await page.goto('/');
  await page.getByLabel(/nome utente/i).fill(name);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /accedi/i }).click();
}

async function openDialog(page, player) {
  await signIn(page, player.name);
  await expect(page.getByRole('heading', { name: 'Hall' })).toBeVisible({ timeout: 10000 });
  await page.getByRole('button', { name: 'Elimina il mio account' }).click();
  await expect(page.getByRole('dialog', { name: 'Elimina il mio account' })).toBeVisible();
}

test.describe('Deletion of one\'s own account @mobile', () => {
  test('the player deletes the account, is taken to the login with the notice, and cannot come back', async ({ page, request }) => {
    const player = await registerPlayer(request, API_URL, 'Eliminato');

    await openDialog(page, player);
    const confirm = page.getByRole('button', { name: 'Elimina definitivamente' });
    await expect(confirm).toBeDisabled();
    await page.getByLabel('La tua password').fill(PASSWORD);
    await page.getByLabel('Scrivi il tuo nome utente per confermare').fill(player.name.toLowerCase());
    await expect(confirm).toBeDisabled();
    await page.getByLabel('Scrivi il tuo nome utente per confermare').fill(player.name);
    await confirm.click();

    await expect(page.getByText('Il tuo account è stato eliminato')).toBeVisible({ timeout: 10000 });
    await expect(page.getByLabel(/nome utente/i)).toBeVisible();
    await page.getByLabel(/nome utente/i).fill(player.name);
    await page.getByLabel(/password/i).fill(PASSWORD);
    await page.getByRole('button', { name: /accedi/i }).click();
    await expect(page.getByRole('alert')).toContainText('non corretti');
  });

  test('a wrong password is explained in the dialog, which stays open, and the player stays', async ({ page, request }) => {
    const player = await registerPlayer(request, API_URL, 'Giocatore');

    await openDialog(page, player);
    await page.getByLabel('La tua password').fill('sbagliata');
    await page.getByLabel('Scrivi il tuo nome utente per confermare').fill(player.name);
    await page.getByRole('button', { name: 'Elimina definitivamente' }).click();

    await expect(page.getByRole('alert')).toContainText('La password attuale non è corretta');
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('the same account on two devices: the other device is sent to the login too', async ({ page, browser, request }) => {
    const player = await registerPlayer(request, API_URL, 'DueDispositivi');
    const other = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
    const otherPage = await other.newPage();
    await signIn(otherPage, player.name);
    await expect(otherPage.getByRole('heading', { name: 'Hall' })).toBeVisible({ timeout: 10000 });

    await openDialog(page, player);
    await page.getByLabel('La tua password').fill(PASSWORD);
    await page.getByLabel('Scrivi il tuo nome utente per confermare').fill(player.name);
    await page.getByRole('button', { name: 'Elimina definitivamente' }).click();

    await expect(otherPage.getByText('Il tuo account è stato eliminato')).toBeVisible({ timeout: 10000 });
    await expect(otherPage.getByLabel(/nome utente/i)).toBeVisible();
    await other.close();
  });

  for (const [width, height] of [[320, 640], [180, 370]]) {
    test(`the dialog fits a phone at ${width}px: no sideways scroll, every control at least 44px`, async ({ page, request }) => {
      const player = await registerPlayer(request, API_URL, 'Misura');
      await page.setViewportSize({ width, height });

      await openDialog(page, player);

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
