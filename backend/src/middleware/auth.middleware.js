/**
 * Authentication Middleware
 *
 * The identity of a request comes only from the access token, never from the body.
 */

import { AppError } from "../utils/AppError.js";
import { verifyAccessToken } from "../services/auth.service.js";

/**
 * Identify a player from an access token. The token is valid for 15 minutes, but the account is read
 * from the store every time: a suspended account, or one whose sessions were closed after the token was
 * signed, is not let in, and the role is the one of the account now.
 * @param {string} token - Access token
 * @param {Object} gameState - Global game state
 * @param {Object} store - Persistence store
 * @returns {Promise<Object|null>} { playerId, role, mustChangePassword }, or null if not authenticated
 */
export async function authenticateToken(token, gameState, store) {
  if (typeof token !== "string") {
    return null;
  }
  const auth = verifyAccessToken(token);
  if (!auth || !gameState.players[auth.playerId]) {
    return null;
  }
  const account = await store.findAccountById(auth.playerId);
  if (!account || account.suspended || account.sessionVersion !== auth.sessionVersion) {
    return null;
  }
  // The account is being deleted: from here to the end of the deletion it cannot do anything. The check is
  // after the read, so nothing happens between it and the handler that runs next.
  if (gameState.players[auth.playerId]?.deleting) {
    return null;
  }
  return { playerId: auth.playerId, role: account.role, mustChangePassword: account.mustChangePassword };
}

// An account with a temporary password may only choose its own: until then every route is closed to it
const authenticate = (allowPasswordChange) => async (req, res, next) => {
  try {
    const [scheme, token] = (req.headers.authorization ?? "").split(" ");
    const auth = scheme === "Bearer" ? await authenticateToken(token, req.gameState, req.store) : null;

    if (!auth) {
      return next(new AppError("Authentication required", 401));
    }
    if (auth.mustChangePassword && !allowPasswordChange) {
      return next(new AppError("You must change your password first", 403));
    }

    req.auth = { playerId: auth.playerId, role: auth.role };
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Require a valid access token. Sets req.auth to { playerId, role }, with the role of the account now.
 * An account that must change its password (an admin reset it) gets a 403 here.
 */
export const requireAuth = authenticate(false);

/**
 * Like requireAuth, but it lets in an account that must change its password. Only for the route
 * where it does so.
 */
export const requireAuthToChangePassword = authenticate(true);

/**
 * Allow access only to accounts with one of the given roles. Goes after requireAuth.
 * The role is read from the store at every request and never from the request: a player
 * who was demoted loses the privileges at once, whatever the token says.
 * @param {...string} roles - Accepted roles
 * @returns {Function} Middleware, with the accepted roles in `requiredRoles`
 */
export const requireRole = (...roles) => {
  const guard = async (req, res, next) => {
    try {
      const account = req.auth ? await req.store.findAccountById(req.auth.playerId) : null;

      if (!account) {
        return next(new AppError("Authentication required", 401));
      }
      if (!roles.includes(account.role)) {
        return next(new AppError("You do not have permission to do this", 403));
      }

      req.auth.role = account.role;
      next();
    } catch (err) {
      next(err);
    }
  };
  guard.requiredRoles = roles;
  return guard;
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
