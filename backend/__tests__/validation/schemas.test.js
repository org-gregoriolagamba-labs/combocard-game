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
