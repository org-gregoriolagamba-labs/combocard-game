/**
 * Game Routes
 * 
 * Routes for game management.
 */

import { Router } from "express";
import * as gameController from "../controllers/game.controller.js";
import { validate } from "../middleware/validation.middleware.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  createGameSchema,
  claimCollectionSchema,
  useJollySchema,
  startJollySchema,
} from "../validation/schemas.js";

const router = Router();

// Every game route needs a logged-in player, who is taken from the access token
router.use(requireAuth);

/**
 * @route   GET /api/games/lobby
 * @desc    Get list of public waiting games
 * @access  Authenticated
 */
router.get("/lobby", gameController.getLobby);

/**
 * @route   POST /api/games
 * @desc    Create a new game
 * @access  Authenticated
 */
router.post("/", validate(createGameSchema), gameController.createGame);

/**
 * @route   GET /api/games/:gameId
 * @desc    Get game by ID
 * @access  Authenticated
 */
router.get("/:gameId", gameController.getGame);

/**
 * @route   POST /api/games/:gameId/join
 * @desc    Join a game
 * @access  Authenticated
 */
router.post("/:gameId/join", gameController.joinGame);

/**
 * @route   POST /api/games/:gameId/start
 * @desc    Start a game
 * @access  Authenticated
 */
router.post("/:gameId/start", gameController.startGame);

/**
 * @route   POST /api/games/:gameId/draw
 * @desc    Draw a card
 * @access  Authenticated
 */
router.post("/:gameId/draw", gameController.drawCard);

/**
 * @route   POST /api/games/:gameId/claim
 * @desc    Claim a collection
 * @access  Authenticated
 */
router.post("/:gameId/claim", validate(claimCollectionSchema), gameController.claimCollection);

/**
 * @route   POST /api/games/:gameId/jolly
 * @desc    Use jolly card
 * @access  Authenticated
 */
router.post("/:gameId/jolly", validate(useJollySchema), gameController.useJolly);

/**
 * @route   POST /api/games/:gameId/jolly/start
 * @desc    Declare the jolly for a collection: draws are paused while the player chooses the card
 * @access  Authenticated
 */
router.post("/:gameId/jolly/start", validate(startJollySchema), gameController.startJollyChoice);

/**
 * @route   POST /api/games/:gameId/jolly/cancel
 * @desc    Give the jolly choice up: draws can go on
 * @access  Authenticated
 */
router.post("/:gameId/jolly/cancel", gameController.cancelJollyChoice);

/**
 * @route   POST /api/games/:gameId/leave
 * @desc    Leave a game
 * @access  Authenticated
 */
router.post("/:gameId/leave", gameController.leaveGame);

export default router;
