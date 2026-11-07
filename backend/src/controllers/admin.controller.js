/**
 * Admin Controller
 *
 * Handles the HTTP requests of the admin area. Every route reaches it behind
 * requireAuth and requireRole("admin"): who acts is always req.auth, never the body.
 */

import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/response.utils.js";
import * as adminService from "../services/admin.service.js";
import { playerRoom } from "../sockets/index.js";

const actorOf = (req) => ({ type: "player", id: req.auth.playerId });

/**
 * Tell the caller that they are an admin
 * GET /api/admin/status
 */
export const getStatus = (req, res) => {
  sendSuccess(res, { admin: true });
};

/**
 * The registered users, a page at a time
 * GET /api/admin/users
 */
export const listUsers = asyncHandler(async (req, res) => {
  sendSuccess(res, await adminService.listUsers(req.store, req.gameState, req.query));
});

/**
 * One user
 * GET /api/admin/users/:playerId
 */
export const getUser = asyncHandler(async (req, res) => {
  sendSuccess(res, await adminService.getUser(req.store, req.gameState, req.params.playerId));
});

/**
 * Rename a user or change their role
 * PATCH /api/admin/users/:playerId
 */
export const updateUser = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await adminService.updateUser(req.store, req.gameState, req.params.playerId, req.body, actorOf(req)),
    "User updated",
  );
});

/**
 * Add or take away the credits of a user, with a reason. The player is told at once.
 * POST /api/admin/users/:playerId/credits
 */
export const adjustCredits = asyncHandler(async (req, res) => {
  const result = await adminService.adjustUserCredits(
    req.store,
    req.gameState,
    req.params.playerId,
    req.body,
    actorOf(req),
  );

  req.io.to(playerRoom(result.playerId)).emit("gettoniAggiornati", {
    playerId: result.playerId,
    gettoni: result.credits,
  });

  sendSuccess(res, result, "Credits adjusted");
});

// The user is told that the session is over, then their connections are closed: they cannot reconnect
// without a valid token
function endSessionsOf(req, playerId, reason) {
  req.io.to(playerRoom(playerId)).emit("sessionEnded", { reason });
  req.io.in(playerRoom(playerId)).disconnectSockets(true);
}

/**
 * Suspend a user, close their sessions and connections
 * POST /api/admin/users/:playerId/suspend
 */
export const suspendUser = asyncHandler(async (req, res) => {
  const user = await adminService.suspendUser(req.store, req.gameState, req.params.playerId, req.body, actorOf(req));
  endSessionsOf(req, user.playerId, "suspended");
  sendSuccess(res, user, "User suspended");
});

/**
 * Reinstate a suspended user
 * POST /api/admin/users/:playerId/unsuspend
 */
export const unsuspendUser = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    await adminService.unsuspendUser(req.store, req.gameState, req.params.playerId, req.body, actorOf(req)),
    "User reinstated",
  );
});

/**
 * Close every session of a user, without suspending them
 * POST /api/admin/users/:playerId/sessions/revoke
 */
export const revokeSessions = asyncHandler(async (req, res) => {
  const user = await adminService.revokeUserSessions(req.store, req.gameState, req.params.playerId, req.body, actorOf(req));
  endSessionsOf(req, user.playerId, "revoked");
  sendSuccess(res, user, "Sessions closed");
});

/**
 * Reset the password of a user and give the temporary one to the admin, once. The answer must not be
 * kept by anybody on the way. The sessions of the user close.
 * POST /api/admin/users/:playerId/password/reset
 */
export const resetPassword = asyncHandler(async (req, res) => {
  const result = await adminService.resetUserPassword(req.store, req.gameState, req.params.playerId, req.body, actorOf(req));
  endSessionsOf(req, result.user.playerId, "revoked");
  res.set("Cache-Control", "no-store");
  sendSuccess(res, result, "Password reset");
});

/**
 * Delete the account of a user, who is told and loses the connections
 * DELETE /api/admin/users/:playerId
 */
export const deleteUser = asyncHandler(async (req, res) => {
  const result = await adminService.deleteUser(req.store, req.gameState, req.params.playerId, req.body, actorOf(req));
  endSessionsOf(req, result.playerId, "deleted");
  sendSuccess(res, result, "Account deleted");
});

/**
 * The games waiting or in progress, a page at a time
 * GET /api/admin/games
 */
export const listGames = (req, res) => {
  sendSuccess(res, adminService.listGames(req.gameState, req.query));
};

/**
 * Cancel a game. Each player who was in it is told, with the balance they have now, and leaves its room.
 * POST /api/admin/games/:gameId/cancel
 */
export const cancelGame = asyncHandler(async (req, res) => {
  const result = await adminService.cancelGame(req.store, req.gameState, req.params.gameId, req.body, actorOf(req));

  for (const { playerId, credits, refund } of result.players) {
    req.io.to(playerRoom(playerId)).emit("gameCancelled", { gameId: result.gameId, gettoni: credits, refund });
    req.io.in(playerRoom(playerId)).socketsLeave(result.gameId);
  }

  sendSuccess(res, result, "Game cancelled");
});

/**
 * The numbers of the platform
 * GET /api/admin/stats
 */
export const getStats = asyncHandler(async (req, res) => {
  sendSuccess(res, await adminService.getStats(req.store, req.gameState));
});

/**
 * The audit log, the latest first
 * GET /api/admin/audit
 */
export const listAuditLog = asyncHandler(async (req, res) => {
  sendSuccess(res, await adminService.listAudit(req.store, req.query, req.gameState));
});
