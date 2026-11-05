import api from '../../services/api';
import * as adminService from '../../services/adminService';

vi.mock('../../services/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}));

describe('adminService', () => {
  beforeEach(() => {
    api.get.mockResolvedValue({ data: 'answer' });
    api.post.mockResolvedValue({ data: 'answer' });
    api.patch.mockResolvedValue({ data: 'answer' });
  });

  test('listUsers asks for the page with what was filled in, and leaves out what is empty', async () => {
    await expect(adminService.listUsers({ q: 'an', role: 'admin', page: 2, limit: 10 })).resolves.toBe('answer');

    expect(api.get).toHaveBeenCalledWith('/admin/users?q=an&role=admin&page=2&limit=10');
  });

  test('listUsers without filters asks only for the page', async () => {
    await adminService.listUsers({ q: '', role: '', page: 1, limit: 20 });

    expect(api.get).toHaveBeenCalledWith('/admin/users?page=1&limit=20');
  });

  test('a name with spaces and symbols is written safely in the address', async () => {
    await adminService.listUsers({ q: 'Carlo & Anna/1', page: 1, limit: 20 });

    expect(api.get).toHaveBeenCalledWith('/admin/users?q=Carlo+%26+Anna%2F1&page=1&limit=20');
  });

  test('getUser asks for one user', async () => {
    await adminService.getUser('p 1');

    expect(api.get).toHaveBeenCalledWith('/admin/users/p%201');
  });

  test('updateUser sends only the change', async () => {
    await expect(adminService.updateUser('p1', { username: 'Anna Rossi' })).resolves.toBe('answer');
    await adminService.updateUser('p1', { role: 'admin' });

    expect(api.patch).toHaveBeenNthCalledWith(1, '/admin/users/p1', { username: 'Anna Rossi' });
    expect(api.patch).toHaveBeenNthCalledWith(2, '/admin/users/p1', { role: 'admin' });
  });

  test('adjustCredits sends the amount with its sign and the reason', async () => {
    await expect(adminService.adjustCredits('p1', { amount: -30, reason: 'correzione' })).resolves.toBe('answer');

    expect(api.post).toHaveBeenCalledWith('/admin/users/p1/credits', { amount: -30, reason: 'correzione' });
  });

  test('listAudit asks for the page, and for a user if one is chosen', async () => {
    await adminService.listAudit({ page: 3, limit: 20 });
    await adminService.listAudit({ targetId: 'p1', page: 1, limit: 20 });

    expect(api.get).toHaveBeenNthCalledWith(1, '/admin/audit?page=3&limit=20');
    expect(api.get).toHaveBeenNthCalledWith(2, '/admin/audit?targetId=p1&page=1&limit=20');
  });
});
