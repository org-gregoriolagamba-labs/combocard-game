/**
 * Validation Schema and Middleware Tests
 */

import { jest } from '@jest/globals';
import { validate } from '../../src/middleware/validation.middleware.js';
import {
  registerSchema,
  loginSchema,
  buyCreditsSchema,
  createGameSchema,
  claimCollectionSchema,
  useJollySchema,
  startJollySchema,
  adminAdjustCreditsSchema,
  adminAuditQuerySchema,
  adminCancelGameSchema,
  adminUserActionSchema,
  changePasswordSchema,
  deleteAccountSchema,
  adminListGamesQuerySchema,
  adminListUsersQuerySchema,
  adminUpdateUserSchema,
} from '../../src/validation/schemas.js';

const isValid = (schema, body) => !schema.validate(body).error;

describe('registerSchema', () => {
  const password = 'long enough';

  test('trims the username', () => {
    expect(registerSchema.validate({ username: '  Anna ', password }).value.username).toBe('Anna');
  });

  test.each(['Anna', 'Maria Rossi', 'anna_99', 'José.M-1', '日本語'])('accepts the username %j', (username) => {
    expect(isValid(registerSchema, { username, password })).toBe(true);
  });

  test.each([
    [{ password }],
    [{ username: 'ab', password }],
    [{ username: '   ', password }],
    [{ username: 5, password }],
    [{ username: 'x'.repeat(31), password }],
    [{ username: '<script>', password }],
    [{ username: '-anna', password }],
    [{ username: 'Anna' }],
    [{ username: 'Anna', password: 'short' }],
    [{ username: 'Anna', password: 'x'.repeat(129) }],
    [{ username: 'Anna', password: 12345678 }],
  ])('rejects %j', (body) => {
    expect(isValid(registerSchema, body)).toBe(false);
  });
});

describe('loginSchema', () => {
  test('does not apply the password rules of the registration', () => {
    expect(isValid(loginSchema, { username: 'a', password: 'x' })).toBe(true);
  });

  test.each([[{}], [{ username: 'Anna' }], [{ password: 'x' }], [{ username: 'Anna', password: 'x'.repeat(129) }]])(
    'rejects %j',
    (body) => {
      expect(isValid(loginSchema, body)).toBe(false);
    },
  );
});

describe('buyCreditsSchema', () => {
  test('accepts a positive integer', () => {
    expect(isValid(buyCreditsSchema, { amount: 100 })).toBe(true);
  });

  test.each([[{}], [{ amount: 0 }], [{ amount: -5 }], [{ amount: 1.5 }], [{ amount: '5' }]])('rejects %j', (body) => {
    expect(isValid(buyCreditsSchema, body)).toBe(false);
  });
});

describe('createGameSchema', () => {
  test('accepts what the frontend sends, including 0 credits for the default', () => {
    expect(isValid(createGameSchema, { requiredCredits: 0, isPrivate: false, maxPlayers: 10 })).toBe(true);
  });

  test('has no required field', () => {
    expect(isValid(createGameSchema, {})).toBe(true);
  });

  test('removes a player sent in the body', () => {
    const { value } = createGameSchema.validate({ playerId: 'p1' }, { stripUnknown: true });
    expect(value).toEqual({});
  });

  test.each([
    [{ requiredCredits: -1 }],
    [{ requiredCredits: '100' }],
    [{ requiredCredits: 1.5 }],
    [{ maxPlayers: 1 }],
    [{ maxPlayers: 11 }],
    [{ isPrivate: 'true' }],
  ])('rejects %j', (body) => {
    expect(isValid(createGameSchema, body)).toBe(false);
  });
});

describe('claimCollectionSchema', () => {
  test.each(['tris', 'sequenza', 'scopa', 'napola', 'combocard_reale'])('accepts %s', (tipo) => {
    expect(isValid(claimCollectionSchema, { tipo })).toBe(true);
  });

  test.each(['xxx', '__proto__', 'constructor', ''])('rejects tipo %j', (tipo) => {
    expect(isValid(claimCollectionSchema, { tipo })).toBe(false);
  });
});

