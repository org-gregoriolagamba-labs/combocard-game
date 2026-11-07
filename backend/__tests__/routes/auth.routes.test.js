/**
 * Auth Routes Tests
 *
 * The routes that change or delete an account are validated, limited like the login, and behind the
 * login: the one with a temporary password is the only one that lets that account in.
 */

import authRouter from '../../src/routes/auth.routes.js';
import { requireAuth, requireAuthToChangePassword } from '../../src/middleware/auth.middleware.js';

const routeOf = (path, method) =>
  authRouter.stack.find((layer) => layer.route?.path === path && layer.route.methods[method])?.route;

describe('auth router', () => {
  test('the deletion of the account is behind requireAuth, which refuses an account with a temporary password', () => {
    const handlers = routeOf('/account', 'delete').stack.map((layer) => layer.handle);

    expect(handlers).toContain(requireAuth);
    expect(handlers).not.toContain(requireAuthToChangePassword);
    expect(handlers.length).toBeGreaterThanOrEqual(4); // limiter, login, validation, handler
  });

  test('only the change of the password lets in an account that must change it', () => {
    const lettingIn = authRouter.stack
      .filter((layer) => layer.route?.stack.some((s) => s.handle === requireAuthToChangePassword))
      .map((layer) => layer.route.path);

    expect(lettingIn).toEqual(['/password']);
  });
});
