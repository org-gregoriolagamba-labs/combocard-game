import React from 'react';
import { act } from '@testing-library/react';
import { useSocket } from '../../hooks/useSocket';
import socketService from '../../services/socketService';
import { renderWithProviders, mockGameState } from '../test-utils';

vi.mock('../../services/gameService');

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
