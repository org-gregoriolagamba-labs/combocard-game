import React from 'react';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { GameScreen } from '../../components/game';
import { renderWithProviders, mockGameState } from '../test-utils';
import * as gameService from '../../services/gameService';

vi.mock('../../services/gameService');

const carta = { valore: 'Asso', seme: 'Spade', emoji: '⚔️', valoreNum: 1 };
const cartella = Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => ({ ...carta })));
const coperte = Array.from({ length: 5 }, () => Array(5).fill(false));

const stateFor = (playerId, overrides = {}) => {
  const anna = { ...mockGameState.game.players[0], id: 'anna', name: 'Anna', gettoni: 80 };
  const carlo = { ...anna, id: 'carlo', name: 'Carlo', gettoni: 50 };
  const me = playerId === 'anna' ? anna : carlo;

  return {
    player: { id: playerId, name: me.name },
    game: {
      ...mockGameState,
      game: { ...mockGameState.game, players: [anna, carlo], carteRimaste: 36 },
      currentPlayer: { ...me, cartella, coperte },
      ...overrides,
    },
  };
};

describe('GameScreen', () => {
  test('the creator draws from the action bar', () => {
    renderWithProviders(<GameScreen />, { preloadedState: stateFor('anna') });

    expect(screen.getAllByRole('button', { name: /Estrai Carta/ }).length).toBeGreaterThan(0);
  });

  test('another player is told who draws, and has no draw button', () => {
    renderWithProviders(<GameScreen />, { preloadedState: stateFor('carlo') });

    expect(screen.getAllByText(/Estrae Anna/).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /Estrai Carta/ })).not.toBeInTheDocument();
  });

  test('the number of cards left is shown once', () => {
    renderWithProviders(<GameScreen />, { preloadedState: stateFor('anna') });

    expect(screen.getAllByText('Carte rimaste: 36/40')).toHaveLength(1);
  });

  test('the header keeps the pot, the own tokens and the way out', () => {
    renderWithProviders(<GameScreen />, { preloadedState: stateFor('carlo') });

    expect(screen.getByText('Montepremi')).toBeInTheDocument();
    expect(screen.getByText('I tuoi crediti')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Hall/ })).toBeInTheDocument();
  });

  test('every collection shows its progress and prize, and has a jolly button', () => {
    renderWithProviders(<GameScreen />, { preloadedState: stateFor('carlo') });

    for (const [tipo, label] of [['tris', 'TRIS'], ['sequenza', 'SEQUENZA'], ['scopa', 'SCOPA'], ['napola', 'NAPOLA'], ['combocard_reale', 'COMBOCARD REALE']]) {
      expect(screen.getByTestId(`collezione-${tipo}`)).toHaveTextContent(/Premio \d+/);
      expect(screen.getByRole('button', { name: `Usa il Jolly per ${label}` })).toBeInTheDocument();
    }
  });

  test('the collections cannot be claimed by hand: the server wins them by itself', () => {
    renderWithProviders(<GameScreen />, { preloadedState: stateFor('carlo') });

    expect(screen.queryByRole('button', { name: /^🎯 TRIS$/ })).not.toBeInTheDocument();
    expect(gameService.claimCollection).toBeUndefined();
  });

  describe('leaving the game', () => {
    const leave = () => fireEvent.click(screen.getByRole('button', { name: /Hall/ }));

    beforeEach(() => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      gameService.leaveGame.mockResolvedValue({ success: true });
    });

    test('while the game is in progress asks in a dialog that names the consequence', () => {
      renderWithProviders(<GameScreen />, { preloadedState: stateFor('carlo') });

      leave();

      const dialog = screen.getByRole('dialog', { name: 'Uscire dalla partita?' });
      expect(dialog).toHaveTextContent('perdi i crediti spesi per partecipare');
      expect(window.confirm).not.toHaveBeenCalled();
      expect(gameService.leaveGame).not.toHaveBeenCalled();
    });

    test('"Resta in partita" closes the dialog and stays', () => {
      renderWithProviders(<GameScreen />, { preloadedState: stateFor('carlo') });
      leave();

      fireEvent.click(screen.getByRole('button', { name: 'Resta in partita' }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(gameService.leaveGame).not.toHaveBeenCalled();
    });

    test('"Esci dalla partita" leaves it', async () => {
      renderWithProviders(<GameScreen />, { preloadedState: stateFor('carlo') });
      leave();

      fireEvent.click(screen.getByRole('button', { name: 'Esci dalla partita' }));

      await waitFor(() => expect(gameService.leaveGame).toHaveBeenCalledWith('game-456'));
    });

    test('Esc does not leave the game', () => {
      renderWithProviders(<GameScreen />, { preloadedState: stateFor('carlo') });
      leave();

      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(gameService.leaveGame).not.toHaveBeenCalled();
    });

    test('once the game is finished it leaves without asking', async () => {
      const state = stateFor('carlo');
      state.game.game.status = 'finished';
      renderWithProviders(<GameScreen />, { preloadedState: state });

      fireEvent.click(screen.getAllByRole('button', { name: 'Torna alla Hall' })[0]);

      await waitFor(() => expect(gameService.leaveGame).toHaveBeenCalledWith('game-456'));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  test('players and rules start collapsed on a narrow screen and open on demand', () => {
    renderWithProviders(<GameScreen />, { preloadedState: stateFor('carlo') });

    expect(screen.getByText('Carlo (Tu)')).not.toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: /Giocatori \(2\)/ }));

    expect(screen.getByText('Carlo (Tu)')).toBeVisible();
    expect(screen.getByText(/TRIS: 3 stesso valore/)).not.toBeVisible();
  });

  test('a finished game shows the way back instead of the draw button', () => {
    const state = stateFor('anna');
    state.game.game.status = 'finished';
    renderWithProviders(<GameScreen />, { preloadedState: state });

    expect(screen.getAllByText(/PARTITA TERMINATA/).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /Estrai Carta/ })).not.toBeInTheDocument();
  });

  describe('last drawn card', () => {
    test('is the real card of the deck, with its value and suit in words', () => {
      const state = stateFor('carlo', { ultimaCartaEstratta: { valore: 'Re', seme: 'Coppe', emoji: '🏆' } });
      renderWithProviders(<GameScreen />, { preloadedState: state });

      expect(screen.getByRole('img', { name: 'Re di Coppe' })).toHaveAttribute('src', '/carte/coppe-re.webp');
      expect(screen.getByText('Re')).toBeInTheDocument();
      expect(screen.getByText('di Coppe')).toBeInTheDocument();
    });

    test('says so when nothing has been drawn yet', () => {
      renderWithProviders(<GameScreen />, { preloadedState: stateFor('carlo') });

      expect(screen.getByText('Nessuna carta estratta')).toBeInTheDocument();
    });
  });

  describe('guided jolly', () => {
    const startJolly = () => fireEvent.click(screen.getByRole('button', { name: 'Usa il Jolly per TRIS' }));
    const firstCard = () => screen.getAllByRole('button', { name: 'Asso di Spade' })[0];
    const confirmGroup = () => screen.getAllByRole('group', { name: 'Conferma Jolly' })[0];

    beforeEach(() => {
      Element.prototype.scrollIntoView = vi.fn();
      vi.spyOn(window, 'confirm').mockReturnValue(true);
    });

    afterEach(() => {
      delete Element.prototype.scrollIntoView;
    });

    test('choosing a collection takes the player to the grid and explains what to do', () => {
      renderWithProviders(<GameScreen />, { preloadedState: stateFor('carlo') });

      startJolly();

      expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(1);
      expect(screen.getAllByText(/Jolly per TRIS: tocca una carta non coperta/).length).toBeGreaterThan(0);
    });

    test('before choosing a collection no card can be tapped', () => {
      renderWithProviders(<GameScreen />, { preloadedState: stateFor('carlo') });

      expect(firstCard()).toBeDisabled();
    });

    test('a covered card cannot be chosen', () => {
      const state = stateFor('carlo');
      state.game.currentPlayer.coperte = coperte.map((row, r) => row.map((_, c) => r === 0 && c === 0));
      renderWithProviders(<GameScreen />, { preloadedState: state });

      startJolly();

      expect(screen.getByRole('button', { name: 'Asso di Spade, coperta' })).toBeDisabled();
    });

    test('tapping a card asks for confirmation in the bar, never with the browser dialog', () => {
      renderWithProviders(<GameScreen />, { preloadedState: stateFor('carlo') });
      startJolly();

      fireEvent.click(firstCard());

      expect(screen.getAllByText(/Usare il Jolly per TRIS sulla carta Asso di Spade\?/).length).toBeGreaterThan(0);
      expect(firstCard()).toHaveAttribute('aria-pressed', 'true');
      expect(window.confirm).not.toHaveBeenCalled();
      expect(gameService.useJolly).not.toHaveBeenCalled();
    });

    test('confirming uses the jolly on that card and leaves the mode', async () => {
      gameService.useJolly.mockResolvedValue({ convertedTo: { valore: 'Re', seme: 'Spade' } });
      const { store } = renderWithProviders(<GameScreen />, { preloadedState: stateFor('carlo') });
      startJolly();
      fireEvent.click(firstCard());

      fireEvent.click(within(confirmGroup()).getByRole('button', { name: 'Usa Jolly' }));

      await waitFor(() => expect(store.getState().game.jollyMode).toBeNull());
      expect(gameService.useJolly).toHaveBeenCalledWith('game-456', { row: 0, col: 0, tipo: 'tris' });
      expect(store.getState().ui.toasts.map((t) => t.message).join(' ')).toMatch(/Jolly attivato.*Re di Spade/);
    });

    test('if the jolly cannot be used the mode stays on, so another card can be tried', async () => {
      // The API client translates the server's English: here the answer is already in Italian
      gameService.useJolly.mockRejectedValue(new Error("Il Jolly non può completare questa collezione con quella carta. Scegli un'altra carta o un'altra collezione."));
      const { store } = renderWithProviders(<GameScreen />, { preloadedState: stateFor('carlo') });
      startJolly();
      fireEvent.click(firstCard());

      fireEvent.click(within(confirmGroup()).getByRole('button', { name: 'Usa Jolly' }));

      await waitFor(() => expect(store.getState().ui.toasts.some((t) => t.type === 'error')).toBe(true));
      const error = store.getState().ui.toasts.find((t) => t.type === 'error').message;
      expect(error).toBe("Il Jolly non può completare questa collezione con quella carta. Scegli un'altra carta o un'altra collezione.");
      expect(store.getState().game.jollyMode).toBe('tris');
      expect(screen.queryAllByRole('group', { name: 'Conferma Jolly' })).toHaveLength(0);
      expect(screen.getAllByText(/tocca una carta non coperta/).length).toBeGreaterThan(0);
    });

    test('"Cambia carta" goes back to choosing without using the jolly', () => {
      const { store } = renderWithProviders(<GameScreen />, { preloadedState: stateFor('carlo') });
      startJolly();
      fireEvent.click(firstCard());

      fireEvent.click(within(confirmGroup()).getByRole('button', { name: 'Cambia carta' }));

      expect(gameService.useJolly).not.toHaveBeenCalled();
      expect(store.getState().game.jollyMode).toBe('tris');
      expect(firstCard()).toHaveAttribute('aria-pressed', 'false');
    });

    test('"Annulla" leaves the jolly mode', () => {
      const { store } = renderWithProviders(<GameScreen />, { preloadedState: stateFor('carlo') });
      startJolly();

      fireEvent.click(screen.getAllByRole('button', { name: 'Annulla' })[0]);

      expect(store.getState().game.jollyMode).toBeNull();
      expect(firstCard()).toBeDisabled();
    });

    test('activating the mode no longer repeats its instruction in a notice', () => {
      const { store } = renderWithProviders(<GameScreen />, { preloadedState: stateFor('carlo') });

      startJolly();

      expect(store.getState().ui.toasts).toHaveLength(0);
    });
  });
});
