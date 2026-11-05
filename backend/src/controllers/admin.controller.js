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

/**
 * The audit log, the latest first
 * GET /api/admin/audit
 */
export const listAuditLog = asyncHandler(async (req, res) => {
  sendSuccess(res, await adminService.listAudit(req.store, req.query, req.gameState));
});
