/**
 * Admin Routes
 *
 * Every route here is for admins only: the login and then the role come first, for the whole
 * router, so a route added later cannot forget them (a test checks it).
 */

import { Router } from "express";
import * as adminController from "../controllers/admin.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validation.middleware.js";
import {
  adminAdjustCreditsSchema,
  adminAuditQuerySchema,
  adminCancelGameSchema,
  adminListGamesQuerySchema,
  adminListUsersQuerySchema,
  adminUpdateUserSchema,
  adminUserActionSchema,
} from "../validation/schemas.js";

const router = Router();

router.use(requireAuth, requireRole("admin"));

/**
 * @route   GET /api/admin/status
 * @desc    Check that the caller is an admin
 * @access  Admin
 */
router.get("/status", adminController.getStatus);

/**
 * @route   GET /api/admin/users
 * @desc    The registered users, with search, role filter and pagination
 * @access  Admin
 */
router.get("/users", validate(adminListUsersQuerySchema, "query"), adminController.listUsers);

/**
 * @route   GET /api/admin/users/:playerId
 * @desc    One user
 * @access  Admin
 */
router.get("/users/:playerId", adminController.getUser);

/**
 * @route   PATCH /api/admin/users/:playerId
 * @desc    Rename a user or change their role (one at a time)
 * @access  Admin
 */
router.patch("/users/:playerId", validate(adminUpdateUserSchema), adminController.updateUser);

/**
 * @route   POST /api/admin/users/:playerId/credits
 * @desc    Add or take away credits, with a reason
 * @access  Admin
 */
router.post("/users/:playerId/credits", validate(adminAdjustCreditsSchema), adminController.adjustCredits);

/**
 * @route   POST /api/admin/users/:playerId/suspend
 * @desc    Suspend a user, with a reason: they lose the access at once and their sessions are closed
 * @access  Admin
 */
router.post("/users/:playerId/suspend", validate(adminUserActionSchema), adminController.suspendUser);

/**
 * @route   POST /api/admin/users/:playerId/unsuspend
 * @desc    Reinstate a suspended user, with a reason
 * @access  Admin
 */
router.post("/users/:playerId/unsuspend", validate(adminUserActionSchema), adminController.unsuspendUser);

/**
 * @route   POST /api/admin/users/:playerId/sessions/revoke
 * @desc    Close every session of a user, with a reason
 * @access  Admin
 */
router.post("/users/:playerId/sessions/revoke", validate(adminUserActionSchema), adminController.revokeSessions);

/**
 * @route   POST /api/admin/users/:playerId/password/reset
 * @desc    Reset the password with a temporary one, shown once: the user must change it at the next login
 * @access  Admin
 */
router.post("/users/:playerId/password/reset", validate(adminUserActionSchema), adminController.resetPassword);

/**
 * @route   DELETE /api/admin/users/:playerId
 * @desc    Delete an account, with a reason: irreversible (see docs/DATABASE.md for what stays)
 * @access  Admin
 */
router.delete("/users/:playerId", validate(adminUserActionSchema), adminController.deleteUser);

/**
 * @route   GET /api/admin/games
 * @desc    The games waiting or in progress: metadata only, never the deck or the grids
 * @access  Admin
 */
router.get("/games", validate(adminListGamesQuerySchema, "query"), adminController.listGames);

/**
 * @route   POST /api/admin/games/:gameId/cancel
 * @desc    Cancel a game that is stuck, with a reason: the players still in it get the entry fee back
 * @access  Admin
 */
router.post("/games/:gameId/cancel", validate(adminCancelGameSchema), adminController.cancelGame);

/**
 * @route   GET /api/admin/stats
 * @desc    Numbers of the platform: users, games, credits, prizes
 * @access  Admin
 */
router.get("/stats", adminController.getStats);

/**
 * @route   GET /api/admin/audit
 * @desc    The audit log, the latest first
 * @access  Admin
 */
router.get("/audit", validate(adminAuditQuerySchema, "query"), adminController.listAuditLog);

export default router;
