/**
 * API Client Configuration
 * 
 * Configures API calls with error handling.
 */

// API base URL from environment or default
const API_BASE_URL = process.env.REACT_APP_API_URL || "/api";

/**
 * Base fetch wrapper with error handling
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Fetch options
 * @returns {Promise} Response data
 */
async function fetchApi(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config = {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || data.error || "An error occurred");
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
