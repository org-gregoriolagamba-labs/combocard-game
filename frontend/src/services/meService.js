/**
 * Me Service
 *
 * What the player reads about their own account: the credit movements and the personal statistics.
 * There is no player id: the server takes it from the token.
 * Without the database the server answers `{ disponibile: false }`, because nothing is kept.
 */

import api from "./api";

// A query string with only what has a value
const query = (params) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  });
  const text = search.toString();
  return text ? `?${text}` : "";
};

/**
 * One page of the credit movements, latest first
 * @param {Object} filters - { page, limit, type, from, to } (from and to are ISO dates)
 * @returns {Promise<Object>} { disponibile, items, total, page, limit }
 */
export const getMovements = async ({ page, limit, type, from, to } = {}) => {
  const response = await api.get(`/me/movements${query({ page, limit, type, from, to })}`);
  return response.data;
};

/**
 * The personal statistics
 * @returns {Promise<Object>} { disponibile, statistiche }
 */
export const getStats = async () => {
  const response = await api.get("/me/stats");
  return response.data;
};
