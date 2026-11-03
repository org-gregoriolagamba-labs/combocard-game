/**
 * Rules confirmation on screen
 *
 * A new player reads the rules and declares it before anything else; a lobby says who
 * the game is waiting for.
 * @tags @mobile @rules
 */

import { test, expect } from '@playwright/test';
import { registerPlayer, PASSWORD, uniqueUsername } from '../helpers/auth.js';

const API_URL = process.env.E2E_API_URL || 'http://localhost:3001';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

const rulesHeading = (page) => page.getByRole('heading', { name: 'Prima di giocare: le regole' });

async function signIn(page, player) {
  await page.goto('/');
  await page.getByLabel(/nome utente/i).fill(player.name);
  await page.getByLabel(/password/i).fill(PASSWORD);
  await page.getByRole('button', { name: /accedi/i }).click();
}

test.describe('Rules confirmation @rules', () => {
  test('a new player must read the rules to the end before declaring, and then goes on', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /crea un account/i }).click();
    await page.getByLabel(/nome utente/i).fill(uniqueUsername('Nuovo'));
    await page.getByLabel(/password/i).fill(PASSWORD);
    await page.getByRole('button', { name: /registrati/i }).click();

    await expect(rulesHeading(page)).toBeVisible({ timeout: 10000 });
    const declaration = page.getByLabel(/Ho letto e compreso le regole/);
    const proceed = page.getByRole('button', { name: 'Confermo e continuo' });
    await expect(declaration).toBeDisabled();
    await expect(proceed).toBeDisabled();

    await page.getByTestId('fine-regole').scrollIntoViewIfNeeded();
    await expect(declaration).toBeEnabled();
    await declaration.check();
    await proceed.click();

    await expect(page.getByRole('heading', { name: 'Hall' })).toBeVisible({ timeout: 10000 });
  });

  test('the confirmation is remembered: it is not asked again at the next access', async ({ page, request }) => {
    const player = await registerPlayer(request, API_URL, 'Ritorno', { acceptRules: false });
    await signIn(page, player);
    await expect(rulesHeading(page)).toBeVisible({ timeout: 10000 });
    await page.getByTestId('fine-regole').scrollIntoViewIfNeeded();
    await page.getByLabel(/Ho letto e compreso le regole/).check();
    await page.getByRole('button', { name: 'Confermo e continuo' }).click();
    await expect(page.getByRole('heading', { name: 'Hall' })).toBeVisible({ timeout: 10000 });

    await page.reload();

    await expect(page.getByRole('heading', { name: 'Hall' })).toBeVisible({ timeout: 10000 });
    await expect(rulesHeading(page)).toHaveCount(0);
  });

  test('a lobby says that the game waits for a player who has not confirmed, and goes on when they do', async ({ page, request }) => {
    const creator = await registerPlayer(request, API_URL, 'Creatore');
    const guest = await registerPlayer(request, API_URL, 'Lettore', { acceptRules: false });
    for (const player of [creator, guest]) {
      await request.post(`${API_URL}/api/players/${player.id}/buy-credits`, { headers: player.headers, data: { amount: 500 } });
    }
    const created = await request.post(`${API_URL}/api/games`, { headers: creator.headers, data: { requiredCredits: 100, maxPlayers: 4 } });
    const { gameId } = (await created.json()).data;
    for (const player of [creator, guest]) {
      await request.post(`${API_URL}/api/games/${gameId}/join`, { headers: player.headers });
    }

    await signIn(page, creator);

    await expect(page.getByRole('status', { name: /regole/i })).toContainText(`In attesa che ${guest.name} confermi di aver letto le regole`);
    await expect(page.getByRole('button', { name: 'Inizia Partita' })).toHaveCount(0);

    await request.post(`${API_URL}/api/players/${guest.id}/accept-rules`, { headers: guest.headers });

    await expect(page.getByRole('button', { name: 'Inizia Partita' })).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole('status', { name: /regole/i })).toHaveCount(0);
  });
});
