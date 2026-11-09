import React from 'react';
import { act } from '@testing-library/react';
import { useSocket } from '../../hooks/useSocket';
import socketService from '../../services/socketService';
import { suona, setPartitaConSuoni } from '../../services/soundService';
import { renderWithProviders, mockGameState } from '../test-utils';

vi.mock('../../services/gameService');
vi.mock('../../services/soundService');

function Probe() {
  useSocket();
  return null;
}

const hold = (overrides = {}) => ({ playerId: 'anna', name: 'Anna', tipo: 'tris', scadenza: Date.now() + 20_000, ...overrides });

// The events of the room reach the handlers the hook registered on the socket
const arrange = (playerId = 'carlo', jollyInCorso = null) => {
  const { store, unmount } = renderWithProviders(<Probe />, {
    preloadedState: {
      player: { id: playerId, name: 'Carlo' },
      game: { ...mockGameState, game: { ...mockGameState.game, jollyInCorso } },
    },
  });
  const socket = socketService.getSocket();
  const emit = (event, payload) => {
    const call = socket.on.mock.calls.filter(([name]) => name === event).at(-1);
    act(() => call[1](payload));
  };

  return { store, emit, socket, unmount };
};

describe('the events of the jolly pause', () => {
  test('jollyInCorso: the pause is in the game state, for everybody in the room', () => {
    const { store, emit } = arrange();

    emit('jollyInCorso', hold());

    expect(store.getState().game.game.jollyInCorso).toMatchObject({ playerId: 'anna', name: 'Anna', tipo: 'tris' });
  });

  test('a message with no end time is ignored', () => {
    const { store, emit } = arrange();

    emit('jollyInCorso', { playerId: 'anna', name: 'Anna' });

    expect(store.getState().game.game.jollyInCorso).toBeNull();
  });

  test('jollyAnnullato: the pause ends, and the others are told the draws can go on', () => {
    const { store, emit } = arrange('carlo', hold());

    emit('jollyAnnullato', { playerId: 'anna' });

    expect(store.getState().game.game.jollyInCorso).toBeNull();
    expect(store.getState().ui.toasts.map((t) => t.message)).toContain('Il Jolly è stato lasciato: si può estrarre di nuovo');
  });

  test('jollyAnnullato for the own pause ends it without a notice', () => {
    const { store, emit } = arrange('anna', hold());

    emit('jollyAnnullato', { playerId: 'anna' });

    expect(store.getState().game.game.jollyInCorso).toBeNull();
    expect(store.getState().ui.toasts).toHaveLength(0);
  });

  test('an old jollyAnnullato does not end the pause of someone else', () => {
    const { store, emit } = arrange('carlo', hold({ playerId: 'bruno', name: 'Bruno' }));

    emit('jollyAnnullato', { playerId: 'anna' });

    expect(store.getState().game.game.jollyInCorso).toMatchObject({ playerId: 'bruno' });
  });

  test('jollyUsato ends the pause of the player who used it', () => {
    const { store, emit } = arrange('carlo', hold());

    emit('jollyUsato', { playerId: 'anna', tipo: 'tris' });

    expect(store.getState().game.game.jollyInCorso).toBeNull();
  });

  test('the handlers are removed when the screen goes away', () => {
    const { socket, unmount } = arrange();

    unmount();

    for (const nome of ['jollyInCorso', 'jollyAnnullato', 'jollyUsato']) {
      const registrato = socket.on.mock.calls.find(([evento]) => evento === nome)[1];
      expect(socket.off).toHaveBeenCalledWith(nome, registrato);
    }
  });
});

describe('the temporary password', () => {
  test('the socket does not connect while the password must change: the server would refuse it and the retries would renew the session', () => {
    const connect = vi.spyOn(socketService, 'connect');
    const disconnect = vi.spyOn(socketService, 'disconnect');

    renderWithProviders(<Probe />, {
      preloadedState: { player: { id: 'carlo', name: 'Carlo', mustChangePassword: true }, game: mockGameState },
    });

    expect(connect).not.toHaveBeenCalled();
    expect(disconnect).toHaveBeenCalled();
    connect.mockRestore();
    disconnect.mockRestore();
  });
});

