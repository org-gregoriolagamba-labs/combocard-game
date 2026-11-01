/**
 * Homepage and Session Tests
 *
 * @tags @smoke @critical
 */

import { test, expect } from '@playwright/test';
import { PASSWORD, uniqueUsername } from '../helpers/auth.js';

const usernameInput = (page) => page.getByLabel(/nome utente/i);
const passwordInput = (page) => page.getByLabel(/password/i);
const hallHeading = (page) => page.getByRole('heading', { name: /hall/i });

async function signUp(page, username = uniqueUsername('Ui')) {
  await page.getByRole('button', { name: /crea un account/i }).click();
  await usernameInput(page).fill(username);
  await passwordInput(page).fill(PASSWORD);
  await page.getByRole('button', { name: /registrati/i }).click();
  await expect(hallHeading(page)).toBeVisible({ timeout: 10000 });
  return username;
}

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the homepage correctly @smoke @critical', async ({ page }) => {
    // Check page loaded - look for ComboCard branding
    await expect(page.getByRole('heading', { name: /combocard/i })).toBeVisible();
  });

  test('should display the login form', async ({ page }) => {
    await expect(usernameInput(page)).toBeVisible();
    await expect(passwordInput(page)).toHaveAttribute('type', 'password');
    await expect(page.getByRole('button', { name: /accedi/i })).toBeVisible();
  });

  test('should stay on the page with empty fields', async ({ page }) => {
    await page.getByRole('button', { name: /accedi/i }).click();

    await expect(usernameInput(page)).toBeVisible();
    await expect(hallHeading(page)).not.toBeVisible();
  });

  test('should show an error for wrong credentials', async ({ page }) => {
    await usernameInput(page).fill(uniqueUsername('Nobody'));
    await passwordInput(page).fill('not-the-password');
    await page.getByRole('button', { name: /accedi/i }).click();

    await expect(page.getByText('Nome utente o password non corretti').first()).toBeVisible();
    await expect(hallHeading(page)).not.toBeVisible();
  });

  test('should register and enter the hall @critical', async ({ page }) => {
    const username = await signUp(page);

    await expect(page.getByText(`Benvenuto, ${username}!`)).toBeVisible();
  });

  test('should refuse a username already taken @critical', async ({ page, context }) => {
    const username = await signUp(page);
    await context.clearCookies();
    await page.reload();

    await page.getByRole('button', { name: /crea un account/i }).click();
    await usernameInput(page).fill(username);
    await passwordInput(page).fill(PASSWORD);
    await page.getByRole('button', { name: /registrati/i }).click();

    await expect(page.getByText('Questo nome utente è già in uso').first()).toBeVisible();
  });

  test('should stay logged in after reloading the page @critical', async ({ page }) => {
    const username = await signUp(page);

    await page.reload();

    await expect(hallHeading(page)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(`Benvenuto, ${username}!`)).toBeVisible();
  });

  test('should keep the access token out of the browser storage @critical', async ({ page }) => {
    await signUp(page);

    const storage = await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }));
    const visibleCookies = await page.evaluate(() => document.cookie);

    expect(storage).not.toMatch(/eyJ/);
    expect(visibleCookies).not.toContain('combocard_refresh');
  });

  test('should log out and log back in as the same player @critical', async ({ page }) => {
    const username = await signUp(page);

    await page.getByRole('button', { name: 'Esci', exact: true }).click();
    await expect(usernameInput(page)).toBeVisible();

    await page.reload();
    await expect(usernameInput(page)).toBeVisible();

    await usernameInput(page).fill(username);
    await passwordInput(page).fill(PASSWORD);
    await page.getByRole('button', { name: /accedi/i }).click();

    await expect(page.getByText(`Benvenuto, ${username}!`)).toBeVisible({ timeout: 10000 });
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
      (e) => !e.includes('favicon') && !e.includes('404') && !e.includes('WebSocket') && !e.includes('Socket connection')
    );

    expect(criticalErrors).toHaveLength(0);
  });
});
