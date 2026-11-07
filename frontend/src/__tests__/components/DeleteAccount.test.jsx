import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { HallScreen } from '../../components/game';
import { renderWithProviders, createTestStore } from '../test-utils';
import { deleteOwnAccount } from '../../store/sessionThunks';
import * as authService from '../../services/authService';
import * as gameService from '../../services/gameService';

vi.mock('../../services/authService');
vi.mock('../../services/gameService');

const state = () => ({
  player: { id: 'p1', name: 'Anna', credits: 100, regoleAccettateIl: '2026-11-03T10:00:00.000Z', role: 'player' },
  ui: { toasts: [], currentScreen: 'hall', modals: {}, isLoading: false, vittoriaRecente: null },
  game: { lobbies: [], currentGameId: null, game: null, currentPlayer: null },
});

const failure = (message, status) => Object.assign(new Error(message), status ? { status } : {});

describe('the deletion of one\'s own account', () => {
  beforeEach(() => {
    gameService.getLobby.mockResolvedValue([]);
  });

  const open = () => {
    const view = renderWithProviders(<HallScreen />, { preloadedState: state() });
    fireEvent.click(screen.getByRole('button', { name: 'Elimina il mio account' }));
    return view;
  };
  const type = (label, value) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
  const confirm = () => fireEvent.click(screen.getByRole('button', { name: 'Elimina definitivamente' }));
  const filled = () => {
    type('La tua password', 'la mia password');
    type('Scrivi il tuo nome utente per confermare', 'Anna');
  };

  test('is offered in the hall, opens a dialog that says it cannot be undone and what stays', async () => {
    open();

    const dialog = await screen.findByRole('dialog', { name: 'Elimina il mio account' });
    expect(dialog).toHaveTextContent('Operazione irreversibile');
    expect(dialog).toHaveTextContent('crediti');
    expect(dialog).toHaveTextContent('Utente eliminato');
  });

  test('the button stays off until the username is written exactly', async () => {
    open();
    await screen.findByRole('dialog');
    const button = screen.getByRole('button', { name: 'Elimina definitivamente' });
    expect(button).toBeDisabled();

    type('Scrivi il tuo nome utente per confermare', 'anna');
    expect(button).toBeDisabled();
    type('Scrivi il tuo nome utente per confermare', 'Anna');
    expect(button).toBeEnabled();
  });

  test('the password is hidden, and an empty one is explained and not sent', async () => {
    open();
    await screen.findByRole('dialog');
    expect(screen.getByLabelText('La tua password')).toHaveAttribute('type', 'password');

    type('Scrivi il tuo nome utente per confermare', 'Anna');
    confirm();

    expect(document.getElementById(screen.getByLabelText('La tua password').getAttribute('aria-describedby'))).toHaveTextContent('Scrivi la tua password');
    expect(authService.deleteAccount).not.toHaveBeenCalled();
  });

  test('deletes: sends the password, and the player is out, at the start, and told', async () => {
    authService.deleteAccount.mockResolvedValue({ playerId: 'p1', credits: 100 });
    const { store } = open();
    await screen.findByRole('dialog');

    filled();
    confirm();

    await waitFor(() => expect(store.getState().player.id).toBeNull());
    expect(authService.deleteAccount).toHaveBeenCalledWith('la mia password');
    expect(store.getState().ui.currentScreen).toBe('home');
    expect(store.getState().ui.toasts.map((t) => t.message)).toContain('Il tuo account è stato eliminato');
  });

  test('an error of the server is shown in the dialog, which stays open, and the player stays', async () => {
    authService.deleteAccount.mockRejectedValue(failure('La password attuale non è corretta', 400));
    const { store } = open();
    await screen.findByRole('dialog');

    filled();
    confirm();

    expect(await screen.findByRole('alert')).toHaveTextContent('La password attuale non è corretta');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(store.getState().player.id).toBe('p1');
  });

  test('a double tap sends it once', async () => {
    authService.deleteAccount.mockImplementation(() => new Promise(() => {}));
    open();
    await screen.findByRole('dialog');

    filled();
    const button = screen.getByRole('button', { name: 'Elimina definitivamente' });
    fireEvent.click(button);
    fireEvent.click(button);

    await waitFor(() => expect(authService.deleteAccount).toHaveBeenCalledTimes(1));
  });

  test('"Indietro" closes the dialog and sends nothing', async () => {
    open();
    await screen.findByRole('dialog');

    fireEvent.click(screen.getByRole('button', { name: 'Indietro' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(authService.deleteAccount).not.toHaveBeenCalled();
  });
});

describe('deleteOwnAccount thunk', () => {
  test('when the socket already ended the session, the notice is not shown twice', async () => {
    authService.deleteAccount.mockResolvedValue({ playerId: 'p1', credits: 0 });
    const preloaded = state();
    preloaded.player.id = null; // the event "sessionEnded" arrived first and cleared the player
    const store = createTestStore(preloaded);

    await store.dispatch(deleteOwnAccount('pw'));

    expect(store.getState().ui.toasts).toEqual([]);
  });

  test('the error goes to whoever asked', async () => {
    authService.deleteAccount.mockRejectedValue(failure('x', 409));
    const store = createTestStore(state());

    await expect(store.dispatch(deleteOwnAccount('pw'))).rejects.toThrow('x');
    expect(store.getState().player.id).toBe('p1');
  });
});
