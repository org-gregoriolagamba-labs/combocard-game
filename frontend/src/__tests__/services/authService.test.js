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

    await expect(authService.restoreSession()).resolves.toEqual({ ...player, role: 'admin', mustChangePassword: false });
  });

  test('a session without a role is a player', async () => {
    refreshSession.mockResolvedValue({ accessToken: 't', player });

    await expect(authService.restoreSession()).resolves.toMatchObject({ role: 'player' });
  });

  test('restoreSession says when the password must be changed', async () => {
    refreshSession.mockResolvedValue({ accessToken: 't', player, role: 'player', mustChangePassword: true });

    await expect(authService.restoreSession()).resolves.toMatchObject({ mustChangePassword: true });
  });

  test('changePassword sends both passwords, keeps the new token and gives the new session', async () => {
    api.post.mockResolvedValue({ data: { accessToken: 't2', player, role: 'player', mustChangePassword: false } });

    await expect(authService.changePassword('temporary', 'my new password')).resolves.toMatchObject({ accessToken: 't2' });

    expect(api.post).toHaveBeenCalledWith('/auth/password', { currentPassword: 'temporary', newPassword: 'my new password' });
    expect(setAccessToken).toHaveBeenCalledWith('t2');
  });

  test('deleteAccount sends the password with the delete and forgets the token', async () => {
    api.delete = vi.fn().mockResolvedValue({ data: { playerId: 'p1', credits: 0 } });

    await expect(authService.deleteAccount('la mia password')).resolves.toEqual({ playerId: 'p1', credits: 0 });

    expect(api.delete).toHaveBeenCalledWith('/auth/account', { password: 'la mia password' });
    expect(setAccessToken).toHaveBeenLastCalledWith(null);
  });

  test('without a session there is nobody', async () => {
    refreshSession.mockResolvedValue(null);

    await expect(authService.restoreSession()).resolves.toBeNull();
  });
});
