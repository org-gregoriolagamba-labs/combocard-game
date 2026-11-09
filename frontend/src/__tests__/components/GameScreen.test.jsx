import React from 'react';
import { screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { GameScreen } from '../../components/game';
import { renderWithProviders, mockGameState } from '../test-utils';
import * as gameService from '../../services/gameService';

vi.mock('../../services/gameService');

// A real sheet: 25 different cards (all Spade, all Coppe, Asso to Cinque of Denari).
// Sei di Spade and Sei di Coppe are covered, so a tris is one card away and the jolly can make
// Sei di Denari out of any Denari that is still uncovered.
const VALORI = ['Asso', 'Due', 'Tre', 'Quattro', 'Cinque', 'Sei', 'Sette', 'Fante', 'Cavallo', 'Re'];
const mazzo = ['Spade', 'Coppe', 'Denari', 'Bastoni'].flatMap((seme) =>
  VALORI.map((valore, i) => ({ valore, seme, emoji: '', valoreNum: i + 1 })),
);
const venticinque = mazzo.slice(0, 25);
const cartella = Array.from({ length: 5 }, (_, r) => venticinque.slice(r * 5, r * 5 + 5));
const coperte = Array.from({ length: 5 }, (_, r) =>
  Array.from({ length: 5 }, (_, c) => {
    const x = cartella[r][c];
    return x.valore === 'Sei' && (x.seme === 'Spade' || x.seme === 'Coppe');
  }),
);

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
  describe('the sound button', () => {
    beforeEach(() => window.localStorage.clear());
    afterAll(() => window.localStorage.clear());

    const withSounds = (soundsEnabled) => {
      const base = stateFor('carlo');
      return { ...base, game: { ...base.game, game: { ...base.game.game, soundsEnabled } } };
    };

    test('a game with sounds has a button to turn them off for oneself, and back on', () => {
      renderWithProviders(<GameScreen />, { preloadedState: withSounds(true) });

      fireEvent.click(screen.getByRole('button', { name: 'Disattiva i suoni' }));
      expect(window.localStorage.getItem('combocard.audio-muto')).toBe('1');

      fireEvent.click(screen.getByRole('button', { name: 'Attiva i suoni' }));
      expect(window.localStorage.getItem('combocard.audio-muto')).toBeNull();
    });

    test('a game made before the choice existed has sounds too', () => {
      const base = stateFor('carlo');
      renderWithProviders(<GameScreen />, { preloadedState: base });

      expect(screen.getByRole('button', { name: 'Disattiva i suoni' })).toBeInTheDocument();
    });

    test('a game without sounds has no button', () => {
      renderWithProviders(<GameScreen />, { preloadedState: withSounds(false) });

      expect(screen.queryByRole('button', { name: /i suoni/ })).not.toBeInTheDocument();
    });

    test('the button remembers a muted player', () => {
      window.localStorage.setItem('combocard.audio-muto', '1');
      renderWithProviders(<GameScreen />, { preloadedState: withSounds(true) });

      expect(screen.getByRole('button', { name: 'Attiva i suoni' })).toBeInTheDocument();
    });
  });

  describe('the guide for a first game', () => {
    beforeEach(() => window.localStorage.clear());
    afterAll(() => window.localStorage.clear());

    test('tells in three lines what happens by itself, until the player has read it', () => {
      renderWithProviders(<GameScreen />, { preloadedState: stateFor('carlo') });

      const guida = screen.getByRole('region', { name: 'Come si gioca' });
      expect(guida).toHaveTextContent('si copre da sola');
      expect(guida).toHaveTextContent('la collezione si vince da sola');
      expect(guida).toHaveTextContent('manca una sola carta');
    });

    test('"Ho capito" closes it, and the device remembers', () => {
      const { unmount } = renderWithProviders(<GameScreen />, { preloadedState: stateFor('carlo') });

      fireEvent.click(screen.getByRole('button', { name: 'Ho capito' }));
      expect(screen.queryByRole('region', { name: 'Come si gioca' })).not.toBeInTheDocument();
      unmount();

      renderWithProviders(<GameScreen />, { preloadedState: stateFor('carlo') });
      expect(screen.queryByRole('region', { name: 'Come si gioca' })).not.toBeInTheDocument();
    });

    test('is not shown to a player who has already won a collection', () => {
      const state = stateFor('carlo');
      state.game.currentPlayer.collezioni = ['tris'];
      renderWithProviders(<GameScreen />, { preloadedState: state });

      expect(screen.queryByRole('region', { name: 'Come si gioca' })).not.toBeInTheDocument();
    });
  });

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

    expect(screen.getAllByText('36 carte rimaste')).toHaveLength(1);
  });

  test('the header keeps the pot, the own tokens and the way out', () => {
    renderWithProviders(<GameScreen />, { preloadedState: stateFor('carlo') });

    expect(screen.getByText('Montepremi')).toBeInTheDocument();
    expect(screen.getByText('I tuoi crediti')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lascia la partita' })).toBeInTheDocument();
  });

  test('every collection shows its progress and prize', () => {
    renderWithProviders(<GameScreen />, { preloadedState: stateFor('carlo') });

    for (const tipo of ['tris', 'sequenza', 'scopa', 'napola', 'combocard_reale']) {
      expect(screen.getByTestId(`collezione-${tipo}`)).toHaveTextContent(/Premio \d+/);
    }
  });

  test('the jolly is offered only where one card is missing, and says so where it is not', () => {
    renderWithProviders(<GameScreen />, { preloadedState: stateFor('carlo') });

    expect(screen.getByRole('button', { name: 'Usa il Jolly per TRIS' })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Jolly per SCOPA: non ancora possibile/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Jolly per COMBOCARD REALE: non ancora possibile/ })).toBeDisabled();
  });

  test('the collections cannot be claimed by hand: the server wins them by itself', () => {
    renderWithProviders(<GameScreen />, { preloadedState: stateFor('carlo') });

    expect(screen.queryByRole('button', { name: /^🎯 TRIS$/ })).not.toBeInTheDocument();
    expect(gameService.claimCollection).toBeUndefined();
  });

  describe('leaving the game', () => {
    const leave = () => fireEvent.click(screen.getByRole('button', { name: 'Lascia la partita' }));

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
    expect(screen.getByText(/Hai un Jolly a partita/)).not.toBeVisible();
  });

  test('a finished game shows the way back instead of the draw button', () => {
    const state = stateFor('anna');
    state.game.game.status = 'finished';
    renderWithProviders(<GameScreen />, { preloadedState: state });

    expect(screen.getAllByText(/Partita terminata/).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /Estrai Carta/ })).not.toBeInTheDocument();
  });

  describe('last drawn card', () => {
    test('is the real card of the deck, with its value and suit in words', () => {
      const state = stateFor('carlo', { ultimaCartaEstratta: { valore: 'Re', seme: 'Coppe', emoji: '🏆' } });
      renderWithProviders(<GameScreen />, { preloadedState: state });

      expect(screen.getByRole('img', { name: 'Re di Coppe' })).toHaveAttribute('src', '/carte/coppe-re.webp');
      const header = screen.getByRole('banner');
      expect(within(header).getByText('Re')).toBeInTheDocument();
      expect(within(header).getByText('di Coppe')).toBeInTheDocument();
    });

    test('says so when nothing has been drawn yet', () => {
      renderWithProviders(<GameScreen />, { preloadedState: stateFor('carlo') });

      expect(screen.getByText('Nessuna carta estratta')).toBeInTheDocument();
    });
  });

  describe('history of the drawn cards', () => {
    test('is a closed section that lists, once opened, what has come out, the latest first', () => {
      const state = stateFor('carlo');
      state.game.game = {
        ...state.game.game,
        carteEstratte: [
          { valore: 'Asso', seme: 'Denari' },
          { valore: 'Re', seme: 'Coppe' },
        ],
      };
      renderWithProviders(<GameScreen />, { preloadedState: state });

      const toggle = screen.getByRole('button', { name: /Carte uscite/ });
      expect(toggle).toHaveTextContent('2 su 40');

      fireEvent.click(toggle);

      const pannello = document.getElementById(toggle.getAttribute('aria-controls'));
      const nomi = within(pannello).getAllByRole('listitem').map((li) => li.textContent);
      expect(nomi).toEqual(['Re di Coppe', 'Asso di Denari']);
    });
  });

  describe('the draws are paused while a player chooses the jolly', () => {
    const hold = (playerId, name, secondi = 20) => ({
      playerId,
      name,
      tipo: 'tris',
      scadenza: Date.now() + secondi * 1000,
    });
    const withHold = (me, jollyInCorso, overrides) => {
      const state = stateFor(me, overrides);
      state.game.game = { ...state.game.game, jollyInCorso };
      return state;
    };
    const startJolly = () => fireEvent.click(screen.getByRole('button', { name: 'Usa il Jolly per TRIS' }));

    beforeEach(() => {
      Element.prototype.scrollIntoView = vi.fn();
    });

    afterEach(() => {
      delete Element.prototype.scrollIntoView;
      vi.useRealTimers();
    });

    test('declaring the jolly tells the server for which collection, and the pause is shown', async () => {
      gameService.startJollyChoice.mockResolvedValue({ success: true, jollyInCorso: hold('carlo', 'Carlo') });
      const { store } = renderWithProviders(<GameScreen />, { preloadedState: stateFor('carlo') });

      startJolly();

      await waitFor(() => expect(gameService.startJollyChoice).toHaveBeenCalledWith('game-456', 'tris'));
      await waitFor(() => expect(store.getState().game.game.jollyInCorso).toMatchObject({ playerId: 'carlo' }));
      expect(screen.getAllByText(/Le estrazioni sono ferme: hai ancora/).length).toBeGreaterThan(0);
    });

    test('the mode opens at once, without waiting for the server', () => {
      gameService.startJollyChoice.mockReturnValue(new Promise(() => {}));
      const { store } = renderWithProviders(<GameScreen />, { preloadedState: stateFor('carlo') });

      startJolly();

      expect(store.getState().game.jollyMode).toBe('tris');
    });

    test('if the server refuses, the mode closes and the reason is shown', async () => {
      gameService.startJollyChoice.mockRejectedValue(new Error('Un altro giocatore sta scegliendo il Jolly: aspetta qualche secondo'));
      const { store } = renderWithProviders(<GameScreen />, { preloadedState: stateFor('carlo') });

      startJolly();

      await waitFor(() => expect(store.getState().game.jollyMode).toBeNull());
      expect(store.getState().ui.toasts.map((t) => t.message)).toContain(
        'Un altro giocatore sta scegliendo il Jolly: aspetta qualche secondo',
      );
    });

    test('while another player chooses, the creator cannot draw and the jolly waits', () => {
      renderWithProviders(<GameScreen />, { preloadedState: withHold('anna', hold('carlo', 'Carlo')) });

      expect(screen.queryByRole('button', { name: /Estrai Carta/ })).not.toBeInTheDocument();
      for (const bottone of screen.getAllByRole('button', { name: /Estrazione in pausa/ })) {
        expect(bottone).toBeDisabled();
      }
      expect(screen.getAllByText(/Carlo sta scegliendo il Jolly/).length).toBeGreaterThan(0);
      expect(
        screen.getByRole('button', { name: 'Jolly per TRIS: aspetta, Carlo sta scegliendo il Jolly' }),
      ).toBeDisabled();
    });

    test('the other players are told who is choosing', () => {
      renderWithProviders(<GameScreen />, { preloadedState: withHold('carlo', hold('anna', 'Anna')) });

      expect(screen.getAllByText(/Anna sta scegliendo il Jolly/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Estrae Anna/).length).toBeGreaterThan(0);
    });

    test('when the time runs out the draws go on, with no action from anybody', () => {
      vi.useFakeTimers();
      const { store } = renderWithProviders(<GameScreen />, {
        preloadedState: withHold('anna', hold('carlo', 'Carlo', 3)),
      });
      expect(screen.queryByRole('button', { name: /Estrai Carta/ })).not.toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(3100);
      });

      expect(store.getState().game.game.jollyInCorso).toBeNull();
      expect(screen.getAllByRole('button', { name: /Estrai Carta/ }).length).toBeGreaterThan(0);
    });

    test('when the own time runs out the mode closes and the player is told', () => {
      vi.useFakeTimers();
      const { store } = renderWithProviders(<GameScreen />, {
        preloadedState: withHold('carlo', hold('carlo', 'Carlo', 2), { jollyMode: 'tris' }),
      });

      act(() => {
        vi.advanceTimersByTime(2100);
      });

      expect(store.getState().game.jollyMode).toBeNull();
      expect(store.getState().game.game.jollyInCorso).toBeNull();
      expect(store.getState().ui.toasts.map((t) => t.message).join(' ')).toMatch(/Tempo scaduto/);
    });

    test('after a reload the own pause is still running and the mode comes back with it', () => {
      const { store } = renderWithProviders(<GameScreen />, {
        preloadedState: withHold('carlo', hold('carlo', 'Carlo')),
      });

      expect(store.getState().game.jollyMode).toBe('tris');
      expect(screen.getAllByText(/Jolly per TRIS: tocca una carta evidenziata/).length).toBeGreaterThan(0);
    });

    test('"Annulla" tells the server at once, so the draws can go on', () => {
      gameService.cancelJollyChoice.mockResolvedValue({ success: true });
      const { store } = renderWithProviders(<GameScreen />, {
        preloadedState: withHold('carlo', hold('carlo', 'Carlo'), { jollyMode: 'tris' }),
      });

      fireEvent.click(screen.getAllByRole('button', { name: 'Annulla' })[0]);

      expect(gameService.cancelJollyChoice).toHaveBeenCalledWith('game-456');
      expect(store.getState().game.jollyMode).toBeNull();
      expect(store.getState().game.game.jollyInCorso).toBeNull();
      // The mode does not come back from the pause that was just given up
      expect(screen.queryByRole('group', { name: 'Modalità Jolly' })).not.toBeInTheDocument();
    });

    test('using the jolly does not cancel: the server ends the pause by itself', async () => {
      gameService.useJolly.mockResolvedValue({ convertedTo: { valore: 'Sei', seme: 'Denari' } });
      const { store } = renderWithProviders(<GameScreen />, {
        preloadedState: withHold('carlo', hold('carlo', 'Carlo'), { jollyMode: 'tris' }),
      });

      fireEvent.click(screen.getByRole('button', { name: 'Asso di Denari' }));
      fireEvent.click(screen.getAllByRole('button', { name: 'Usa Jolly' })[0]);

      await waitFor(() => expect(store.getState().game.game.jollyInCorso).toBeNull());
      expect(gameService.cancelJollyChoice).not.toHaveBeenCalled();
      expect(store.getState().game.jollyMode).toBeNull();
    });

    test('a finished game shows no pause', () => {
      const stato = withHold('anna', hold('carlo', 'Carlo'));
      stato.game.game.status = 'finished';
      renderWithProviders(<GameScreen />, { preloadedState: stato });

      expect(screen.queryByText(/sta scegliendo il Jolly/)).not.toBeInTheDocument();
    });
  });

  describe('guided jolly', () => {
    const startJolly = () => fireEvent.click(screen.getByRole('button', { name: 'Usa il Jolly per TRIS' }));
    const firstCard = () => screen.getByRole('button', { name: 'Asso di Denari' });
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
      expect(screen.getAllByText(/Jolly per TRIS: tocca una carta evidenziata/).length).toBeGreaterThan(0);
    });

    test('before choosing a collection a card cannot be chosen for the jolly: a tap opens it big', () => {
      renderWithProviders(<GameScreen />, { preloadedState: stateFor('carlo') });

      expect(firstCard()).not.toHaveAttribute('aria-pressed');
      fireEvent.click(firstCard());
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    test('a covered card cannot be chosen', () => {
      renderWithProviders(<GameScreen />, { preloadedState: stateFor('carlo') });

      startJolly();

      expect(screen.getByRole('button', { name: 'Sei di Spade, coperta' })).toBeDisabled();
    });

    test('a card that cannot complete the collection is not active', () => {
      renderWithProviders(<GameScreen />, { preloadedState: stateFor('carlo') });

      startJolly();

      // Sei di Spade is already in the sheet, so an Asso di Spade cannot become one
      expect(screen.getByRole('button', { name: 'Asso di Spade' })).toBeDisabled();
      expect(firstCard()).toBeEnabled();
    });

    test('tapping a card asks for confirmation in the bar, never with the browser dialog', () => {
      renderWithProviders(<GameScreen />, { preloadedState: stateFor('carlo') });
      startJolly();

      fireEvent.click(firstCard());

      expect(
        screen.getAllByText('Per TRIS, il Jolly cambia Asso di Denari in Sei di Denari. Usarlo?').length,
      ).toBeGreaterThan(0);
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
      expect(gameService.useJolly).toHaveBeenCalledWith('game-456', { row: 4, col: 0, tipo: 'tris' });
      expect(store.getState().ui.toasts.map((t) => t.message).join(' ')).toMatch(/Jolly usato.*Re di Spade/);
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
      expect(screen.getAllByText(/tocca una carta evidenziata/).length).toBeGreaterThan(0);
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
      expect(firstCard()).not.toHaveAttribute('aria-pressed');
    });

    test('activating the mode no longer repeats its instruction in a notice', () => {
      const { store } = renderWithProviders(<GameScreen />, { preloadedState: stateFor('carlo') });

      startJolly();

      expect(store.getState().ui.toasts).toHaveLength(0);
    });
  });
});
