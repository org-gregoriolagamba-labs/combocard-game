import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LobbyScreen } from '../../components/game';
import { renderWithProviders } from '../test-utils';
import * as gameService from '../../services/gameService';

vi.mock('../../services/gameService');

const state = ({ isPrivate = true, asCreator = true } = {}) => {
  const me = { id: 'p1', name: 'Anna' };
  const other = { id: 'p2', name: 'Bruno' };
  return {
    player: { id: 'p1', name: 'Anna', credits: 100 },
    game: {
      lobbies: [],
      currentGameId: 'abc123',
      currentPlayer: null,
      game: {
        id: 'abc123',
        status: 'waiting',
        isPrivate,
        requiredCredits: 50,
        maxPlayers: 4,
        players: asCreator ? [me] : [other, me],
      },
    },
  };
};

describe('LobbyScreen', () => {
  beforeEach(() => {
    gameService.getGame.mockResolvedValue(state().game.game);
  });

  afterEach(() => {
    delete navigator.clipboard;
    document.execCommand = undefined;
  });

  test('shows the game code and how friends join with it', () => {
    renderWithProviders(<LobbyScreen />, { preloadedState: state() });

    expect(screen.getByText('abc123')).toBeInTheDocument();
    expect(screen.getByText(/Unisciti a Partita Privata/i)).toBeInTheDocument();
  });

  test('a public game does not explain the private entrance', () => {
    renderWithProviders(<LobbyScreen />, { preloadedState: state({ isPrivate: false }) });

    expect(screen.queryByText(/Unisciti a Partita Privata/i)).not.toBeInTheDocument();
  });

  test('copies the code and says so', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const { store } = renderWithProviders(<LobbyScreen />, { preloadedState: state() });

    fireEvent.click(screen.getByRole('button', { name: 'Copia il codice della partita' }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith('abc123'));
    await waitFor(() => expect(store.getState().ui.toasts.at(-1).message).toMatch(/codice copiato/i));
  });

  test('without the clipboard (plain http on the LAN) it still copies', async () => {
    document.execCommand = vi.fn().mockReturnValue(true);
    const { store } = renderWithProviders(<LobbyScreen />, { preloadedState: state() });

    fireEvent.click(screen.getByRole('button', { name: 'Copia il codice della partita' }));

    await waitFor(() => expect(document.execCommand).toHaveBeenCalledWith('copy'));
    expect(store.getState().ui.toasts.at(-1).message).toMatch(/codice copiato/i);
  });

  test('if copying is impossible it tells how to do it by hand', async () => {
    document.execCommand = vi.fn().mockReturnValue(false);
    const { store } = renderWithProviders(<LobbyScreen />, { preloadedState: state() });

    fireEvent.click(screen.getByRole('button', { name: 'Copia il codice della partita' }));

    await waitFor(() => expect(store.getState().ui.toasts.at(-1).type).toBe('error'));
    expect(store.getState().ui.toasts.at(-1).message).toMatch(/tieni premuto/i);
  });

  describe('players who have not confirmed the rules', () => {
    const withReaders = (regole, { asCreator = true } = {}) => {
      const s = state({ asCreator });
      const bruno = { id: 'p2', name: 'Bruno', regoleLette: regole.bruno };
      const carla = { id: 'p3', name: 'Carla', regoleLette: regole.carla };
      s.game.game.players = [...s.game.game.players.map((p) => ({ ...p, regoleLette: true })), bruno, carla].filter(
        (p) => p.regoleLette !== undefined,
      );
      gameService.getGame.mockResolvedValue(s.game.game);
      return s;
    };

    test('the lobby says who the game is waiting for, to everybody', () => {
      renderWithProviders(<LobbyScreen />, { preloadedState: withReaders({ bruno: false }) });

      expect(screen.getByRole('status', { name: /regole/i })).toHaveTextContent(
        'In attesa che Bruno confermi di aver letto le regole',
      );
    });

    test('with two players missing, the sentence is in the plural', () => {
      renderWithProviders(<LobbyScreen />, { preloadedState: withReaders({ bruno: false, carla: false }) });

      expect(screen.getByRole('status', { name: /regole/i })).toHaveTextContent(
        'In attesa che Bruno e Carla confermino di aver letto le regole',
      );
    });

    test('also a player who is not the creator sees it', () => {
      renderWithProviders(<LobbyScreen />, { preloadedState: withReaders({ bruno: false }, { asCreator: false }) });

      expect(screen.getByRole('status', { name: /regole/i })).toBeInTheDocument();
    });

    test('the creator cannot start until everybody has confirmed', () => {
      renderWithProviders(<LobbyScreen />, { preloadedState: withReaders({ bruno: false }) });

      expect(screen.queryByRole('button', { name: 'Inizia Partita' })).not.toBeInTheDocument();
      expect(screen.getByText(/La partita inizia appena tutti hanno confermato/)).toBeInTheDocument();
    });

    test('the player list marks who is still reading', () => {
      renderWithProviders(<LobbyScreen />, { preloadedState: withReaders({ bruno: false }) });

      expect(screen.getByText('Sta leggendo le regole')).toBeInTheDocument();
    });

    test('once everybody has confirmed there is no wait and the creator can start', () => {
      renderWithProviders(<LobbyScreen />, { preloadedState: withReaders({ bruno: true }) });

      expect(screen.queryByRole('status', { name: /regole/i })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Inizia Partita' })).toBeEnabled();
    });
  });

  test('marks who created the game with a word, not a crown', () => {
    renderWithProviders(<LobbyScreen />, { preloadedState: state({ asCreator: false }) });

    expect(screen.getByText('Creatore')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/👑|⏳|🔒|🌐|🎴/u);
  });

  test('says who draws: every player in turn, or only the creator', () => {
    const turni = state();
    turni.game.game.estrazione = 'tutti';
    const { unmount } = renderWithProviders(<LobbyScreen />, { preloadedState: turni });
    expect(screen.getByText(/Le carte le estraggono a turno tutti i giocatori/)).toBeInTheDocument();
    unmount();

    renderWithProviders(<LobbyScreen />, { preloadedState: state() });
    expect(screen.getByText(/Le carte le estrae il creatore/)).toBeInTheDocument();
  });
});
