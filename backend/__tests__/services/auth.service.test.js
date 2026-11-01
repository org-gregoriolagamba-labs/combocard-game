/**
 * Authentication Service Tests
 */

import jwt from 'jsonwebtoken';
import config from '../../src/config/index.js';
import {
  normalizeUsername,
  hashPassword,
  verifyPassword,
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashRefreshToken,
} from '../../src/services/auth.service.js';

describe('normalizeUsername', () => {
  test('makes case and surrounding spaces irrelevant', () => {
    expect(normalizeUsername('  AnNa ')).toBe('anna');
  });

  test('treats equivalent unicode forms as the same username', () => {
    expect(normalizeUsername('Café')).toBe(normalizeUsername('Café'));
  });
});

describe('passwords', () => {
  test('are stored as argon2id, never in clear', async () => {
    const hash = await hashPassword('correct horse');
    expect(hash.startsWith('$argon2id$')).toBe(true);
    expect(hash).not.toContain('correct horse');
  });

  test('verify only with the right password', async () => {
    const hash = await hashPassword('correct horse');
    await expect(verifyPassword(hash, 'correct horse')).resolves.toBe(true);
    await expect(verifyPassword(hash, 'wrong horse')).resolves.toBe(false);
  });

  test('never verify without an account', async () => {
    await expect(verifyPassword(null, 'anything')).resolves.toBe(false);
  });
});

describe('access tokens', () => {
  const sign = (payload, options = {}, secret = config.jwtSecret) =>
    jwt.sign(payload, secret, {
      expiresIn: 60,
      issuer: 'combocard',
      audience: 'combocard-api',
      subject: 'p1',
      ...options,
    });

  test('carry player and role', () => {
    expect(verifyAccessToken(signAccessToken('p1', 'player'))).toEqual({
      playerId: 'p1',
      role: 'player',
    });
  });

  test('expire after the configured time', () => {
    const { iat, exp } = jwt.decode(signAccessToken('p1', 'player'));
    expect(exp - iat).toBe(config.accessTokenTtlSeconds);
  });

  test.each([
    ['expired', () => sign({ role: 'player' }, { expiresIn: -1 })],
    ['signed with another secret', () => sign({ role: 'player' }, {}, 'x'.repeat(64))],
    ['from another issuer', () => sign({ role: 'player' }, { issuer: 'other' })],
    ['for another audience', () => sign({ role: 'player' }, { audience: 'other' })],
    ['with another algorithm', () => sign({ role: 'player' }, { algorithm: 'HS512' })],
    ['unsigned', () => jwt.sign({ role: 'admin', sub: 'p1' }, '', { algorithm: 'none' })],
    ['malformed', () => 'not-a-token'],
  ])('are rejected when %s', (_name, buildToken) => {
    expect(verifyAccessToken(buildToken())).toBeNull();
  });
});

describe('refresh tokens', () => {
  test('are different each time', () => {
    expect(generateRefreshToken()).not.toBe(generateRefreshToken());
  });

  test('hash to a stable value that does not contain the token', () => {
    const token = generateRefreshToken();
    expect(hashRefreshToken(token)).toBe(hashRefreshToken(token));
    expect(hashRefreshToken(token)).not.toContain(token);
  });
});
