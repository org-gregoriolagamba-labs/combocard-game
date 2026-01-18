/**
 * Game Routes
 * 
 * Routes for game management.
 */

import { Router } from "express";
import * as gameController from "../controllers/game.controller.js";

const router = Router();

/**
 * @route   GET /api/games/lobby
 * @desc    Get list of public waiting games
 * @access  Public
 */
router.get("/lobby", gameController.getLobby);

/**
 * @route   POST /api/games
 * @desc    Create a new game
 * @access  Public
 */
router.post("/", gameController.createGame);

/**
 * @route   GET /api/games/:gameId
 * @desc    Get game by ID
 * @access  Public
 */
router.get("/:gameId", gameController.getGame);

/**
 * @route   POST /api/games/:gameId/join
 * @desc    Join a game
 * @access  Public
 */
router.post("/:gameId/join", gameController.joinGame);

/**
 * @route   POST /api/games/:gameId/start
 * @desc    Start a game
 * @access  Public
 */
router.post("/:gameId/start", gameController.startGame);

/**
 * @route   POST /api/games/:gameId/draw
 * @desc    Draw a card
 * @access  Public
 */
router.post("/:gameId/draw", gameController.drawCard);

/**
 * @route   POST /api/games/:gameId/claim
 * @desc    Claim a collection
 * @access  Public
 */
router.post("/:gameId/claim", gameController.claimCollection);

/**
 * @route   POST /api/games/:gameId/jolly
 * @desc    Use jolly card
 * @access  Public
 */
router.post("/:gameId/jolly", gameController.useJolly);

/**
 * @route   POST /api/games/:gameId/leave
 * @desc    Leave a game
 * @access  Public
 */
router.post("/:gameId/leave", gameController.leaveGame);

export default router;
