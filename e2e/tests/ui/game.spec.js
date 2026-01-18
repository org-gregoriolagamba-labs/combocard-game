/**
 * Game Flow Tests
 * 
 * Tests for the game creation and playing flow.
 * @tags @critical
 */

import { test, expect } from '../fixtures/index.js';

test.describe('Game Flow', () => {
  test('should navigate through game screens @critical', async ({ page }) => {
    await page.goto('/');

    // Step 1: Register
    const nameInput = page.getByRole('textbox').or(page.locator('input[type="text"]'));
    await nameInput.fill('E2EPlayer');
    
    const submitButton = page.getByRole('button', { name: /registra|inizia|gioca|entra/i });
    await submitButton.click();

    // Step 2: Should see Hall
    await expect(page.getByText(/hall|lobby|partite/i)).toBeVisible({ timeout: 10000 });
  });

  test('should display game creation button in hall', async ({ page }) => {
    await page.goto('/');

    // Register first
    const nameInput = page.getByRole('textbox').or(page.locator('input[type="text"]'));
    await nameInput.fill('HallPlayer');
    
    const submitButton = page.getByRole('button', { name: /registra|inizia|gioca|entra/i });
    await submitButton.click();

    // Wait for hall to load
    await page.waitForTimeout(2000);

    // Should see create game button
    const createGameButton = page.getByRole('button', { name: /crea|nuova partita|new game/i });
    await expect(createGameButton).toBeVisible();
  });

  test('should show player credits', async ({ page }) => {
    await page.goto('/');

    // Register
    const nameInput = page.getByRole('textbox').or(page.locator('input[type="text"]'));
    await nameInput.fill('CreditPlayer');
    
    const submitButton = page.getByRole('button', { name: /registra|inizia|gioca|entra/i });
    await submitButton.click();

    // Wait for navigation
    await page.waitForTimeout(2000);

    // Should display credits (100 initial credits)
    await expect(page.getByText(/100|crediti|gettoni/i)).toBeVisible();
  });

  test('should create a new game', async ({ page }) => {
    await page.goto('/');

    // Register
    const nameInput = page.getByRole('textbox').or(page.locator('input[type="text"]'));
    await nameInput.fill('GameCreator');
    
    const submitButton = page.getByRole('button', { name: /registra|inizia|gioca|entra/i });
    await submitButton.click();

    // Wait for hall
    await page.waitForTimeout(2000);

    // Create game
    const createGameButton = page.getByRole('button', { name: /crea|nuova partita|new game/i });
    await createGameButton.click();

    // Should navigate to lobby
    await expect(page.getByText(/lobby|attesa|waiting/i)).toBeVisible({ timeout: 10000 });
  });
});
