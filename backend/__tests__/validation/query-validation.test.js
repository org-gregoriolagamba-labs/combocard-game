/**
 * Query validation on a real Express 5 server
 *
 * In Express 5 req.query cannot be assigned: a middleware that does `req.query = value` breaks on
 * a real request, and only a real request shows it.
 */

import express from 'express';
import { validate } from '../../src/middleware/validation.middleware.js';
import { adminListUsersQuerySchema } from '../../src/validation/schemas.js';

describe('validate on the query of a real request', () => {
  let server;
  let base;

  beforeAll(async () => {
    const app = express();
    app.get('/users', validate(adminListUsersQuerySchema, 'query'), (req, res) => res.json({ query: req.query }));
    app.use((err, req, res, _next) => res.status(err.statusCode ?? 500).json({ message: err.message }));
    await new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', resolve);
    });
    base = `http://127.0.0.1:${server.address().port}`;
  });

  afterAll(() => new Promise((resolve) => server.close(resolve)));

  test('gives the route the query with the defaults and the numbers converted', async () => {
    const response = await fetch(`${base}/users?q=Anna&page=2`);

    expect(response.status).toBe(200);
    expect((await response.json()).query).toEqual({ q: 'Anna', page: 2, limit: 20 });
  });

  test('refuses an invalid query with 400', async () => {
    const response = await fetch(`${base}/users?limit=500`);

    expect(response.status).toBe(400);
  });

  test('drops what the schema does not know', async () => {
    const response = await fetch(`${base}/users?evil=1`);

    expect((await response.json()).query).toEqual({ page: 1, limit: 20 });
  });
});
