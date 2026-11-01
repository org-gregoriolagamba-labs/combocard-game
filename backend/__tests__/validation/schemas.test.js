/**
 * Validation Schema and Middleware Tests
 */

import { jest } from '@jest/globals';
import { validate } from '../../src/middleware/validation.middleware.js';
import {
  registerPlayerSchema,
  buyCreditsSchema,
  createGameSchema,
  playerActionSchema,
  optionalPlayerActionSchema,
  claimCollectionSchema,
  useJollySchema,
} from '../../src/validation/schemas.js';

const isValid = (schema, body) => !schema.validate(body).error;

describe('registerPlayerSchema', () => {
  test('trims the name', () => {
    expect(registerPlayerSchema.validate({ playerName: '  Anna ' }).value.playerName).toBe('Anna');
  });

  test.each([[{}], [{ playerName: '' }], [{ playerName: '   ' }], [{ playerName: 5 }], [{ playerName: 'x'.repeat(51) }]])(
    'rejects %j',
    (body) => {
      expect(isValid(registerPlayerSchema, body)).toBe(false);
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
    const body = { playerId: 'p1', requiredCredits: 0, isPrivate: false, maxPlayers: 10 };
    expect(isValid(createGameSchema, body)).toBe(true);
  });

  test('only the player is required', () => {
    expect(isValid(createGameSchema, { playerId: 'p1' })).toBe(true);
  });

  test.each([
    [{}],
    [{ playerId: 'p1', requiredCredits: -1 }],
    [{ playerId: 'p1', requiredCredits: '100' }],
    [{ playerId: 'p1', requiredCredits: 1.5 }],
    [{ playerId: 'p1', maxPlayers: 1 }],
    [{ playerId: 'p1', maxPlayers: 11 }],
    [{ playerId: 'p1', isPrivate: 'true' }],
  ])('rejects %j', (body) => {
    expect(isValid(createGameSchema, body)).toBe(false);
  });
});

describe('player action schemas', () => {
  test('playerActionSchema requires the player', () => {
    expect(isValid(playerActionSchema, { playerId: 'p1' })).toBe(true);
    expect(isValid(playerActionSchema, {})).toBe(false);
    expect(isValid(playerActionSchema, { playerId: { $ne: null } })).toBe(false);
  });

  test('optionalPlayerActionSchema accepts a missing or null player', () => {
    expect(isValid(optionalPlayerActionSchema, {})).toBe(true);
    expect(isValid(optionalPlayerActionSchema, { playerId: null })).toBe(true);
    expect(isValid(optionalPlayerActionSchema, { playerId: 5 })).toBe(false);
  });
});

describe('claimCollectionSchema', () => {
  test.each(['tris', 'sequenza', 'scopa', 'napola', 'combocard_reale'])('accepts %s', (tipo) => {
    expect(isValid(claimCollectionSchema, { playerId: 'p1', tipo })).toBe(true);
  });

  test.each(['xxx', '__proto__', 'constructor', ''])('rejects tipo %j', (tipo) => {
    expect(isValid(claimCollectionSchema, { playerId: 'p1', tipo })).toBe(false);
  });
});

describe('useJollySchema', () => {
  const base = { playerId: 'p1', tipo: 'tris', row: 0, col: 4 };

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

describe('validate middleware', () => {
  test('replaces the body with the validated value, without unknown fields', () => {
    const req = { body: { playerName: ' Anna ', admin: true } };
    const next = jest.fn();

    validate(registerPlayerSchema)(req, {}, next);

    expect(req.body).toEqual({ playerName: 'Anna' });
    expect(next).toHaveBeenCalledWith();
  });

  test('passes a 400 error to next for an invalid body', () => {
    const next = jest.fn();

    validate(buyCreditsSchema)({ body: { amount: 'x' } }, {}, next);

    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 400 });
  });
});
