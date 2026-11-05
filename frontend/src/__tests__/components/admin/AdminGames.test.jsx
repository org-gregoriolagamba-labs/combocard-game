import React from 'react';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AdminScreen } from '../../../components/admin';
import { renderWithProviders } from '../../test-utils';
import * as adminService from '../../../services/adminService';
import { adminState, anna, carlo, dario, failure, pageOf, partita1, partita2 } from './fixtures';

vi.mock('../../../services/adminService');

describe('AdminScreen: the games', () => {
  beforeEach(() => {
    adminService.listUsers.mockResolvedValue(pageOf([anna, carlo, dario]));
    adminService.listAudit.mockResolvedValue(pageOf([]));
    adminService.listGames.mockResolvedValue(pageOf([partita1, partita2]));
  });

  const open = async () => {
    const view = renderWithProviders(<AdminScreen />, { preloadedState: adminState() });
    fireEvent.click(await screen.findByRole('tab', { name: 'Partite' }));
    await screen.findByRole('list', { name: 'Partite' });
    return view;
  };
  const row = (n) => within(screen.getByRole('list', { name: 'Partite' })).getAllByRole('listitem')[n];

  test('asks for the first page and tells each game: state, players, fee and prize pool', async () => {
    await open();

    expect(adminService.listGames).toHaveBeenCalledWith(expect.objectContaining({ page: 1, limit: 20 }));
    expect(row(0)).toHaveTextContent('In corso');
    expect(row(0)).toHaveTextContent('Anna, Carlo Rossi');
    expect(row(0)).toHaveTextContent('2 di 4 giocatori');
    expect(row(0)).toHaveTextContent('Quota 100');
    expect(row(0)).toHaveTextContent('Montepremi 200');
    expect(row(0)).not.toHaveTextContent('Privata');
    expect(row(1)).toHaveTextContent('In attesa');
    expect(row(1)).toHaveTextContent('Privata');
    expect(screen.getByText('2 partite')).toBeInTheDocument();
  });

  test('does not show the code of a private game in the list', async () => {
    await open();

    expect(screen.getByRole('list', { name: 'Partite' })).not.toHaveTextContent('g2');
  });

  test('filters by state and goes back to the first page', async () => {
    await open();

    fireEvent.change(screen.getByLabelText('Stato'), { target: { value: 'playing' } });

    await waitFor(() => expect(adminService.listGames).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'playing', page: 1 })));
  });

  test('says so when there are no games', async () => {
    adminService.listGames.mockResolvedValue(pageOf([]));
    await open();
    // the list is replaced by a message
    expect(screen.getByText('Nessuna partita in attesa o in corso')).toBeInTheDocument();
  });

  test('cancelling needs a reason, tells what happens to the players and sends the cancellation', async () => {
    adminService.cancelGame.mockResolvedValue({ gameId: 'g1', previousStatus: 'playing', players: [
      { playerId: 'p1', credits: 200, refund: 100 }, { playerId: 'p2', credits: 150, refund: 100 },
    ] });
    await open();

    fireEvent.click(within(row(0)).getByRole('button', { name: 'Annulla partita' }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('100 crediti');
    expect(dialog).toHaveTextContent('premi');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Conferma annullamento' }));
    expect(await within(dialog).findByText('Scrivi il motivo')).toBeInTheDocument();
    expect(adminService.cancelGame).not.toHaveBeenCalled();

    fireEvent.change(within(dialog).getByLabelText('Motivo'), { target: { value: '  bloccata  ' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Conferma annullamento' }));

    await waitFor(() => expect(adminService.cancelGame).toHaveBeenCalledWith('g1', { reason: 'bloccata' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(adminService.listGames.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  test('a game that is waiting says that nobody paid', async () => {
    await open();

    fireEvent.click(within(row(1)).getByRole('button', { name: 'Annulla partita' }));

    expect(await screen.findByRole('dialog')).toHaveTextContent('Nessuno ha ancora pagato');
  });

  test('a double tap sends one request', async () => {
    let finish;
    adminService.cancelGame.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    await open();
    fireEvent.click(within(row(0)).getByRole('button', { name: 'Annulla partita' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Motivo'), { target: { value: 'x' } });

    const confirm = within(dialog).getByRole('button', { name: 'Conferma annullamento' });
    fireEvent.click(confirm);
    fireEvent.click(confirm);

    expect(adminService.cancelGame).toHaveBeenCalledTimes(1);
    finish({ gameId: 'g1', previousStatus: 'playing', players: [] });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  test('an error of the server stays in the dialog, which stays open', async () => {
    adminService.cancelGame.mockRejectedValue(failure('Partita non trovata: controlla il codice', 404));
    await open();
    fireEvent.click(within(row(0)).getByRole('button', { name: 'Annulla partita' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Motivo'), { target: { value: 'x' } });

    fireEvent.click(within(dialog).getByRole('button', { name: 'Conferma annullamento' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Partita non trovata');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  test('"Indietro" closes the dialog and sends nothing', async () => {
    await open();
    fireEvent.click(within(row(0)).getByRole('button', { name: 'Annulla partita' }));

    fireEvent.click(await screen.findByRole('button', { name: 'Indietro' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(adminService.cancelGame).not.toHaveBeenCalled();
  });

  test('a 403 sends the player back to the hall', async () => {
    adminService.listGames.mockRejectedValue(failure('Non hai i permessi per farlo', 403));
    const { store } = renderWithProviders(<AdminScreen />, { preloadedState: adminState() });

    fireEvent.click(await screen.findByRole('tab', { name: 'Partite' }));

    await waitFor(() => expect(store.getState().ui.currentScreen).toBe('hall'));
  });

  test('a failed list can be asked again', async () => {
    adminService.listGames.mockRejectedValueOnce(failure('Impossibile contattare il server'));
    renderWithProviders(<AdminScreen />, { preloadedState: adminState() });
    fireEvent.click(await screen.findByRole('tab', { name: 'Partite' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Impossibile contattare il server');
    fireEvent.click(screen.getByRole('button', { name: 'Riprova' }));

    expect(await screen.findByRole('list', { name: 'Partite' })).toBeInTheDocument();
  });
});
