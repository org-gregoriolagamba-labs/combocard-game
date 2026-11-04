/**
 * Admin Routes Tests
 *
 * Every route of the admin router is behind the login and then behind the admin role:
 * a route added later without them breaks this test.
 */

import adminRouter from '../../src/routes/admin.routes.js';
import { getStatus } from '../../src/controllers/admin.controller.js';
import { requireAuth } from '../../src/middleware/auth.middleware.js';

describe('admin router', () => {
  test('starts with the login and then the admin role, before every route', () => {
    const [login, role, ...routes] = adminRouter.stack;

    expect(login.handle).toBe(requireAuth);
    expect(role.handle.requiredRoles).toEqual(['admin']);
    expect(routes.length).toBeGreaterThan(0);
    expect(routes.every((layer) => layer.route)).toBe(true);
  });

  test('has the status route, for GET only', () => {
    const status = adminRouter.stack.find((layer) => layer.route?.path === '/status');

    expect(status.route.methods).toEqual({ get: true });
  });
});

describe('GET /api/admin/status', () => {
  test('answers that the caller is an admin, and nothing else', () => {
    let payload;
    const res = { status: () => res, json: (body) => { payload = body; } };

    getStatus({ auth: { playerId: 'p1', role: 'admin' } }, res);

    expect(payload.data).toEqual({ admin: true });
  });
});
