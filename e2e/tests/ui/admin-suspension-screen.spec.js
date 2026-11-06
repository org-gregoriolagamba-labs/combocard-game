/**
 * Admin screen: suspension and sessions
 *
 * The admin suspends a user from the Utenti tab: the user, who is playing at that moment, is sent
 * back to the start with the reason, and cannot log in until reinstated. Needs a server on
 * PostgreSQL (E2E_DATABASE_URL).
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
  await expect(page.getByRole('heading', { name: 'Hall' })).toBeVisible({ timeout: 10000 });
}

const find = async (page, name) => {
  await page.getByLabel('Cerca per nome').fill(name);
  await page.getByRole('button', { name: 'Cerca' }).click();
  await expect(page.getByRole('list', { name: 'Utenti' }).getByRole('listitem')).toHaveCount(1);
};

test.describe('Admin screen: suspension @admin', () => {
  test('the admin suspends a connected user, who is sent back to the start and cannot log in until reinstated', async ({ page, browser, request }) => {
    const admin = await registerAdmin(request, API_URL);
    const player = await registerPlayer(request, API_URL, 'Connesso');
    const playerContext = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
    const playerPage = await playerContext.newPage();
    await signIn(playerPage, player);

    await signIn(page, admin);
    await page.getByRole('button', { name: 'Amministrazione' }).click();
    await find(page, player.name);
    await page.getByRole('button', { name: `Accesso di ${player.name}` }).click();
    await page.getByLabel('Motivo').fill('abuso');
    await page.getByRole('button', { name: "Sospendi l'accesso" }).click();

    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('list', { name: 'Utenti' })).toContainText('Sospeso');
    await expect(playerPage.getByText('Il tuo account è stato sospeso')).toBeVisible({ timeout: 10000 });
    await expect(playerPage.getByLabel(/nome utente/i)).toBeVisible();

    await playerPage.getByLabel(/nome utente/i).fill(player.name);
    await playerPage.getByLabel(/password/i).fill(PASSWORD);
    await playerPage.getByRole('button', { name: /accedi/i }).click();
    await expect(playerPage.getByRole('alert')).toContainText('sospeso');

    await page.getByRole('button', { name: `Accesso di ${player.name}` }).click();
    await page.getByLabel('Motivo').fill('chiarito');
    await page.getByRole('button', { name: "Riabilita l'accesso" }).click();
    await expect(page.getByRole('list', { name: 'Utenti' })).not.toContainText('Sospeso');

    await playerPage.getByRole('button', { name: /accedi/i }).click();
    await expect(playerPage.getByRole('heading', { name: 'Hall' })).toBeVisible({ timeout: 10000 });
    await playerContext.close();
  });

  test('the admin has no access button on their own row', async ({ page, request }) => {
    const admin = await registerAdmin(request, API_URL);

    await signIn(page, admin);
    await page.getByRole('button', { name: 'Amministrazione' }).click();
    await find(page, admin.name);

    await expect(page.getByRole('button', { name: `Accesso di ${admin.name}` })).toHaveCount(0);
  });
});
