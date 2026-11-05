/**
 * API Client Tests: token handling and automatic renewal
 */

import api, {
  getAccessToken,
  refreshSession,
  setAccessToken,
  setSessionExpiredHandler,
} from '../../services/api';

const jsonResponse = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

const sessionResponse = (token) =>
  jsonResponse(200, { data: { accessToken: token, player: { id: 'p1' } } });

const callsTo = (path) => global.fetch.mock.calls.filter(([url]) => url.endsWith(path));

describe('api client', () => {
  let onExpired;
  let errorSpy;

  beforeEach(() => {
    onExpired = vi.fn();
    setSessionExpiredHandler(onExpired);
    setAccessToken(null);
    global.fetch = vi.fn();
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
    setSessionExpiredHandler(null);
  });

  test('sends the access token and the cookies', async () => {
    setAccessToken('t1');
    global.fetch.mockResolvedValue(jsonResponse(200, { data: 1 }));

    await api.get('/games/lobby');

    const [, options] = global.fetch.mock.calls[0];
    expect(options.headers.Authorization).toBe('Bearer t1');
    expect(options.credentials).toBe('include');
  });

  test('without a token sends no Authorization header', async () => {
    global.fetch.mockResolvedValue(jsonResponse(200, { data: 1 }));

    await api.get('/health');

    expect(global.fetch.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  test('on 401 renews the token and repeats the request once', async () => {
    setAccessToken('old');
    global.fetch
      .mockResolvedValueOnce(jsonResponse(401, { message: 'Authentication required' }))
      .mockResolvedValueOnce(sessionResponse('new'))
      .mockResolvedValueOnce(jsonResponse(200, { data: 'ok' }));

    const result = await api.post('/games/g1/draw');

    expect(result.data).toBe('ok');
    expect(getAccessToken()).toBe('new');
    expect(callsTo('/games/g1/draw')[1][1].headers.Authorization).toBe('Bearer new');
    expect(onExpired).not.toHaveBeenCalled();
  });

  test('does not repeat a request twice when the new token is refused too', async () => {
    setAccessToken('old');
    global.fetch.mockImplementation(async (url) =>
      url.endsWith('/auth/refresh')
        ? sessionResponse('new')
        : jsonResponse(401, { message: 'Authentication required' }));

    await expect(api.get('/games/g1')).rejects.toThrow('Accedi per continuare');

    expect(callsTo('/games/g1')).toHaveLength(2);
    expect(callsTo('/auth/refresh')).toHaveLength(1);
  });

  test('when the session cannot be renewed reports it and forgets the token', async () => {
    setAccessToken('old');
    global.fetch
      .mockResolvedValueOnce(jsonResponse(401, { message: 'Authentication required' }))
      .mockResolvedValueOnce(jsonResponse(401, { message: 'Session expired' }))
      .mockResolvedValueOnce(jsonResponse(401, { message: 'Authentication required' }));

    await expect(api.get('/games/lobby')).rejects.toThrow();

    expect(onExpired).toHaveBeenCalledTimes(1);
    expect(getAccessToken()).toBeNull();
  });

  test('a temporary failure of the renewal does not end the session', async () => {
    setAccessToken('old');
    global.fetch
      .mockResolvedValueOnce(jsonResponse(401, { message: 'Authentication required' }))
      .mockResolvedValueOnce(jsonResponse(503, { message: 'Unavailable' }));

    await expect(api.get('/games/lobby')).rejects.toThrow('Non riesco a rinnovare la sessione: riprova tra poco');

    expect(onExpired).not.toHaveBeenCalled();
    expect(getAccessToken()).toBe('old');
  });

  test('requests that fail together share a single renewal', async () => {
    setAccessToken('old');
    global.fetch.mockImplementation(async (url, options) => {
      if (url.endsWith('/auth/refresh')) {
        return sessionResponse('new');
      }
      return options.headers.Authorization === 'Bearer new'
        ? jsonResponse(200, { data: 'ok' })
        : jsonResponse(401, { message: 'Authentication required' });
    });

    await Promise.all([api.get('/a'), api.get('/b'), api.get('/c')]);

    expect(callsTo('/auth/refresh')).toHaveLength(1);
  });

  test('a server error reaches the caller in Italian', async () => {
    global.fetch.mockResolvedValue(jsonResponse(400, { message: 'Collection not complete' }));

    await expect(api.post('/games/g1/claim', {})).rejects.toThrow('La collezione non è ancora completa');
  });

  test('an unknown server error is generic, not English', async () => {
    global.fetch.mockResolvedValue(jsonResponse(500, { message: 'Something went wrong' }));

    await expect(api.get('/games/g1')).rejects.toThrow('Qualcosa non ha funzionato: riprova tra poco');
  });

  test('without a connection it says what to do', async () => {
    global.fetch.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(api.get('/games/lobby')).rejects.toThrow('Impossibile contattare il server: controlla la connessione e riprova');
  });

  test('a wrong login is not treated as an expired token', async () => {
    global.fetch.mockResolvedValue(jsonResponse(401, { message: 'Invalid username or password' }));

    await expect(api.post('/auth/login', {})).rejects.toThrow('Nome utente o password non corretti');

    expect(callsTo('/auth/refresh')).toHaveLength(0);
  });

  test('a first visit without a session is not an expired session', async () => {
    global.fetch.mockResolvedValue(jsonResponse(200, { data: { accessToken: null, player: null } }));

    await expect(refreshSession()).resolves.toBeNull();

    expect(onExpired).not.toHaveBeenCalled();
  });
});

describe('api client: patch and the status of an error', () => {
  let errorSpy;

  beforeEach(() => {
    setAccessToken('t1');
    global.fetch = vi.fn();
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
    setAccessToken(null);
  });

  test('patch sends the body with the PATCH method', async () => {
    global.fetch.mockResolvedValue(jsonResponse(200, { data: { ok: true } }));

    await api.patch('/admin/users/p1', { role: 'admin' });

    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toMatch(/\/admin\/users\/p1$/);
    expect(options.method).toBe('PATCH');
    expect(JSON.parse(options.body)).toEqual({ role: 'admin' });
  });

  test('an error carries the status of the answer, so a screen can tell a 403 from the rest', async () => {
    global.fetch.mockResolvedValue(jsonResponse(403, { message: 'You do not have permission to do this' }));

    await expect(api.get('/admin/users')).rejects.toMatchObject({ status: 403, message: 'Non hai i permessi per farlo' });
  });
});
