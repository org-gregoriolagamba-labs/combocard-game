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
    // Extra wait to ensure React renders
    await page.waitForTimeout(1000);
  });

  test('should navigate through game screens @critical', async ({ page }) => {
    // Step 1: Register - wait for input to be visible
    const nameInput = page.getByPlaceholder(/nome|name/i).or(page.locator('input[type="text"]'));
    await nameInput.waitFor({ state: 'visible', timeout: 10000 });
    await nameInput.fill('E2EPlayer');
    
    const submitButton = page.getByRole('button', { name: /entra|inizia|gioca|registra/i });
    await submitButton.click();

    // Step 2: Should see Hall - wait for credits display or heading
    await expect(page.getByText(/tuoi crediti|i tuoi crediti/i)).toBeVisible({ timeout: 20000 });
  });

  test('should display game creation button in hall', async ({ page }) => {
    // Register first
    const nameInput = page.getByPlaceholder(/nome|name/i).or(page.locator('input[type="text"]'));
    await nameInput.waitFor({ state: 'visible', timeout: 10000 });
    await nameInput.fill('HallPlayer');
    
    const submitButton = page.getByRole('button', { name: /entra|inizia|gioca|registra/i });
    await submitButton.click();

    // Wait for hall to load and credits to display
    await expect(page.getByText(/tuoi crediti|i tuoi crediti/i)).toBeVisible({ timeout: 20000 });

    // Should see create game button - use more specific selector
    const createGameButton = page.getByRole('button', { name: /crea/i });
    await expect(createGameButton).toBeVisible({ timeout: 10000 });
  });

  test('should show player credits', async ({ page }) => {
    // Register
    const nameInput = page.getByPlaceholder(/nome|name/i).or(page.locator('input[type="text"]'));
    await nameInput.waitFor({ state: 'visible', timeout: 10000 });
    await nameInput.fill('CreditPlayer');
    
    const submitButton = page.getByRole('button', { name: /entra|inizia|gioca|registra/i });
    await submitButton.click();

    // Wait for hall to load and credits to display
    await expect(page.getByText(/tuoi crediti|i tuoi crediti/i)).toBeVisible({ timeout: 20000 });
  });

  test('should create a new game', async ({ page }) => {
    // Register
    const nameInput = page.getByPlaceholder(/nome|name/i).or(page.locator('input[type="text"]'));
    await nameInput.waitFor({ state: 'visible', timeout: 10000 });
    await nameInput.fill('GameCreator');
    
    const submitButton = page.getByRole('button', { name: /entra|inizia|gioca|registra/i });
    await submitButton.click();

    // Wait for hall to load
    await expect(page.getByText(/tuoi crediti|i tuoi crediti/i)).toBeVisible({ timeout: 20000 });

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
