/**
 * Test Fixtures
 * 
 * Custom fixtures for ComboCard E2E tests.
 */

import { test as base } from '@playwright/test';
import { faker } from '@faker-js/faker';
import { registerPlayer } from '../helpers/auth.js';

/**
 * Extended test with custom fixtures
 */
export const test = base.extend({
  /**
   * Generate a random player name
   */
  playerName: async ({}, use) => {
    const name = faker.person.firstName();
    await use(name);
  },

  /**
   * API URL from environment
   */
  apiUrl: async ({}, use) => {
    const url = process.env.E2E_API_URL || 'http://localhost:3001';
    await use(url);
  },

  /**
   * Register a new account and provide its data
   */
  registeredPlayer: async ({ page, apiUrl, playerName }, use) => {
    await use(await registerPlayer(page.request, apiUrl, playerName));
  },

  /**
   * Page with a player already logged in: the refresh cookie brings back the session
   */
  authenticatedPage: async ({ page, registeredPlayer }, use) => {
    await page.goto('/');
    await page.getByRole('heading', { name: new RegExp(registeredPlayer.name.slice(0, 3), 'i') }).or(
      page.getByRole('heading', { name: /hall/i }),
    ).first().waitFor();
    await use(page);
  },
});

export { expect } from '@playwright/test';