describe('useJollySchema', () => {
  const base = { tipo: 'tris', row: 0, col: 4 };

  test('accepts a position inside the grid', () => {
    expect(isValid(useJollySchema, base)).toBe(true);
  });

  test.each([
    [{ row: 5 }],
    [{ col: -1 }],
    [{ row: 1.5 }],
    [{ row: '0' }],
    [{ tipo: 'xxx' }],
  ])('rejects %j', (override) => {
    expect(isValid(useJollySchema, { ...base, ...override })).toBe(false);
  });
});

describe('startJollySchema', () => {
  test('accepts a collection type', () => {
    expect(isValid(startJollySchema, { tipo: 'napola' })).toBe(true);
  });

  test.each([[{}], [{ tipo: 'xxx' }], [{ tipo: 3 }]])('rejects %j', (body) => {
    expect(isValid(startJollySchema, body)).toBe(false);
  });
});

describe('validate middleware', () => {
  test('replaces the body with the validated value, without unknown fields', () => {
    const req = { body: { username: ' Anna ', password: 'long enough', admin: true } };
    const next = jest.fn();

    validate(registerSchema)(req, {}, next);

    expect(req.body).toEqual({ username: 'Anna', password: 'long enough' });
    expect(next).toHaveBeenCalledWith();
  });

  test('passes a 400 error to next for an invalid body', () => {
    const next = jest.fn();

    validate(buyCreditsSchema)({ body: { amount: 'x' } }, {}, next);

    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 400 });
  });
});

