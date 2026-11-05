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
  adminListUsersQuerySchema,
  adminUpdateUserSchema,
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
 * @route   GET /api/admin/audit
 * @desc    The audit log, the latest first
 * @access  Admin
 */
router.get("/audit", validate(adminAuditQuerySchema, "query"), adminController.listAuditLog);

export default router;
