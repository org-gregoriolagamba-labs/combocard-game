/**
 * Me Routes
 *
 * What the player reads about their own account: the credit movements and the statistics.
 * There is no player id in the path: it is the one of the token.
 */

import { Router } from "express";
import * as meController from "../controllers/me.controller.js";
import { validate } from "../middleware/validation.middleware.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { meMovementsQuerySchema } from "../validation/schemas.js";

const router = Router();

/**
 * @route   GET /api/me/movements
 * @desc    The credit movements of the player, latest first, paged and filterable
 * @access  Authenticated
 */
router.get("/movements", requireAuth, validate(meMovementsQuerySchema, "query"), meController.getMovements);

/**
 * @route   GET /api/me/stats
 * @desc    The personal statistics of the player
 * @access  Authenticated
 */
router.get("/stats", requireAuth, meController.getStats);

export default router;
