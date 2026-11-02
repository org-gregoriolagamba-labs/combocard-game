/**
 * Game screen on a phone
 *
 * The main flow with a phone-sized screen: the grid, the last card and the main
 * action are in the same screen, nothing scrolls sideways, every control is at
 * least 44 px, and the jolly is used in two steps in the bar, without browser dialogs.
 * The page speaks Italian, errors appear once, the Cassa is an accessible dialog,
 * and leaving a game in progress is asked in a dialog that names the consequence.
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

async function signInHall(page, player) {
  await page.goto('/');
  await page.getByLabel(/nome utente/i).fill(player.name);
  await page.getByLabel(/password/i).fill(PASSWORD);
  await page.getByRole('button', { name: /accedi/i }).click();
  await expect(page.getByRole('button', { name: 'Cassa' })).toBeVisible();
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

  test('the collections are information: there is nothing to claim by hand', async ({ page, request }) => {
    const { guest } = await startedGame(request);
    await signIn(page, guest);

    // Each row shows its progress or its winner; the only control it can have is the jolly.
    // A collection may already be won after a few random draws, so the jolly is not a given.
    for (const tipo of ['tris', 'sequenza', 'scopa', 'napola', 'combocard_reale']) {
      const row = page.getByTestId(`collezione-${tipo}`);
      await expect(row).toBeVisible();
      await expect(row).toContainText(/Premio \d+/);
      for (const button of await row.getByRole('button').all()) {
        await expect(button).toHaveAccessibleName(/^Usa il Jolly per /);
      }
    }
  });

  test('leaving a game in progress is asked in a dialog, and Esc stays', async ({ page, request }) => {
    const { guest } = await startedGame(request);
    let browserDialogs = 0;
    page.on('dialog', async (dialog) => {
      browserDialogs += 1;
      await dialog.dismiss();
    });
    await signIn(page, guest);

    await page.getByRole('button', { name: /Hall/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Uscire dalla partita?' });
    await expect(dialog).toContainText('perdi i crediti spesi per partecipare');
    await expect(dialog).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(page.getByText(/Carte rimaste/)).toBeVisible();
    expect(browserDialogs).toBe(0);
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
    // Any collection will do: one may already be won, and then it has no jolly button
    await page.getByRole('button', { name: /^Usa il Jolly per / }).first().click();
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

test.describe('Login and Cassa on a phone @mobile', () => {
  test('the page speaks Italian', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle('ComboCard');
    await expect(page.locator('html')).toHaveAttribute('lang', 'it');
  });

  test('a wrong password is shown once, in the form', async ({ page, request }) => {
    const player = await registerPlayer(request, API_URL, 'Accesso');
    await page.goto('/');

    await page.getByLabel(/nome utente/i).fill(player.name);
    await page.getByLabel(/password/i).fill('not the password');
    await page.getByRole('button', { name: /accedi/i }).click();

    await expect(page.getByRole('alert')).toHaveCount(1);
    await expect(page.getByRole('alert')).toHaveText('Nome utente o password non corretti');
  });

  test('the Cassa is a dialog that says the credits are play money, and gives the focus back', async ({ page, request }) => {
    const player = await registerPlayer(request, API_URL, 'Cassa');
    await signInHall(page, player);

    const cassa = page.getByRole('button', { name: 'Cassa' });
    await cassa.click();
    const dialog = page.getByRole('dialog', { name: 'Cassa: aggiungi crediti' });
    await expect(dialog).toContainText('crediti di gioco');
    await expect(dialog).toBeFocused();
    await expect(page.getByLabel('Importo da aggiungere')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Scegli un importo' })).toBeDisabled();

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(cassa).toBeFocused();

    await cassa.click();
    await page.getByRole('button', { name: '+100', exact: true }).click();
    await page.getByRole('button', { name: 'Aggiungi 100 crediti' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole('status')).toContainText('Aggiunti 100 crediti');
  });
});