describe('admin schemas', () => {
  describe('adminListUsersQuerySchema', () => {
    test('takes the defaults, and reads numbers from the text of a query string', () => {
      expect(adminListUsersQuerySchema.validate({}).value).toEqual({ page: 1, limit: 20 });
      expect(adminListUsersQuerySchema.validate({ page: '3', limit: '50', q: ' an ', role: 'admin' }).value)
        .toEqual({ page: 3, limit: 50, q: 'an', role: 'admin' });
    });

    test.each([
      ['a page of zero', { page: '0' }],
      ['a limit over 100', { limit: '101' }],
      ['a role that does not exist', { role: 'root' }],
      ['a page that is not a number', { page: 'x' }],
      ['a search longer than 30 characters', { q: 'a'.repeat(31) }],
    ])('rejects %s', (_name, query) => {
      expect(adminListUsersQuerySchema.validate(query).error).toBeDefined();
    });
  });

  describe('adminUpdateUserSchema', () => {
    test('takes a username or a role, one at a time', () => {
      expect(adminUpdateUserSchema.validate({ username: ' Anna Rossi ' }).value).toEqual({ username: 'Anna Rossi' });
      expect(adminUpdateUserSchema.validate({ role: 'admin' }).value).toEqual({ role: 'admin' });
    });

    test.each([
      ['nothing', {}],
      ['both at once', { username: 'Anna', role: 'admin' }],
      ['a role that does not exist', { role: 'root' }],
      ['a username that is too short', { username: 'ab' }],
      ['a username with forbidden characters', { username: 'anna<script>' }],
    ])('rejects %s', (_name, body) => {
      expect(adminUpdateUserSchema.validate(body).error).toBeDefined();
    });

    test('drops what it does not know, so nothing else can be changed', () => {
      expect(adminUpdateUserSchema.validate({ role: 'admin', credits: 99999 }, { stripUnknown: true }).value)
        .toEqual({ role: 'admin' });
    });
  });

  describe('adminAdjustCreditsSchema', () => {
    test('takes an amount with its sign and a reason', () => {
      expect(adminAdjustCreditsSchema.validate({ amount: -40, reason: ' correzione ' }).value)
        .toEqual({ amount: -40, reason: 'correzione' });
    });

    test.each([
      ['no reason', { amount: 10 }],
      ['an empty reason', { amount: 10, reason: '   ' }],
      ['a reason that is too long', { amount: 10, reason: 'x'.repeat(201) }],
      ['an amount of zero', { amount: 0, reason: 'x' }],
      ['an amount that is not a whole number', { amount: 1.5, reason: 'x' }],
      ['an amount as text', { amount: '10', reason: 'x' }],
      ['an amount over one million', { amount: 1000001, reason: 'x' }],
      ['an amount under minus one million', { amount: -1000001, reason: 'x' }],
    ])('rejects %s', (_name, body) => {
      expect(adminAdjustCreditsSchema.validate(body).error).toBeDefined();
    });
  });

  describe('adminAuditQuerySchema', () => {
    test('takes the defaults and a target', () => {
      expect(adminAuditQuerySchema.validate({}).value).toEqual({ page: 1, limit: 20 });
      expect(adminAuditQuerySchema.validate({ targetId: 'abc', page: '2' }).value).toEqual({ targetId: 'abc', page: 2, limit: 20 });
    });

    test('rejects a limit over 100', () => {
      expect(adminAuditQuerySchema.validate({ limit: '500' }).error).toBeDefined();
    });
  });
  describe('adminListGamesQuerySchema', () => {
    test('takes the defaults, a status and the page', () => {
      expect(adminListGamesQuerySchema.validate({}).value).toEqual({ page: 1, limit: 20 });
      expect(adminListGamesQuerySchema.validate({ status: 'playing', page: '2' }).value).toEqual({ status: 'playing', page: 2, limit: 20 });
    });

    test.each([['finished'], ['cancelled'], ['x']])('rejects the status %s', (status) => {
      expect(adminListGamesQuerySchema.validate({ status }).error).toBeDefined();
    });
  });

  describe('adminCancelGameSchema', () => {
    test('takes a reason, trimmed', () => {
      expect(adminCancelGameSchema.validate({ reason: ' bloccata ' }).value).toEqual({ reason: 'bloccata' });
    });

    test.each([
      ['no reason', {}],
      ['an empty reason', { reason: '  ' }],
      ['a reason that is too long', { reason: 'x'.repeat(201) }],
    ])('rejects %s', (_name, body) => {
      expect(adminCancelGameSchema.validate(body).error).toBeDefined();
    });
  });

  describe('adminUserActionSchema', () => {
    test('takes a reason, trimmed', () => {
      expect(adminUserActionSchema.validate({ reason: ' abuso ' }).value).toEqual({ reason: 'abuso' });
    });

    test.each([
      ['no reason', {}],
      ['an empty reason', { reason: '  ' }],
      ['a reason that is too long', { reason: 'x'.repeat(201) }],
      ['a field that is not allowed', { reason: 'x', playerId: 'p2' }],
    ])('rejects %s', (_name, body) => {
      expect(adminUserActionSchema.validate(body).error).toBeDefined();
    });
  });

  describe('changePasswordSchema', () => {
    test('takes the current and the new password', () => {
      expect(isValid(changePasswordSchema, { currentPassword: 'temporary-1', newPassword: 'long enough' })).toBe(true);
    });

    test.each([
      ['no current password', { newPassword: 'long enough' }],
      ['no new password', { currentPassword: 'x' }],
      ['a new password that is too short', { currentPassword: 'x', newPassword: 'short' }],
      ['a new password that is too long', { currentPassword: 'x', newPassword: 'x'.repeat(129) }],
      ['a field that is not allowed', { currentPassword: 'x', newPassword: 'long enough', playerId: 'p2' }],
    ])('rejects %s', (_name, body) => {
      expect(changePasswordSchema.validate(body).error).toBeDefined();
    });
  });

  describe('deleteAccountSchema', () => {
    test('takes the password', () => {
      expect(isValid(deleteAccountSchema, { password: 'whatever it is' })).toBe(true);
    });

    test.each([
      ['no password', {}],
      ['a password that is too long', { password: 'x'.repeat(129) }],
      ['a field that is not allowed', { password: 'x', playerId: 'p2' }],
    ])('rejects %s', (_name, body) => {
      expect(deleteAccountSchema.validate(body).error).toBeDefined();
    });
  });
});
