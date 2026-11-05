import React from 'react';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AdminScreen } from '../../../components/admin';
import { renderWithProviders } from '../../test-utils';
import * as adminService from '../../../services/adminService';
import { adminState, anna, carlo, dario, failure, pageOf } from './fixtures';

vi.mock('../../../services/adminService');

describe('AdminScreen: the list of the users', () => {
  beforeEach(() => {
    adminService.listUsers.mockResolvedValue(pageOf([anna, carlo, dario]));
    adminService.listAudit.mockResolvedValue(pageOf([]));
  });

  const open = async () => {
    const view = renderWithProviders(<AdminScreen />, { preloadedState: adminState() });
    await screen.findByRole('list', { name: 'Utenti' });
    return view;
  };

  test('asks for the first page and lists the users: name, credits, who is in a game, who is admin', async () => {
    await open();

    expect(adminService.listUsers).toHaveBeenCalledWith(expect.objectContaining({ page: 1, limit: 20 }));
    const items = within(screen.getByRole('list', { name: 'Utenti' })).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('Anna');
    expect(items[0]).toHaveTextContent('100 crediti');
    expect(items[0]).not.toHaveTextContent('In partita');
    expect(items[1]).toHaveTextContent('In partita');
    expect(items[2]).toHaveTextContent('Admin');
    expect(screen.getByText('3 utenti')).toBeInTheDocument();
  });

  test('says "1 utente" for one, and says so when there is nobody', async () => {
    adminService.listUsers.mockResolvedValue(pageOf([anna]));
    const { unmount } = await open();
    expect(screen.getByText('1 utente')).toBeInTheDocument();
    unmount();

    adminService.listUsers.mockResolvedValue(pageOf([], 0));
    renderWithProviders(<AdminScreen />, { preloadedState: adminState() });

    expect(await screen.findByText('Nessun utente trovato')).toBeInTheDocument();
  });

  test('shows that it is loading', async () => {
    adminService.listUsers.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<AdminScreen />, { preloadedState: adminState() });

    expect(screen.getByRole('status')).toHaveTextContent('Caricamento degli utenti');
  });

  test('searches by name: the search goes back to the first page', async () => {
    await open();

    fireEvent.change(screen.getByLabelText('Cerca per nome'), { target: { value: 'ann' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cerca' }));

    await waitFor(() => expect(adminService.listUsers).toHaveBeenLastCalledWith(expect.objectContaining({ q: 'ann', page: 1 })));
  });

  test('filters by role, keeping the search', async () => {
    await open();
    fireEvent.change(screen.getByLabelText('Cerca per nome'), { target: { value: 'ann' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cerca' }));

    fireEvent.change(screen.getByLabelText('Ruolo'), { target: { value: 'admin' } });

    await waitFor(() =>
      expect(adminService.listUsers).toHaveBeenLastCalledWith(expect.objectContaining({ q: 'ann', role: 'admin', page: 1 })));
  });

  test('has pages when there are more users than fit in one, and goes back and forth', async () => {
    adminService.listUsers.mockResolvedValue(pageOf([anna], 45, 1, 20));
    await open();

    expect(screen.getByText('Pagina 1 di 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pagina precedente' })).toBeDisabled();

    adminService.listUsers.mockResolvedValue(pageOf([carlo], 45, 2, 20));
    fireEvent.click(screen.getByRole('button', { name: 'Pagina successiva' }));

    expect(await screen.findByText('Pagina 2 di 3')).toBeInTheDocument();
    expect(adminService.listUsers).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }));
    expect(screen.getByRole('button', { name: 'Pagina precedente' })).toBeEnabled();
  });

  test('has no pages when everything fits in one', async () => {
    await open();

    expect(screen.queryByRole('button', { name: 'Pagina successiva' })).not.toBeInTheDocument();
  });

  test('says what went wrong, and tries again on request', async () => {
    adminService.listUsers.mockRejectedValueOnce(failure('Impossibile contattare il server: controlla la connessione e riprova'));
    renderWithProviders(<AdminScreen />, { preloadedState: adminState() });

    expect(await screen.findByRole('alert')).toHaveTextContent('Impossibile contattare il server');

    fireEvent.click(screen.getByRole('button', { name: 'Riprova' }));

    expect(await screen.findByRole('list', { name: 'Utenti' })).toBeInTheDocument();
  });

  test('a 403 means the player is not an admin any more: back to the hall, as a player, with a message', async () => {
    adminService.listUsers.mockRejectedValue(failure('Non hai i permessi per farlo', 403));

    const { store } = renderWithProviders(<AdminScreen />, { preloadedState: adminState() });

    await waitFor(() => expect(store.getState().ui.currentScreen).toBe('hall'));
    expect(store.getState().player.role).toBe('player');
    expect(store.getState().ui.toasts.map((t) => t.message)).toContain("Non hai più i permessi dell'amministrazione");
  });

  test('has a way back to the hall', async () => {
    const { store } = await open();

    fireEvent.click(screen.getByRole('button', { name: 'Torna alla hall' }));

    expect(store.getState().ui.currentScreen).toBe('hall');
  });

  test('every user has the two actions, named after them', async () => {
    await open();

    expect(screen.getByRole('button', { name: 'Modifica Anna' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rettifica crediti di Anna' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Modifica Carlo Rossi' })).toBeInTheDocument();
  });
});
