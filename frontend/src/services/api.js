/**
 * API Client Configuration
 *
 * Configures API calls with error handling and authentication.
 * The access token stays only in memory: page scripts cannot find it in the browser
 * storage, and after a reload the refresh cookie provides a new one.
 */

import { translateServerError } from "../utils/errors.utils";

// API base URL from environment or default
const API_BASE_URL = process.env.REACT_APP_API_URL || "/api";

let accessToken = null;
let pendingRefresh = null;
let onSessionExpired = null;

export const getAccessToken = () => accessToken;

export const setAccessToken = (token) => {
  accessToken = token;
};

/**
 * Register what to do when a session ends without the user asking
 * @param {Function|null} handler - Called when the session cannot be renewed
 */
export const setSessionExpiredHandler = (handler) => {
  onSessionExpired = handler;
};

async function requestSession() {
  const hadSession = accessToken !== null;
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    credentials: "include",
  });

  // Any other failure is temporary, and the session may still be valid
  if (!response.ok && response.status !== 401) {
    throw new Error(translateServerError("Could not renew the session"));
  }

  const session = response.ok ? (await response.json()).data : null;
  accessToken = session?.accessToken ?? null;

  if (!accessToken && hadSession) {
    onSessionExpired?.();
  }

  return accessToken ? session : null;
}

/**
 * Get a new access token from the refresh cookie. Concurrent callers share one
 * request, because each renewal replaces the cookie.
 * @returns {Promise<Object|null>} { accessToken, player }, or null without a session
 */
export function refreshSession() {
  pendingRefresh ??= requestSession().finally(() => {
    pendingRefresh = null;
  });
  return pendingRefresh;
}

/**
 * Get a new access token
 * @returns {Promise<string|null>} Token, or null without a session
 */
export async function refreshAccessToken() {
  const session = await refreshSession();
  return session?.accessToken ?? null;
}

/**
 * Base fetch wrapper with error handling
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Fetch options
 * @param {boolean} isRetry - True when repeating a request after renewing the token
 * @returns {Promise} Response data
 */
async function fetchApi(endpoint, options = {}, isRetry = false) {
  const url = `${API_BASE_URL}${endpoint}`;

  const config = {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options.headers,
    },
  };

  try {
    let response;
    try {
      response = await fetch(url, config);
    } catch (networkError) {
      throw new Error(translateServerError(networkError.message));
    }

    // The access token lasts a few minutes: renew it and repeat the request once
    if (response.status === 401 && !isRetry && !endpoint.startsWith("/auth/")) {
      const token = await refreshAccessToken();
      if (token) {
        return fetchApi(endpoint, options, true);
      }
    }

    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error(translateServerError(undefined));
    }

    if (!response.ok) {
      throw new Error(translateServerError(data.message || data.error));
    }

    return data;
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
}

/**
 * API methods
 */
const api = {
  get: (endpoint) => fetchApi(endpoint, { method: "GET" }),

  post: (endpoint, body) => fetchApi(endpoint, {
    method: "POST",
    body: JSON.stringify(body),
  }),

  put: (endpoint, body) => fetchApi(endpoint, {
    method: "PUT",
    body: JSON.stringify(body),
  }),

  delete: (endpoint) => fetchApi(endpoint, { method: "DELETE" }),
};

export default api;
export { API_BASE_URL };
