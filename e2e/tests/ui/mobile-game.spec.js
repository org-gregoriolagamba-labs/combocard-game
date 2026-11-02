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
const VALORI = ['Asso', 'Due', 'Tre', 'Quattro', 'Cinque', 'Sei', 'Sette', 'Fante', 'Cavallo', 'Re'];

// The guide for a first game is read: the layout tests are about a player who knows the game
const GUIDA_LETTA = () => window.localStorage.setItem('combocard.guida-letta', '1');

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
  await page.addInitScript(GUIDA_LETTA);
  await page.goto('/');
  await page.getByLabel(/nome utente/i).fill(player.name);
  await page.getByLabel(/password/i).fill(PASSWORD);
  await page.getByRole('button', { name: /accedi/i }).click();
  await expect(page.getByRole('heading', { name: 'La tua cartella' })).toBeVisible();
}

/**
 * The sheet of the player is random, so the jolly would be possible only by luck.
 * The answer that loads the game is replaced with a known sheet: 25 different cards
 * (all Spade, all Coppe, Asso to Cinque of Denari) with Sei di Spade and Sei di Coppe
 * covered, so a tris is one card away and the jolly can turn any Denari into Sei di Denari.
 */
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
        p.id === player.id ? { ...p, cartella, coperte, jollyUsato: false, jollyPos: null } : p,
      );
      game.collezioni.tris.vinto = false;
    }
    await route.fulfill({ response, json: body });
  });
}

test.describe('Game screen on a phone @mobile', () => {
  test('the grid, the last card and the main action are in the same screen', async ({ page, request }) => {
    const { guest } = await startedGame(request);
    await signIn(page, guest);

    const viewportHeight = page.viewportSize().height;
    const bar = await page.getByTestId('barra-azione').boundingBox();
    const table = await page.getByRole('table').boundingBox();
    const lastDrawn = await page.getByText('Ultima carta').boundingBox();

    // The whole sheet (ten rows) sits between the header and the bar, with no scrolling
    expect(lastDrawn.y + lastDrawn.height).toBeLessThan(viewportHeight);
    expect(table.y + table.height).toBeLessThanOrEqual(bar.y);
    expect(bar.y + bar.height).toBeLessThanOrEqual(viewportHeight);
  });

  test('the whole sheet fits between the header and the bar on a small phone too', async ({ page, request }) => {
    const { guest } = await startedGame(request);
    await page.setViewportSize({ width: 360, height: 740 });
    await signIn(page, guest);

    const bar = await page.getByTestId('barra-azione').boundingBox();
    const table = await page.getByRole('table').boundingBox();

    expect(table.y + table.height).toBeLessThanOrEqual(bar.y);
  });

  test('the sheet is a tombola sheet: ten rows of values, four columns of suits, 25 cards', async ({ page, request }) => {
    const { guest } = await startedGame(request);
    await signIn(page, guest);

    await expect(page.getByRole('columnheader')).toHaveText(['Denari', 'Coppe', 'Spade', 'Bastoni']);
    await expect(page.getByRole('rowheader')).toHaveCount(10);
    await expect(page.getByRole('button', { name: NOME_CARTA })).toHaveCount(25);
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
        await expect(button).toHaveAccessibleName(/^(Usa il Jolly per |Jolly per .*: non ancora possibile)/);
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

    await page.getByRole('button', { name: 'Lascia la partita' }).click();
    const dialog = page.getByRole('dialog', { name: 'Uscire dalla partita?' });
    await expect(dialog).toContainText('perdi i crediti spesi per partecipare');
    await expect(dialog).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'La tua cartella' })).toBeVisible();
    expect(browserDialogs).toBe(0);
  });

  test('the jolly is used in two steps in the bar, only on the cards it can turn, without browser dialogs', async ({ page, request }) => {
    const { guest } = await startedGame(request);
    let dialogs = 0;
    page.on('dialog', async (dialog) => {
      dialogs += 1;
      await dialog.dismiss();
    });
    await withKnownSheet(page, guest);
    await signIn(page, guest);

    // Step 0: nothing can be tapped until a collection is chosen. The jolly is offered only
    // where one card is missing: with this sheet that is the tris, not the scopa
    await expect(page.locator('button[aria-pressed]:not([disabled])')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Jolly per SCOPA: non ancora possibile/ })).toBeDisabled();

    // The collection: the page goes to the sheet and the bar explains what to do
    await page.getByRole('button', { name: 'Usa il Jolly per TRIS' }).click();
    const mode = page.getByRole('group', { name: 'Modalità Jolly' });
    await expect(mode).toContainText('Jolly per TRIS: tocca una carta evidenziata (5)');
    await expect(page.getByRole('button', { name: 'Annulla' })).toBeFocused();

    // Only the five Denari can be turned into Sei di Denari; Sei di Spade is already in the sheet
    await expect(page.locator('button[aria-pressed]:not([disabled])')).toHaveCount(5);
    await expect(page.getByRole('button', { name: 'Asso di Spade' })).toBeDisabled();

    // Step 1: a card, by name, in the bar, with what it becomes. The chosen card stays above the bar
    const card = page.getByRole('button', { name: 'Asso di Denari' });
    await card.click();
    const confirm = page.getByRole('group', { name: 'Conferma Jolly' });
    await expect(confirm).toContainText('Per TRIS, il Jolly cambia Asso di Denari in Sei di Denari. Usarlo?');
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

  test('a player at the first game sees the guide, and "Ho capito" closes it for good', async ({ page, request }) => {
    const { guest } = await startedGame(request);
    await page.goto('/');
    await page.getByLabel(/nome utente/i).fill(guest.name);
    await page.getByLabel(/password/i).fill(PASSWORD);
    await page.getByRole('button', { name: /accedi/i }).click();

    const guida = page.getByRole('region', { name: 'Come si gioca' });
    await expect(guida).toContainText('si copre da sola');
    await guida.getByRole('button', { name: 'Ho capito' }).click();
    await expect(guida).toHaveCount(0);

    await page.reload();
    await expect(page.getByRole('heading', { name: 'La tua cartella' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Come si gioca' })).toHaveCount(0);
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
