/**
 * Me Controller
 *
 * What a player reads about their own account: the history of the credit movements and the
 * personal statistics. The player is always the one of the token (`req.auth.playerId`): nothing in
 * the request can point at another player.
 */

import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/response.utils.js";

const toIso = (value) => (value ? new Date(value).toISOString() : null);

/**
 * The credit movements, latest first
 * GET /api/me/movements?page&limit&type&from&to
 *
 * Without the database nothing is kept: the answer says so (`disponibile: false`)
 * instead of a list that looks complete and is not.
 */
export const getMovements = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, type = null, from = null, to = null } = req.query;
  const result = await req.store.listPlayerMovements(req.auth.playerId, {
    limit,
    offset: (page - 1) * limit,
    type,
    from: toIso(from),
    to: toIso(to),
  });

  if (!result) {
    sendSuccess(res, { disponibile: false });
    return;
  }
  sendSuccess(res, { disponibile: true, items: result.items, total: result.total, page, limit });
});

/**
 * The personal statistics
 * GET /api/me/stats
 */
export const getStats = asyncHandler(async (req, res) => {
  const statistiche = await req.store.playerStats(req.auth.playerId);

  if (!statistiche) {
    sendSuccess(res, { disponibile: false });
    return;
  }
  sendSuccess(res, { disponibile: true, statistiche });
});
