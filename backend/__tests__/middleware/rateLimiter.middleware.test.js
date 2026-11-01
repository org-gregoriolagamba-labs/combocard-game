/**
 * General Rate Limit Tests
 *
 * The limit runs on a real server with its default values: the limiters skip
 * themselves in the test environment, and backend/.env may override the values.
 */

import express from 'express';
import { createApiLimiter } from '../../src/middleware/rateLimiter.middleware.js';
import { RATE_LIMIT_DEFAULTS } from '../../src/config/constants.js';

const LOBBY_POLLING_SECONDS = 2; // LobbyScreen.jsx: the most frequent automatic requests
const PLAYERS_ON_SAME_IP = 6;

describe('general rate limit', () => {
  let server;
  let url;

  const send = async (count) => {
    const statuses = [];
    for (let sent = 0; sent < count; sent += 100) {
      const batch = Array.from({ length: Math.min(100, count - sent) }, () =>
        fetch(url).then((r) => r.status));
      statuses.push(...await Promise.all(batch));
    }
    return statuses;
  };

  beforeEach(async () => {
    const app = express();
    app.use('/api/', createApiLimiter({
      windowMs: RATE_LIMIT_DEFAULTS.WINDOW_MS,
      limit: RATE_LIMIT_DEFAULTS.MAX_REQUESTS,
      skip: () => false,
    }));
    app.get('/api/ping', (req, res) => res.json({ ok: true }));

    await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve); });
    url = `http://127.0.0.1:${server.address().port}/api/ping`;
  });

  afterEach(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => { server.close(resolve); });
  });

  test('players on the same IP address can wait in a lobby for a whole window', async () => {
    const perPlayer = RATE_LIMIT_DEFAULTS.WINDOW_MS / 1000 / LOBBY_POLLING_SECONDS;

    const statuses = await send(perPlayer * PLAYERS_ON_SAME_IP);

    expect(statuses.filter((s) => s === 429)).toHaveLength(0);
  }, 60000);

  test('the limit stays active beyond the allowed requests', async () => {
    const statuses = await send(RATE_LIMIT_DEFAULTS.MAX_REQUESTS + 1);

    expect(statuses.filter((s) => s === 429)).toHaveLength(1);
  }, 60000);
});
