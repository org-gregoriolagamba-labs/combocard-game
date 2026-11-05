import api, { refreshSession, setAccessToken } from '../../services/api';
import * as authService from '../../services/authService';

vi.mock('../../services/api', () => ({
  default: { post: vi.fn() },
  refreshSession: vi.fn(),
  setAccessToken: vi.fn(),
}));

const player = { id: 'p1', name: 'Anna', credits: 10, currentGameId: null };

describe('authService: the role of whoever is logged in', () => {
  test('login and register give back the session as the server sent it, role included', async () => {
    api.post.mockResolvedValue({ data: { accessToken: 't', player, role: 'admin' } });

    await expect(authService.login('Anna', 'pw')).resolves.toEqual({ accessToken: 't', player, role: 'admin' });
    await expect(authService.register('Anna', 'pw')).resolves.toMatchObject({ role: 'admin' });
    expect(setAccessToken).toHaveBeenCalledWith('t');
  });

  test('restoreSession gives the player with the role in it', async () => {
    refreshSession.mockResolvedValue({ accessToken: 't', player, role: 'admin' });

    await expect(authService.restoreSession()).resolves.toEqual({ ...player, role: 'admin' });
  });

  test('a session without a role is a player', async () => {
    refreshSession.mockResolvedValue({ accessToken: 't', player });

    await expect(authService.restoreSession()).resolves.toMatchObject({ role: 'player' });
  });

  test('without a session there is nobody', async () => {
    refreshSession.mockResolvedValue(null);

    await expect(authService.restoreSession()).resolves.toBeNull();
  });
});
