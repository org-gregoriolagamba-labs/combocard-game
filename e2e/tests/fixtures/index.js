/**
 * Test Fixtures
 * 
 * Custom fixtures for ComboCard E2E tests.
 */

import { test as base } from '@playwright/test';
import { faker } from '@faker-js/faker';

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
   * Register a new player and provide their data
   */
  registeredPlayer: async ({ page, apiUrl, playerName }, use) => {
    // Register player via API
    const response = await page.request.post(`${apiUrl}/api/players/register`, {
      data: { name: playerName },
    });

    if (!response.ok()) {
      throw new Error(`Failed to register player: ${response.status()}`);
    }

    const player = await response.json();
    await use(player);
  },

  /**
   * Page with player already registered
   */
  authenticatedPage: async ({ page, registeredPlayer }, use) => {
    // Store player ID in localStorage
    await page.addInitScript((player) => {
      localStorage.setItem('playerId', player.id);
      localStorage.setItem('playerName', player.name);
    }, registeredPlayer);

    await page.goto('/');
    await use(page);
  },
});

export { expect } from '@playwright/test';
