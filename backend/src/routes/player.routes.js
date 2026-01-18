/**
 * Player Routes
 * 
 * Routes for player management.
 */

import { Router } from "express";
import * as playerController from "../controllers/player.controller.js";

const router = Router();

/**
 * @route   POST /api/players/register
 * @desc    Register a new player
 * @access  Public
 */
router.post("/register", playerController.register);

/**
 * @route   GET /api/players
 * @desc    Get all players (debug)
 * @access  Public
 */
router.get("/", playerController.getAllPlayers);

/**
 * @route   GET /api/players/:playerId
 * @desc    Get player by ID
 * @access  Public
 */
router.get("/:playerId", playerController.getPlayer);

/**
 * @route   POST /api/players/:playerId/buy-credits
 * @desc    Buy credits for a player
 * @access  Public
 */
router.post("/:playerId/buy-credits", playerController.buyCredits);

export default router;