describe('sessionEnded', () => {
  test.each([
    ['suspended', 'Il tuo account è stato sospeso'],
    ['revoked', "L'amministrazione ha chiuso la tua sessione: accedi di nuovo"],
    ['deleted', 'Il tuo account è stato eliminato'],
  ])('%s: the player is out, back at the start, and is told why', (reason, message) => {
    const { store, emit } = arrange('carlo');

    emit('sessionEnded', { reason });

    const state = store.getState();
    expect(state.player.id).toBeNull();
    expect(state.game.currentGameId).toBeNull();
    expect(state.ui.currentScreen).toBe('home');
    expect(state.ui.toasts.map((t) => t.message)).toContain(message);
  });
});

describe('gameCancelled', () => {
  test('the player of the game goes back to the hall, with the balance the server says, and is told', () => {
    const { store, emit } = arrange('carlo');
    const gameId = store.getState().game.currentGameId;

    emit('gameCancelled', { gameId, gettoni: 450, refund: 100 });

    const state = store.getState();
    expect(state.game.currentGameId).toBeNull();
    expect(state.game.game).toBeNull();
    expect(state.ui.currentScreen).toBe('hall');
    expect(state.player.credits).toBe(450);
    expect(state.ui.toasts.map((t) => t.message)).toContain(
      "La partita è stata annullata dall'amministrazione: ti sono stati restituiti 100 crediti",
    );
  });

  test('with no refund the notice does not mention credits', () => {
    const { store, emit } = arrange('carlo');

    emit('gameCancelled', { gameId: store.getState().game.currentGameId, gettoni: 450, refund: 0 });

    expect(store.getState().ui.toasts.map((t) => t.message)).toContain("La partita è stata annullata dall'amministrazione");
  });

  test('a cancellation of another game leaves the game on screen', () => {
    const { store, emit } = arrange('carlo');

    emit('gameCancelled', { gameId: 'another-game', gettoni: 450, refund: 100 });

    expect(store.getState().game.currentGameId).not.toBeNull();
  });
});

describe('the sounds of the events', () => {
  const carta = (valore, seme) => ({ valore, seme, valoreNum: 1 });
  // A game where carlo has the Asso di Coppe in his sheet
  const arrangeWithSheet = (soundsEnabled) => {
    const { store, unmount } = renderWithProviders(<Probe />, {
      preloadedState: {
        player: { id: 'carlo', name: 'Carlo' },
        game: {
          ...mockGameState,
          game: {
            ...mockGameState.game,
            soundsEnabled,
            players: [{ id: 'carlo', name: 'Carlo', gettoni: 0, cartella: [[carta('Asso', 'Coppe')]], coperte: [[false]], collezioni: [] }],
          },
        },
      },
    });
    const socket = socketService.getSocket();
    const emit = (event, payload) => {
      const call = socket.on.mock.calls.filter(([name]) => name === event).at(-1);
      act(() => call[1](payload));
    };
    return { store, emit, unmount };
  };

  beforeEach(() => vi.mocked(suona).mockClear());

  test('a card drawn sounds with the tone of its suit', () => {
    const { emit } = arrangeWithSheet(true);

    emit('cardDrawn', { carta: carta('Re', 'Spade') });

    expect(suona).toHaveBeenCalledWith('estratta', { seme: 'Spade' });
    expect(suona).not.toHaveBeenCalledWith('miaCarta', expect.anything());
  });

  test('a card drawn that is in the own sheet also gets its own chime, a moment later', () => {
    const { emit } = arrangeWithSheet(true);

    emit('cardDrawn', { carta: carta('Asso', 'Coppe') });

    expect(suona).toHaveBeenCalledWith('estratta', { seme: 'Coppe' });
    expect(suona).toHaveBeenCalledWith('miaCarta', expect.objectContaining({ ritardo: expect.any(Number) }));
  });

  test('a collection won by the player sounds as a fanfare, one won by another softly', () => {
    const { emit } = arrangeWithSheet(true);

    emit('collezioneVinta', { tipo: 'tris', vincitore: { id: 'carlo', name: 'Carlo' }, vincitori: [{ id: 'carlo', name: 'Carlo' }], ammontare: 20, divided: false });
    emit('collezioneVinta', { tipo: 'scopa', vincitore: { id: 'anna', name: 'Anna' }, vincitori: [{ id: 'anna', name: 'Anna' }], ammontare: 25, divided: false });

    expect(suona).toHaveBeenNthCalledWith(1, 'collezioneMia');
    expect(suona).toHaveBeenNthCalledWith(2, 'collezioneAltrui');
  });

  test('the combocard reale is left to the sound of the end of the game', () => {
    const { emit } = arrangeWithSheet(true);

    emit('collezioneVinta', { tipo: 'combocard_reale', vincitore: { id: 'carlo', name: 'Carlo' }, vincitori: [{ id: 'carlo', name: 'Carlo' }], ammontare: 100, divided: false });
    emit('gameFinished', { vincitori: [{ id: 'carlo', name: 'Carlo' }] });

    expect(suona).toHaveBeenCalledTimes(1);
    expect(suona).toHaveBeenCalledWith('fine');
  });

  test('the jolly declared and used have their sounds', () => {
    const { emit } = arrangeWithSheet(true);

    emit('jollyInCorso', { playerId: 'anna', name: 'Anna', tipo: 'tris', scadenza: Date.now() + 20_000 });
    emit('jollyUsato', { playerId: 'anna', tipo: 'tris' });

    expect(suona).toHaveBeenNthCalledWith(1, 'jollyDichiarato');
    expect(suona).toHaveBeenNthCalledWith(2, 'jollyUsato');
  });

  test('the game says whether it has sounds, and the service is told', () => {
    arrangeWithSheet(false);

    expect(setPartitaConSuoni).toHaveBeenLastCalledWith(false);
  });
});

