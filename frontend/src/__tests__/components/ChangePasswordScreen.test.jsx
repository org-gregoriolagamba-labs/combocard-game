import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ChangePasswordScreen } from '../../components/game';
import { renderWithProviders } from '../test-utils';
import * as authService from '../../services/authService';
import * as gameService from '../../services/gameService';

vi.mock('../../services/authService');
vi.mock('../../services/gameService');

const state = (extra = {}) => ({
  player: { id: 'p1', name: 'Anna', credits: 100, currentGameId: null, regoleAccettateIl: '2026-11-03T10:00:00.000Z', isLoading: false, error: null, sessionChecked: true, role: 'player', mustChangePassword: true, ...extra },
  ui: { toasts: [], currentScreen: 'home', modals: {}, isLoading: false, vittoriaRecente: null },
  game: { lobbies: [], currentGameId: null, game: null, currentPlayer: null },
});

const fill = (current, next, again = next) => {
  fireEvent.change(screen.getByLabelText('Password provvisoria'), { target: { value: current } });
  fireEvent.change(screen.getByLabelText('Nuova password'), { target: { value: next } });
  fireEvent.change(screen.getByLabelText('Ripeti la nuova password'), { target: { value: again } });
};
const send = () => fireEvent.click(screen.getByRole('button', { name: 'Salva la nuova password' }));
const message = (label) => document.getElementById(screen.getByLabelText(label).getAttribute('aria-describedby'));

describe('ChangePasswordScreen', () => {
  beforeEach(() => {
    gameService.getLobby.mockResolvedValue([]);
  });

  test('says why, and the three fields hide what is typed', () => {
    renderWithProviders(<ChangePasswordScreen />, { preloadedState: state() });

    expect(screen.getByRole('heading', { name: 'Scegli una nuova password' })).toBeInTheDocument();
    for (const label of ['Password provvisoria', 'Nuova password', 'Ripeti la nuova password']) {
      expect(screen.getByLabelText(label)).toHaveAttribute('type', 'password');
    }
  });

  test('sends the two passwords, then the player goes on to the hall and the obligation is gone', async () => {
    authService.changePassword.mockResolvedValue({ accessToken: 't2', player: { id: 'p1', name: 'Anna', credits: 100, currentGameId: null }, role: 'player', mustChangePassword: false });
    const { store } = renderWithProviders(<ChangePasswordScreen />, { preloadedState: state() });

    fill('K7QM-X2PD-9WJT', 'una password mia');
    send();

    await waitFor(() => expect(store.getState().player.mustChangePassword).toBe(false));
    expect(authService.changePassword).toHaveBeenCalledWith('K7QM-X2PD-9WJT', 'una password mia');
    await waitFor(() => expect(store.getState().ui.currentScreen).toBe('hall'));
  });

  test.each([
    ['an empty temporary password', '', 'una password mia', 'una password mia', 'Password provvisoria', 'Scrivi la password provvisoria'],
    ['a new password that is too short', 'x', 'corta', 'corta', 'Nuova password', 'Almeno 8 caratteri'],
    ['two new passwords that differ', 'x', 'una password mia', 'un\'altra password', 'Ripeti la nuova password', 'Le due password non coincidono'],
  ])('%s is explained in the field, and nothing is sent', (_name, current, next, again, label, text) => {
    renderWithProviders(<ChangePasswordScreen />, { preloadedState: state() });

    fill(current, next, again);
    send();

    expect(message(label)).toHaveTextContent(text);
    expect(authService.changePassword).not.toHaveBeenCalled();
  });

  test('an error of the server is shown, and the player stays here', async () => {
    authService.changePassword.mockRejectedValue(Object.assign(new Error('La password attuale non è corretta'), { status: 400 }));
    const { store } = renderWithProviders(<ChangePasswordScreen />, { preloadedState: state() });

    fill('sbagliata', 'una password mia');
    send();

    expect(await screen.findByRole('alert')).toHaveTextContent('La password attuale non è corretta');
    expect(store.getState().player.mustChangePassword).toBe(true);
  });

  test('a double tap sends it once', () => {
    authService.changePassword.mockImplementation(() => new Promise(() => {}));
    renderWithProviders(<ChangePasswordScreen />, { preloadedState: state() });

    fill('K7QM-X2PD-9WJT', 'una password mia');
    send();
    send();

    expect(authService.changePassword).toHaveBeenCalledTimes(1);
  });

  test('"Esci" logs out without choosing', async () => {
    authService.logout.mockResolvedValue();
    const { store } = renderWithProviders(<ChangePasswordScreen />, { preloadedState: state() });

    fireEvent.click(screen.getByRole('button', { name: 'Esci' }));

    await waitFor(() => expect(store.getState().player.id).toBeNull());
    expect(authService.changePassword).not.toHaveBeenCalled();
  });
});
