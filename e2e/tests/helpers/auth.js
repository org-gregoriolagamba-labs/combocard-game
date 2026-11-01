/**
 * Authentication helpers for the API tests
 */

export const PASSWORD = 'test-password-123';

let counter = 0;

/**
 * Build a username no other test is using: usernames are unique
 * @param {string} base - Readable prefix
 * @returns {string} Unique username, within the length limit
 */
export function uniqueUsername(base = 'Player') {
  counter += 1;
  const suffix = `${Date.now().toString(36)}${process.pid.toString(36)}${counter}`;
  return `${base.slice(0, 29 - suffix.length)}_${suffix}`;
}

/**
 * Create an account
 * @param {APIRequestContext} request - Playwright request context
 * @param {string} apiUrl - Backend URL
 * @param {string} base - Readable prefix of the username
 * @returns {Promise<Object>} Player, with `token` and ready-to-use `headers`
 */
export async function registerPlayer(request, apiUrl, base) {
  const response = await request.post(`${apiUrl}/api/auth/register`, {
    data: { username: uniqueUsername(base), password: PASSWORD },
  });
  if (!response.ok()) {
    throw new Error(`Registration failed: ${response.status()} ${await response.text()}`);
  }

  const { accessToken, player } = (await response.json()).data;
  return { ...player, token: accessToken, headers: { Authorization: `Bearer ${accessToken}` } };
}
