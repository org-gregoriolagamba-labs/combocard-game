/**
 * Player Routes
 * 
 * Routes for player management.
 */

import { Router } from "express";
import * as playerController from "../controllers/player.controller.js";
import { validate } from "../middleware/validation.middleware.js";
import { requireAuth, requireSelf } from "../middleware/auth.middleware.js";
import { buyCreditsSchema } from "../validation/schemas.js";

const router = Router();

/**
 * @route   GET /api/players/:playerId
 * @desc    Get your own player
 * @access  Authenticated, self only
 */
router.get("/:playerId", requireAuth, requireSelf, playerController.getPlayer);

/**
 * @route   POST /api/players/:playerId/buy-credits
 * @desc    Buy credits for a player
 * @access  Authenticated, self only
 */
router.post(
  "/:playerId/buy-credits",
  requireAuth,
  requireSelf,
  validate(buyCreditsSchema),
  playerController.buyCredits,
);

export default router;
