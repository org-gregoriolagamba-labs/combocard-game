import api from '../../services/api';
import { getMovements, getStats } from '../../services/meService';

vi.mock('../../services/api', () => ({ default: { get: vi.fn() } }));

describe('meService', () => {
  beforeEach(() => api.get.mockReset());

  test('getMovements asks for a page, and sends only the filters that have a value', async () => {
    api.get.mockResolvedValue({ data: { disponibile: true, items: [], total: 0 } });

    const result = await getMovements({ page: 2, limit: 20, type: 'game_payout', from: '', to: undefined });

    expect(api.get).toHaveBeenCalledWith('/me/movements?page=2&limit=20&type=game_payout');
    expect(result).toEqual({ disponibile: true, items: [], total: 0 });
  });

  test('getMovements without filters asks for the first page of the server', async () => {
    api.get.mockResolvedValue({ data: {} });

    await getMovements();

    expect(api.get).toHaveBeenCalledWith('/me/movements');
  });

  test('getStats reads the statistics', async () => {
    api.get.mockResolvedValue({ data: { disponibile: true, statistiche: { partiteGiocate: 1 } } });

    await expect(getStats()).resolves.toEqual({ disponibile: true, statistiche: { partiteGiocate: 1 } });
    expect(api.get).toHaveBeenCalledWith('/me/stats');
  });
});
