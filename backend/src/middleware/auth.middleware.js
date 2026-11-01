/**
 * Authentication Middleware
 *
 * The identity of a request comes only from the access token, never from the body.
 */

import { AppError } from "../utils/AppError.js";
import { verifyAccessToken } from "../services/auth.service.js";

/**
 * Identify a player from an access token
 * @param {string} token - Access token
 * @param {Object} gameState - Global game state
 * @returns {Object|null} { playerId, role }, or null if not authenticated
 */
export function authenticateToken(token, gameState) {
  if (typeof token !== "string") {
    return null;
  }
  const auth = verifyAccessToken(token);
  return auth && gameState.players[auth.playerId] ? auth : null;
}

/**
 * Require a valid access token. Sets req.auth to { playerId, role }.
 */
export const requireAuth = (req, res, next) => {
  const [scheme, token] = (req.headers.authorization ?? "").split(" ");
  const auth = scheme === "Bearer" ? authenticateToken(token, req.gameState) : null;

  if (!auth) {
    return next(new AppError("Authentication required", 401));
  }

  req.auth = auth;
  next();
};

/**
 * Allow access only to the player named in the :playerId route parameter
 */
export const requireSelf = (req, res, next) => {
  if (req.params.playerId !== req.auth.playerId) {
    return next(new AppError("You can only access your own player", 403));
  }
  next();
};