describe('the events of the draws by turns', () => {
  const arrangeTurns = (playerId = 'carlo') => {
    const { store } = renderWithProviders(<Probe />, {
      preloadedState: {
        player: { id: playerId, name: 'Carlo' },
        game: { ...mockGameState, game: { ...mockGameState.game, estrazione: 'tutti', turno: null } },
      },
    });
    const socket = socketService.getSocket();
    const emit = (event, payload) => {
      const call = socket.on.mock.calls.filter(([name]) => name === event).at(-1);
      act(() => call[1](payload));
    };
    return { store, emit };
  };

  beforeEach(() => vi.mocked(suona).mockClear());

  test('turnoEstrazione puts the turn in the game, with the times left', () => {
    const { store, emit } = arrangeTurns();

    emit('turnoEstrazione', { playerId: 'anna', name: 'Anna', attesaIn: 8_000, scadenzaIn: 60_000, sospeso: false });

    expect(store.getState().game.game.turno).toMatchObject({ playerId: 'anna', attesaIn: 8_000, scadenzaIn: 60_000 });
  });

  test('a yellow card is told to everybody, and sounds', () => {
    const { store, emit } = arrangeTurns();

    emit('ammonizione', { playerId: 'anna', name: 'Anna', colore: 'gialla', ammonizioni: 1 });

    expect(store.getState().ui.toasts.map((t) => t.message)).toContain('Anna non ha estratto in tempo: cartellino giallo');
    expect(suona).toHaveBeenCalledWith('ammonizione');
  });

  test('a red card says that the player no longer draws', () => {
    const { store, emit } = arrangeTurns();

    emit('ammonizione', { playerId: 'anna', name: 'Anna', colore: 'rossa', ammonizioni: 2 });

    expect(store.getState().ui.toasts.map((t) => t.message)).toContain('Anna non ha estratto in tempo: cartellino rosso, non estrae più');
  });

  test('the own card is told in the second person', () => {
    const { store, emit } = arrangeTurns('carlo');

    emit('ammonizione', { playerId: 'carlo', name: 'Carlo', colore: 'gialla', ammonizioni: 1 });
    emit('ammonizione', { playerId: 'carlo', name: 'Carlo', colore: 'rossa', ammonizioni: 2 });

    const messaggi = store.getState().ui.toasts.map((t) => t.message);
    expect(messaggi).toContain('Non hai estratto in tempo: cartellino giallo. Al prossimo ritardo sarà rosso');
    expect(messaggi).toContain('Non hai estratto in tempo: cartellino rosso. Non estrai più in questa partita');
  });
});
