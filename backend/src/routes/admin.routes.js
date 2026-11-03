/**
 * Admin Routes
 *
 * Every route here is for admins only: the login and then the role come first, for the whole
 * router, so a route added later cannot forget them (a test checks it).
 */

import { Router } from "express";
import * as adminController from "../controllers/admin.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";

const router = Router();

router.use(requireAuth, requireRole("admin"));

/**
 * @route   GET /api/admin/status
 * @desc    Check that the caller is an admin
 * @access  Admin
 */
router.get("/status", adminController.getStatus);

export default router;
