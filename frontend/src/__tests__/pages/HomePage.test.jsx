import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { HomePage } from '../../pages';
import { renderWithProviders } from '../test-utils';
import { setAccessToken } from '../../services/api';

jest.mock('../../services/socketService', () => ({
  __esModule: true,
  default: { connect: jest.fn(), disconnect: jest.fn(), getSocket: jest.fn() },
}));

const jsonResponse = (status, body) => ({ ok: status < 400, status, json: async () => body });
const session = {
  data: {
    accessToken: 't1',
    player: { id: 'p1', name: 'Anna', credits: 0, currentGameId: null },
  },
};

const fill = (username, password) => {
  fireEvent.change(screen.getByLabelText(/nome utente/i), { target: { value: username } });
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: password } });
};

describe('HomePage', () => {
  let errorSpy;

  beforeEach(() => {
    setAccessToken(null);
    global.fetch = jest.fn();
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  test('logs in by default, with a password field that hides the text', async () => {
    global.fetch.mockResolvedValue(jsonResponse(200, session));
    const { store } = renderWithProviders(<HomePage />);

    expect(screen.getByLabelText(/password/i)).toHaveAttribute('type', 'password');
    fill('Anna', 'x');
    fireEvent.click(screen.getByRole('button', { name: /accedi/i }));

    await waitFor(() => expect(store.getState().ui.currentScreen).toBe('hall'));
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toMatch(/\/auth\/login$/);
    expect(JSON.parse(options.body)).toEqual({ username: 'Anna', password: 'x' });
    expect(store.getState().player.id).toBe('p1');
  });

  test('switches to the registration', async () => {
    global.fetch.mockResolvedValue(jsonResponse(201, session));
    const { store } = renderWithProviders(<HomePage />);

    fireEvent.click(screen.getByRole('button', { name: /crea un account/i }));
    fill('Anna', 'long enough');
    fireEvent.click(screen.getByRole('button', { name: /registrati/i }));

    await waitFor(() => expect(store.getState().ui.currentScreen).toBe('hall'));
    expect(global.fetch.mock.calls[0][0]).toMatch(/\/auth\/register$/);
  });

  test('does not send a registration with a short password', () => {
    renderWithProviders(<HomePage />);

    fireEvent.click(screen.getByRole('button', { name: /crea un account/i }));
    fill('Anna', 'short');
    fireEvent.click(screen.getByRole('button', { name: /registrati/i }));

    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('shows a clear message for a taken username, in Italian', async () => {
    global.fetch.mockResolvedValue(jsonResponse(409, { message: 'Username already taken' }));
    const { store } = renderWithProviders(<HomePage />);

    fireEvent.click(screen.getByRole('button', { name: /crea un account/i }));
    fill('Anna', 'long enough');
    fireEvent.click(screen.getByRole('button', { name: /registrati/i }));

    expect(await screen.findByText('Questo nome utente è già in uso')).toBeInTheDocument();
    expect(store.getState().ui.currentScreen).toBe('home');
  });

  describe('errors appear in one place only', () => {
    test('a wrong password is an inline alert and not also a notice', async () => {
      global.fetch.mockResolvedValue(jsonResponse(401, { message: 'Invalid username or password' }));
      const { store } = renderWithProviders(<HomePage />);

      fill('Anna', 'wrong password');
      fireEvent.click(screen.getByRole('button', { name: /accedi/i }));

      expect(await screen.findByRole('alert')).toHaveTextContent('Nome utente o password non corretti');
      expect(store.getState().ui.toasts).toHaveLength(0);
    });

    test('empty fields are explained in the form, without sending anything', () => {
      const { store } = renderWithProviders(<HomePage />);

      fireEvent.click(screen.getByRole('button', { name: /accedi/i }));

      expect(screen.getByRole('alert')).toHaveTextContent('Inserisci nome utente e password');
      expect(store.getState().ui.toasts).toHaveLength(0);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test('a short password says what is needed, in the form', () => {
      renderWithProviders(<HomePage />);

      fireEvent.click(screen.getByRole('button', { name: /crea un account/i }));
      fill('Anna', 'short');
      fireEvent.click(screen.getByRole('button', { name: /registrati/i }));

      expect(screen.getByRole('alert')).toHaveTextContent('La password deve avere almeno 8 caratteri');
    });

    test('the message goes away when the player changes the field', () => {
      renderWithProviders(<HomePage />);
      fireEvent.click(screen.getByRole('button', { name: /accedi/i }));
      expect(screen.getByRole('alert')).toBeInTheDocument();

      fireEvent.change(screen.getByLabelText(/nome utente/i), { target: { value: 'A' } });

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    test('the fields point to the message', () => {
      renderWithProviders(<HomePage />);

      fireEvent.click(screen.getByRole('button', { name: /accedi/i }));

      expect(screen.getByLabelText(/nome utente/i)).toHaveAccessibleDescription('Inserisci nome utente e password');
    });
  });

  test('goes back to the game in progress after the login', async () => {
    const game = {
      id: 'g1',
      status: 'playing',
      carteEstratte: [{ valore: 'Re' }],
      players: [{ id: 'p1', name: 'Anna' }],
    };
    global.fetch
      .mockResolvedValueOnce(jsonResponse(200, {
        data: { accessToken: 't1', player: { id: 'p1', name: 'Anna', credits: 0, currentGameId: 'g1' } },
      }))
      .mockResolvedValueOnce(jsonResponse(200, { data: game }));
    const { store } = renderWithProviders(<HomePage />);

    fill('Anna', 'x');
    fireEvent.click(screen.getByRole('button', { name: /accedi/i }));

    await waitFor(() => expect(store.getState().ui.currentScreen).toBe('game'));
    expect(store.getState().game.currentGameId).toBe('g1');
    expect(store.getState().game.ultimaCartaEstratta).toEqual({ valore: 'Re' });
  });
});
