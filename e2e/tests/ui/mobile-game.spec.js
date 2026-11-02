/**
 * Game screen on a phone
 *
 * The main flow with a phone-sized screen: the grid, the last card and the main
 * action are in the same screen, nothing scrolls sideways, every control is at
 * least 44 px, and the jolly is used in two steps in the bar, without browser dialogs.
 * @tags @mobile
 */

import { test, expect } from '@playwright/test';
import { registerPlayer, PASSWORD } from '../helpers/auth.js';

const API_URL = process.env.E2E_API_URL || 'http://localhost:3001';
const NOME_CARTA = /^(Asso|Due|Tre|Quattro|Cinque|Sei|Sette|Fante|Cavallo|Re) di (Spade|Coppe|Denari|Bastoni)/;

test.skip(({ browserName }) => browserName !== 'chromium', 'The layout is measured on Chromium');
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

/** A started game with two players, six cards already drawn */
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
  for (let i = 0; i < 6; i += 1) {
    await request.post(`${API_URL}/api/games/${gameId}/draw`, { headers: creator.headers });
  }

  return { creator, guest };
}

async function signIn(page, player) {
  await page.goto('/');
  await page.getByLabel(/nome utente/i).fill(player.name);
  await page.getByLabel(/password/i).fill(PASSWORD);
  await page.getByRole('button', { name: /accedi/i }).click();
  await expect(page.getByText(/Carte rimaste/)).toBeVisible();
}

test.describe('Game screen on a phone @mobile', () => {
  test('the grid, the last card and the main action are in the same screen', async ({ page, request }) => {
    const { guest } = await startedGame(request);
    await signIn(page, guest);

    const viewportHeight = page.viewportSize().height;
    const bar = await page.getByTestId('barra-azione').boundingBox();
    const lastCard = await page.getByRole('button', { name: NOME_CARTA }).last().boundingBox();
    const lastDrawn = await page.getByText('Ultima Carta').boundingBox();

    expect(lastDrawn.y + lastDrawn.height).toBeLessThan(viewportHeight);
    expect(lastCard.y + lastCard.height).toBeLessThanOrEqual(bar.y);
    expect(bar.y + bar.height).toBeLessThanOrEqual(viewportHeight);
  });

  test('nothing scrolls sideways and every control is at least 44 px', async ({ page, request }) => {
    const { guest } = await startedGame(request);
    await signIn(page, guest);

    const { scrollWidth, innerWidth, small } = await page.evaluate(() => {
      const visible = (el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
      };
      const controls = [...document.querySelectorAll('button, a, input, select')].filter(visible);
      return {
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
        small: controls
          .map((el) => ({ el, r: el.getBoundingClientRect() }))
          .filter(({ r }) => r.width < 43.5 || r.height < 43.5)
          .map(({ el, r }) => `${(el.innerText || el.getAttribute('aria-label') || el.tagName).trim().slice(0, 20)} ${Math.round(r.width)}x${Math.round(r.height)}`),
      };
    });

    expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
    expect(small).toEqual([]);
  });

  test('the creator draws from the bar, the others are told who draws', async ({ browser, request }) => {
    const { creator, guest } = await startedGame(request);
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const creatorPage = await context.newPage();

    await signIn(creatorPage, creator);
    await expect(creatorPage.getByRole('button', { name: /Estrai Carta|Attendi/ })).toBeVisible();
    await context.close();

    const guestContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const guestPage = await guestContext.newPage();
    await signIn(guestPage, guest);
    await expect(guestPage.getByRole('status')).toContainText(`Estrae ${creator.name}`);
    await expect(guestPage.getByRole('button', { name: /Estrai Carta/ })).toHaveCount(0);
    await guestContext.close();
  });

  test('the jolly is used in two steps in the bar, without browser dialogs', async ({ page, request }) => {
    const { guest } = await startedGame(request);
    let dialogs = 0;
    page.on('dialog', async (dialog) => {
      dialogs += 1;
      await dialog.dismiss();
    });
    await signIn(page, guest);

    // Step 0: nothing can be tapped until a collection is chosen
    await expect(page.getByRole('button', { name: NOME_CARTA }).first()).toBeDisabled();

    // The collection: the page goes to the grid and the bar explains what to do
    await page.getByRole('button', { name: 'Usa Jolly' }).first().click();
    const mode = page.getByRole('group', { name: 'Modalità Jolly' });
    await expect(mode).toContainText('tocca una carta non coperta');
    await expect(page.getByRole('button', { name: 'Annulla' })).toBeFocused();

    // Step 1: a card, by name, in the bar. The chosen card stays above the bar
    const card = page.locator('button[aria-pressed]:not([disabled])').first();
    const name = await card.getAttribute('aria-label');
    await card.click();
    const confirm = page.getByRole('group', { name: 'Conferma Jolly' });
    await expect(confirm).toContainText(`sulla carta ${name}`);
    await expect(card).toHaveAttribute('aria-pressed', 'true');
    const bar = await page.getByTestId('barra-azione').boundingBox();
    const chosen = await card.boundingBox();
    expect(chosen.y + chosen.height).toBeLessThanOrEqual(bar.y);

    // Change idea, then leave the mode
    await confirm.getByRole('button', { name: 'Cambia carta' }).click();
    await expect(mode).toBeVisible();
    await mode.getByRole('button', { name: 'Annulla' }).click();
    await expect(page.getByRole('group', { name: 'Modalità Jolly' })).toHaveCount(0);

    expect(dialogs).toBe(0);
  });
});
