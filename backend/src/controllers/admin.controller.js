/**
 * Admin Controller
 *
 * Handles the HTTP requests of the admin area. Every route reaches it behind
 * requireAuth and requireRole("admin").
 */

import { sendSuccess } from "../utils/response.utils.js";

/**
 * Tell the caller that they are an admin. A real route to build on: it will be replaced
 * by the list of users.
 * GET /api/admin/status
 */
export const getStatus = (req, res) => {
  sendSuccess(res, { admin: true });
};
