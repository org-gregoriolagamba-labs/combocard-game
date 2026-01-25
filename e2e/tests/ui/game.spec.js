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
    const nameInput = page.getByPlaceholder(/nome|name/i).or(page.locator('input[type="text"]'));
    await nameInput.fill('E2EPlayer');
    
    const submitButton = page.getByRole('button', { name: /registra|inizia|gioca|entra/i });
    await submitButton.click();

    // Step 2: Should see Hall
    await expect(page.getByRole('heading', { name: /hall|combocard/i })).toBeVisible({ timeout: 10000 });
  });

  test('should display game creation button in hall', async ({ page }) => {
    await page.goto('/');

    // Register first
    const nameInput = page.getByPlaceholder(/nome|name/i).or(page.locator('input[type="text"]'));
    await nameInput.fill('HallPlayer');
    
    const submitButton = page.getByRole('button', { name: /registra|inizia|gioca|entra/i });
    await submitButton.click();

    // Wait for hall to load
    await expect(page.getByRole('heading', { name: /hall|combocard/i })).toBeVisible({ timeout: 10000 });

    // Should see create game button
    const createGameButton = page.getByRole('button', { name: /crea|nuova partita|new game/i });
    await expect(createGameButton).toBeVisible();
  });

  test('should show player credits', async ({ page }) => {
    await page.goto('/');

    // Register
    const nameInput = page.getByPlaceholder(/nome|name/i).or(page.locator('input[type="text"]'));
    await nameInput.fill('CreditPlayer');
    
    const submitButton = page.getByRole('button', { name: /registra|inizia|gioca|entra/i });
    await submitButton.click();

    // Wait for hall to load and credits to display
    await expect(page.getByText('I Tuoi Crediti')).toBeVisible({ timeout: 10000 });
  });

  test('should create a new game', async ({ page }) => {
    await page.goto('/');

    // Register
    const nameInput = page.getByPlaceholder(/nome|name/i).or(page.locator('input[type="text"]'));
    await nameInput.fill('GameCreator');
    
    const submitButton = page.getByRole('button', { name: /registra|inizia|gioca|entra/i });
    await submitButton.click();

    // Wait for hall to load
    await expect(page.getByRole('heading', { name: /hall|combocard/i })).toBeVisible({ timeout: 10000 });

    // Create game
    const createGameButton = page.getByRole('button', { name: /crea|nuova partita|new game/i });
    await createGameButton.click();

    // Should navigate to lobby
    await expect(page.getByRole('heading', { name: /attesa|waiting/i })).toBeVisible({ timeout: 10000 });
  });
});
