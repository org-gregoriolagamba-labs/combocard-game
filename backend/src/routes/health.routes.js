/**
 * Health Routes
 * 
 * Routes for health check endpoints.
 */

import { Router } from "express";
import * as healthController from "../controllers/health.controller.js";

const router = Router();

/**
 * @route   GET /api/health
 * @desc    Basic health check
 * @access  Public
 */
router.get("/", healthController.healthCheck);

/**
 * @route   GET /api/health/detailed
 * @desc    Detailed health check with metrics
 * @access  Public
 */
router.get("/detailed", healthController.detailedHealthCheck);

export default router;
