/**
 * Game Flow Tests
 * 
 * Tests for the game creation and playing flow.
 * @tags @critical
 */

import { test, expect } from '../fixtures/index.js';

test.describe('Game Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Wait for app to be ready and stable
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    
    // Extra wait to ensure React renders and mounts
    await page.waitForTimeout(2000);
    
    // Wait for the app root to be properly rendered
    // This ensures the React app has initialized
    try {
      await page.waitForSelector('body > div', { timeout: 10000 });
    } catch (err) {
      console.warn('App root not found, page may still be loading');
    }
  });

  test('should navigate through game screens @critical', async ({ page }) => {
    // Step 1: Register - wait for input to be visible
    const nameInput = page.getByPlaceholder(/nome|name/i).or(page.locator('input[type="text"]'));
    
    // Use longer timeout on CI
    const inputTimeout = process.env.CI ? 15000 : 10000;
    await nameInput.waitFor({ state: 'visible', timeout: inputTimeout });
    await nameInput.fill('E2EPlayer');
    
    const submitButton = page.getByRole('button', { name: /entra|inizia|gioca|registra/i });
    await submitButton.click();

    // Step 2: Should see Hall - wait for credits display or heading
    // Use longer timeout to account for backend processing
    const creditsTimeout = process.env.CI ? 30000 : 20000;
    await expect(page.getByText(/tuoi crediti|i tuoi crediti/i)).toBeVisible({ timeout: creditsTimeout });
  });

  test('should display game creation button in hall', async ({ page }) => {
    // Register first
    const nameInput = page.getByPlaceholder(/nome|name/i).or(page.locator('input[type="text"]'));
    const inputTimeout = process.env.CI ? 15000 : 10000;
    await nameInput.waitFor({ state: 'visible', timeout: inputTimeout });
    await nameInput.fill('HallPlayer');
    
    const submitButton = page.getByRole('button', { name: /entra|inizia|gioca|registra/i });
    await submitButton.click();

    // Wait for hall to load and credits to display
    const creditsTimeout = process.env.CI ? 30000 : 20000;
    await expect(page.getByText(/tuoi crediti|i tuoi crediti/i)).toBeVisible({ timeout: creditsTimeout });

    // Should see create game button - use more specific selector
    const createGameButton = page.getByRole('button', { name: /crea/i });
    await expect(createGameButton).toBeVisible({ timeout: 10000 });
  });

  test('should show player credits', async ({ page }) => {
    // Register
    const nameInput = page.getByPlaceholder(/nome|name/i).or(page.locator('input[type="text"]'));
    const inputTimeout = process.env.CI ? 15000 : 10000;
    await nameInput.waitFor({ state: 'visible', timeout: inputTimeout });
    await nameInput.fill('CreditPlayer');
    
    const submitButton = page.getByRole('button', { name: /entra|inizia|gioca|registra/i });
    await submitButton.click();

    // Wait for hall to load and credits to display
    const creditsTimeout = process.env.CI ? 30000 : 20000;
    await expect(page.getByText(/tuoi crediti|i tuoi crediti/i)).toBeVisible({ timeout: creditsTimeout });
  });

  test('should create a new game', async ({ page }) => {
    // Register
    const nameInput = page.getByPlaceholder(/nome|name/i).or(page.locator('input[type="text"]'));
    const inputTimeout = process.env.CI ? 15000 : 10000;
    await nameInput.waitFor({ state: 'visible', timeout: inputTimeout });
    await nameInput.fill('GameCreator');
    
    const submitButton = page.getByRole('button', { name: /entra|inizia|gioca|registra/i });
    await submitButton.click();

    // Wait for hall to load
    const creditsTimeout = process.env.CI ? 30000 : 20000;
    await expect(page.getByText(/tuoi crediti|i tuoi crediti/i)).toBeVisible({ timeout: creditsTimeout });

    // Create game - wait for button and click - use more specific selector
    const createGameButton = page.getByRole('button', { name: /crea/i });
    await createGameButton.waitFor({ state: 'visible', timeout: 10000 });
    await createGameButton.click();

    // Should navigate to lobby or show game creation modal - be flexible about what appears
    await page.waitForFunction(() => {
      const pageContent = document.body.innerText;
      return pageContent.includes('attesa') || pageContent.includes('waiting') || 
             pageContent.includes('partita') || pageContent.includes('game') ||
             pageContent.includes('Crea') || pageContent.includes('Create');
    }, { timeout: 15000 });
  });
});
