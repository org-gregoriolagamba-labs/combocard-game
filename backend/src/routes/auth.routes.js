/**
 * Auth Routes
 *
 * Routes for accounts and sessions.
 */

import { Router } from "express";
import * as authController from "../controllers/auth.controller.js";
import { validate } from "../middleware/validation.middleware.js";
import { loginLimiter, strictLimiter } from "../middleware/rateLimiter.middleware.js";
import { requireAuth, requireAuthToChangePassword } from "../middleware/auth.middleware.js";
import { registerSchema, loginSchema, changePasswordSchema, deleteAccountSchema } from "../validation/schemas.js";

const router = Router();

/**
 * @route   POST /api/auth/register
 * @desc    Create an account and start a session
 * @access  Public
 */
router.post("/register", strictLimiter, validate(registerSchema), authController.register);

/**
 * @route   POST /api/auth/login
 * @desc    Start a session
 * @access  Public
 */
router.post("/login", loginLimiter, validate(loginSchema), authController.login);

/**
 * @route   POST /api/auth/refresh
 * @desc    Get a new access token from the refresh cookie
 * @access  Refresh cookie
 */
router.post("/refresh", authController.refresh);

/**
 * @route   POST /api/auth/logout
 * @desc    End the session on this device
 * @access  Refresh cookie
 */
router.post("/logout", authController.logout);

/**
 * @route   POST /api/auth/password
 * @desc    Choose a new password, with the current one: closes the other sessions and opens a new one
 * @access  Private (also with a temporary password: this is the only route open to it)
 */
router.post("/password", loginLimiter, requireAuthToChangePassword, validate(changePasswordSchema), authController.changePassword);

/**
 * @route   DELETE /api/auth/account
 * @desc    Delete the own account, with the password: irreversible. Under /auth so that the refresh cookie,
 *          which only travels there, can be cleared.
 * @access  Private
 */
router.delete("/account", loginLimiter, requireAuth, validate(deleteAccountSchema), authController.deleteOwnAccount);

export default router;
