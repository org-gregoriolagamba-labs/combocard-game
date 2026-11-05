/**
 * Admin area
 *
 * The routes of /api/admin are for admins only. The test server keeps its data in memory, where
 * nobody can be made admin: here only what is refused is checked. The admin who gets in is
 * checked in the backend tests, against a real database.
 * @tags @api @admin
 */

import { test, expect } from '@playwright/test';
import { registerPlayer } from '../helpers/auth.js';

const API_URL = process.env.E2E_API_URL || 'http://localhost:3001';

test.describe('Admin area @admin', () => {
  test('without a token it answers 401', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/admin/status`);

    expect(response.status()).toBe(401);
  });

  test('a player gets 403', async ({ request }) => {
    const player = await registerPlayer(request, API_URL, 'Giocatore');

    const response = await request.get(`${API_URL}/api/admin/status`, { headers: player.headers });

    expect(response.status()).toBe(403);
  });

  test('a role asked for in a header or in the query does not make an admin', async ({ request }) => {
    const player = await registerPlayer(request, API_URL, 'Furbo');

    const response = await request.get(`${API_URL}/api/admin/status?role=admin`, {
      headers: { ...player.headers, 'X-Role': 'admin' },
    });

    expect(response.status()).toBe(403);
  });

  test('the answer to a player does not say whether the route exists for others', async ({ request }) => {
    const player = await registerPlayer(request, API_URL, 'Curioso');

    const refused = await request.get(`${API_URL}/api/admin/status`, { headers: player.headers });
    const body = await refused.json();

    expect(body.data ?? null).toBeNull();
    expect(JSON.stringify(body)).not.toMatch(/mazzo|passwordHash/);
  });
});
