/**
 * "Info e contatti" dialog
 *
 * It opens from the login screen, before entering, and from the hall; it says the version of the
 * build and the date, gives the contacts and fits a phone.
 * @tags @mobile
 */

import { test, expect } from '@playwright/test';
import { PASSWORD, registerPlayer } from '../helpers/auth.js';

const API_URL = process.env.E2E_API_URL || 'http://localhost:3001';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

async function toHall(page, player) {
  await page.goto('/');
  await page.getByLabel(/nome utente/i).fill(player.name);
  await page.getByLabel(/password/i).fill(PASSWORD);
  await page.getByRole('button', { name: /accedi/i }).click();
  await expect(page.getByRole('heading', { name: 'Hall' })).toBeVisible({ timeout: 10000 });
}

test.describe('Info e contatti @mobile', () => {
  test('opens from the login screen with version, date and contacts, and closes with the button', async ({ page }) => {
    await page.goto('/');
    const footer = page.getByRole('contentinfo');
    await expect(footer).toContainText('ComboCard™');
    await expect(footer).toContainText(/© 2026(–\d{4})? Gregorio La Gamba/);
    await expect(footer).toContainText(/v\d+\.\d+\.\d+/);
    await expect(footer).not.toContainText('®');
    await footer.getByRole('button', { name: 'Info e contatti' }).click();

    const dialog = page.getByRole('dialog', { name: 'Info e contatti' });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(/\d+\.\d+\.\d+/);
    await expect(dialog).toContainText('Pignalosa');
    await expect(dialog.getByRole('link', { name: /British Museum/ })).toHaveAttribute('href', /britishmuseum\.org/);
    await expect(dialog.locator('time')).toHaveAttribute('datetime', /^\d{4}-\d{2}-\d{2}T/);
    await expect(dialog.locator('time')).not.toHaveText('non disponibile');
    await expect(dialog).toContainText('Gregorio La Gamba');
    await expect(dialog.getByRole('link', { name: /LinkedIn/ })).toHaveAttribute('href', 'https://www.linkedin.com/in/gregoriolagamba/');
    await expect(dialog.getByRole('link', { name: /GitHub/ })).toHaveAttribute('target', '_blank');

    await dialog.getByRole('button', { name: 'Chiudi' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole('button', { name: 'Info e contatti' })).toBeFocused();
  });

  test('opens from the hall and closes with Escape', async ({ page, request }) => {
    const player = await registerPlayer(request, API_URL, 'Curioso');
    await toHall(page, player);

    await expect(page.getByRole('contentinfo')).toContainText('ComboCard™');
    await page.getByRole('button', { name: 'Info e contatti' }).click();
    await expect(page.getByRole('dialog', { name: 'Info e contatti' })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
  });

  for (const [width, height] of [[320, 640], [180, 370]]) {
    test(`fits a phone at ${width}px: no sideways scroll, every control at least 44px`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto('/');

      await expect(page.getByRole('contentinfo')).toBeVisible();

      // The footer itself fits too, with a link that can be tapped
      const footer = await page.evaluate(() => {
        const bar = document.querySelector('footer');
        const link = bar.querySelector('button');
        return {
          overflow: Math.max(document.documentElement.scrollWidth - document.documentElement.clientWidth, bar.scrollWidth - bar.clientWidth),
          height: link.getBoundingClientRect().height,
        };
      });
      expect(footer.overflow).toBeLessThanOrEqual(0);
      expect(footer.height).toBeGreaterThanOrEqual(44);

      await page.getByRole('button', { name: 'Info e contatti' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();

      const { overflow, small } = await page.evaluate(() => {
        const visible = (el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
        };
        const dialog = document.querySelector('[role=dialog]');
        const controls = [...dialog.querySelectorAll('button, a')].filter(visible);
        return {
          overflow: Math.max(document.documentElement.scrollWidth - document.documentElement.clientWidth, dialog.scrollWidth - dialog.clientWidth),
          small: controls.filter((el) => el.getBoundingClientRect().height < 44).map((el) => el.getAttribute('aria-label') || el.textContent),
        };
      });
      expect(overflow).toBeLessThanOrEqual(0);
      expect(small).toEqual([]);
    });
  }
});
