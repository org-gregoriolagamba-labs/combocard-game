/**
 * Homepage Tests
 * 
 * @tags @smoke @critical
 */

import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the homepage correctly @smoke @critical', async ({ page }) => {
    // Check page loaded - look for ComboCard branding
    await expect(page.getByRole('heading', { name: /combocard/i })).toBeVisible();
  });

  test('should display player registration form', async ({ page }) => {
    // Check for name input
    const nameInput = page.getByRole('textbox').or(page.locator('input[type="text"]'));
    await expect(nameInput).toBeVisible();

    // Check for submit/register button
    const submitButton = page.getByRole('button', { name: /registra|inizia|gioca|entra/i });
    await expect(submitButton).toBeVisible();
  });

  test('should show validation error for empty name', async ({ page }) => {
    // Try to submit without entering a name
    const submitButton = page.getByRole('button', { name: /registra|inizia|gioca|entra/i });
    await submitButton.click();

    // Should show some validation feedback
    // Either the form doesn't submit or shows an error
    await expect(page).toHaveURL('/'); // Still on homepage
  });

  test('should register player with valid name @critical', async ({ page }) => {
    // Enter player name
    const nameInput = page.getByRole('textbox').or(page.locator('input[type="text"]'));
    await nameInput.fill('TestPlayer');

    // Submit registration
    const submitButton = page.getByRole('button', { name: /registra|inizia|gioca|entra/i });
    await submitButton.click();

    // Should navigate to hall or show logged in state
    await expect(page.locator('text=Hall').or(page.locator('text=TestPlayer'))).toBeVisible({ timeout: 10000 });
  });

  test('should be responsive on mobile @smoke', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Page should still be usable
    await expect(page.getByRole('heading', { name: /combocard/i })).toBeVisible();
  });

  test('should load without console errors @smoke', async ({ page }) => {
    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Filter out known acceptable errors
    const criticalErrors = errors.filter(
      (e) => !e.includes('favicon') && !e.includes('404') && !e.includes('WebSocket')
    );

    expect(criticalErrors).toHaveLength(0);
  });
});
