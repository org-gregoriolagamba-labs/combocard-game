/**
 * Authentication Service
 *
 * Password hashing, access tokens (JWT) and refresh tokens (opaque).
 */

import { createHash, randomBytes, randomUUID } from "crypto";
import argon2 from "argon2";
import jwt from "jsonwebtoken";
import config from "../config/index.js";

const JWT_ALGORITHM = "HS256";
const JWT_ISSUER = "combocard";
const JWT_AUDIENCE = "combocard-api";

let dummyHash = null;

/**
 * Normalize a username, so that "Anna" and "anna" are the same user
 * @param {string} username - Username as typed
 * @returns {string} Key used for lookups and uniqueness
 */
export function normalizeUsername(username) {
  return username.trim().normalize("NFKC").toLowerCase();
}

/**
 * Hash a password with argon2id
 * @param {string} password - Plain password
 * @returns {Promise<string>} Encoded hash, including salt and parameters
 */
export function hashPassword(password) {
  return argon2.hash(password);
}

/**
 * Check a password against the hash of an account. Without an account it still
 * does the same work, so the response time does not reveal which usernames exist.
 * @param {string|null} hash - Stored hash, or null when the account does not exist
 * @param {string} password - Plain password
 * @returns {Promise<boolean>} True if the password is correct
 */
export async function verifyPassword(hash, password) {
  if (hash) {
    return argon2.verify(hash, password);
  }
  dummyHash ??= await argon2.hash(randomBytes(32).toString("hex"));
  await argon2.verify(dummyHash, password);
  return false;
}

/**
 * Sign an access token
 * @param {string} playerId - Player the token belongs to
 * @param {string} role - Account role
 * @param {number} [sessionVersion] - Version of the sessions of the account: when an admin closes them
 *   the version moves on, and the tokens signed before stop working
 * @returns {string} Signed JWT
 */
export function signAccessToken(playerId, role, sessionVersion = 0) {
  return jwt.sign({ role, sv: sessionVersion }, config.jwtSecret, {
    algorithm: JWT_ALGORITHM,
    expiresIn: config.accessTokenTtlSeconds,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
    subject: playerId,
  });
}

/**
 * Verify an access token
 * @param {string} token - JWT
 * @returns {Object|null} { playerId, role, sessionVersion }, or null if the token is not valid
 */
export function verifyAccessToken(token) {
  try {
    const payload = jwt.verify(token, config.jwtSecret, {
      algorithms: [JWT_ALGORITHM],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    return { playerId: payload.sub, role: payload.role, sessionVersion: payload.sv ?? 0 };
  } catch {
    return null;
  }
}

/**
 * Generate a new refresh token
 * @returns {string} Random token, to be sent only in the cookie
 */
export function generateRefreshToken() {
  return randomBytes(32).toString("base64url");
}

/**
 * Hash a refresh token. The token is already high-entropy random data, so a fast
 * hash is enough here, and a lookup by hash stays possible.
 * @param {string} token - Refresh token
 * @returns {string} Hash stored in the database
 */
export function hashRefreshToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Generate the ID of a new token family, one for each login
 * @returns {string} Family ID
 */
export function generateTokenFamilyId() {
  return randomUUID();
}

/**
 * Expiry date of a refresh token created now
 * @returns {Date} Expiry date
 */
export function refreshTokenExpiry() {
  return new Date(Date.now() + config.refreshTokenTtlDays * 24 * 60 * 60 * 1000);
}
