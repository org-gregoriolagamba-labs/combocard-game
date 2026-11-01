/**
 * Auth Controller
 *
 * Handles registration, login, session renewal and logout.
 */

import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess, sendCreated } from "../utils/response.utils.js";
import { AppError } from "../utils/AppError.js";
import config from "../config/index.js";
import * as playerService from "../services/player.service.js";
import {
  normalizeUsername,
  hashPassword,
  verifyPassword,
  signAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  generateTokenFamilyId,
  refreshTokenExpiry,
} from "../services/auth.service.js";
import { USERNAME_TAKEN } from "../db/store.js";

const REFRESH_COOKIE = "combocard_refresh";
const STORAGE_UNAVAILABLE = "Storage temporarily unavailable, please try again";

// The cookie is sent only to the auth routes and is never readable by JavaScript
const cookieOptions = () => ({
  httpOnly: true,
  secure: config.cookieSecure,
  sameSite: config.cookieSameSite,
  path: "/api/auth",
});

function setRefreshCookie(res, token) {
  res.cookie(REFRESH_COOKIE, token, {
    ...cookieOptions(),
    maxAge: config.refreshTokenTtlDays * 24 * 60 * 60 * 1000,
  });
}

function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE, cookieOptions());
}

async function startSession(req, res, player, role) {
  const refreshToken = generateRefreshToken();
  await req.store.createRefreshToken({
    tokenHash: hashRefreshToken(refreshToken),
    familyId: generateTokenFamilyId(),
    playerId: player.id,
    expiresAt: refreshTokenExpiry(),
  });
  setRefreshCookie(res, refreshToken);
  return { accessToken: signAccessToken(player.id, role), player };
}

/**
 * Create an account and start a session
 * POST /api/auth/register
 */
export const register = asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  const passwordHash = await hashPassword(password);
  const player = playerService.registerPlayer(req.gameState, username);

  try {
    await req.store.createAccount(player, {
      username: player.name,
      usernameKey: normalizeUsername(username),
      passwordHash,
    });
  } catch (err) {
    delete req.gameState.players[player.id];
    if (err.code === USERNAME_TAKEN) {
      throw new AppError("Username already taken", 409);
    }
    console.error(`❌ Could not save account: ${err.message}`);
    throw new AppError(STORAGE_UNAVAILABLE, 503);
  }

  sendCreated(res, await startSession(req, res, player, "player"), "Account created successfully");
});

/**
 * Check the credentials and start a session
 * POST /api/auth/login
 */
export const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  const account = await req.store.findAccountByUsernameKey(normalizeUsername(username));
  const valid = await verifyPassword(account?.passwordHash ?? null, password);
  const player = valid ? req.gameState.players[account.playerId] : null;

  // The same error in every case: it must not reveal which usernames exist
  if (!player) {
    throw new AppError("Invalid username or password", 401);
  }

  sendSuccess(res, await startSession(req, res, player, account.role), "Logged in successfully");
});

/**
 * Exchange the refresh cookie for a new access token.
 * Without a cookie there is simply no session: that is not an error.
 * POST /api/auth/refresh
 */
export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) {
    return sendSuccess(res, { accessToken: null, player: null });
  }

  const nextToken = generateRefreshToken();
  const playerId = await req.store.rotateRefreshToken(hashRefreshToken(token), {
    tokenHash: hashRefreshToken(nextToken),
    expiresAt: refreshTokenExpiry(),
    graceSeconds: config.refreshReuseGraceSeconds,
  });

  const account = playerId ? await req.store.findAccountById(playerId) : null;
  const player = account ? req.gameState.players[playerId] : null;

  if (!player) {
    clearRefreshCookie(res);
    throw new AppError("Session expired, please log in again", 401);
  }

  setRefreshCookie(res, nextToken);
  sendSuccess(res, { accessToken: signAccessToken(playerId, account.role), player });
});

/**
 * End the session on this device. Always succeeds, even without a session.
 * POST /api/auth/logout
 */
export const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (token) {
    await req.store.revokeRefreshToken(hashRefreshToken(token));
  }
  clearRefreshCookie(res);
  sendSuccess(res, { success: true }, "Logged out successfully");
});
