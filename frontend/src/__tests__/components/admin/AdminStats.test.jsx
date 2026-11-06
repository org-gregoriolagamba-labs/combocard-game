import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AdminScreen } from '../../../components/admin';
import { renderWithProviders } from '../../test-utils';
import * as adminService from '../../../services/adminService';
import { adminState, anna, failure, pageOf } from './fixtures';

vi.mock('../../../services/adminService');

const STATS = {
  users: { registered: 12, inGame: 5, admins: 2 },
  games: { waiting: 1, playing: 2, finished: 40, cancelled: 3 },
  credits: { inCirculation: 9000, inPlay: 600 },
  prizesDistributed: 12000,
};

describe('AdminScreen: the statistics', () => {
  beforeEach(() => {
    adminService.listUsers.mockResolvedValue(pageOf([anna]));
    adminService.listAudit.mockResolvedValue(pageOf([]));
    adminService.listGames.mockResolvedValue(pageOf([]));
    adminService.getStats.mockResolvedValue(STATS);
  });

  const open = async () => {
    const view = renderWithProviders(<AdminScreen />, { preloadedState: adminState() });
    fireEvent.click(await screen.findByRole('tab', { name: 'Statistiche' }));
    return view;
  };
  const value = async (label) => (await screen.findByText(label)).parentElement.querySelector('dd').textContent;

  test('shows the numbers of the platform', async () => {
    await open();

    expect(await value('Utenti registrati')).toBe('12');
    expect(await value('In partita ora')).toBe('5');
    expect(await value('Admin')).toBe('2');
    expect(await value('Partite in attesa')).toBe('1');
    expect(await value('Partite in corso')).toBe('2');
    expect(await value('Partite finite')).toBe('40');
    expect(await value('Partite annullate')).toBe('3');
    expect(await value('Crediti in circolazione')).toMatch(/9\.?000/);
    expect(await value('Crediti nei montepremi in corso')).toBe('600');
    expect(await value('Montepremi distribuiti')).toMatch(/12\.?000/);
  });

  test('"Aggiorna" asks again', async () => {
    await open();
    await screen.findByText('Utenti registrati');

    fireEvent.click(screen.getByRole('button', { name: 'Aggiorna' }));

    await waitFor(() => expect(adminService.getStats).toHaveBeenCalledTimes(2));
  });

  test('an error can be asked again, and a 403 sends the player to the hall', async () => {
    adminService.getStats.mockRejectedValueOnce(failure('Impossibile contattare il server'));
    await open();
    expect(await screen.findByRole('alert')).toHaveTextContent('Impossibile contattare il server');

    fireEvent.click(screen.getByRole('button', { name: 'Riprova' }));

    expect(await screen.findByText('Utenti registrati')).toBeInTheDocument();
  });

  test('a 403 sends the player back to the hall', async () => {
    adminService.getStats.mockRejectedValue(failure('Non hai i permessi per farlo', 403));
    const { store } = renderWithProviders(<AdminScreen />, { preloadedState: adminState() });

    fireEvent.click(await screen.findByRole('tab', { name: 'Statistiche' }));

    await waitFor(() => expect(store.getState().ui.currentScreen).toBe('hall'));
  });
});
