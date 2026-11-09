import React from 'react';
import { screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { GameScreen } from '../../components/game';
import { renderWithProviders, mockGameState } from '../test-utils';
import * as gameService from '../../services/gameService';
import { suona } from '../../services/soundService';

vi.mock('../../services/gameService');
vi.mock('../../services/soundService');

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


describe('GameScreen: the beeps of the last seconds of a turn', () => {
  beforeEach(() => {
    window.localStorage.setItem('combocard.guida-letta', '1');
    vi.useFakeTimers({ now: new Date('2026-01-01T10:00:00Z') });
    vi.mocked(suona).mockClear();
  });
  afterEach(() => {
    vi.useRealTimers();
    window.localStorage.clear();
  });

  const withTurn = (turno, estrazione = 'tutti') => {
    const base = stateFor('carlo');
    return {
      ...base,
      game: {
        ...base.game,
        game: {
          ...base.game.game,
          estrazione,
          turno: turno && { playerId: 'anna', attesaIn: 0, scadenzaIn: 3_500, sospeso: false, ricevutoA: Date.now(), ...turno },
        },
      },
    };
  };
  const chiamate = (nome) => vi.mocked(suona).mock.calls.filter(([n]) => n === nome).length;

  test('everybody hears a beep for each of the last seconds and the siren at zero', () => {
    renderWithProviders(<GameScreen />, { preloadedState: withTurn({}) });

    act(() => {
      vi.advanceTimersByTime(4_000);
    });

    expect(chiamate('bip')).toBe(4);
    expect(chiamate('sirena')).toBe(1);
  });

  test('nothing sounds while the turn is stopped for the jolly', () => {
    renderWithProviders(<GameScreen />, { preloadedState: withTurn({ sospeso: true }) });

    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    expect(chiamate('bip') + chiamate('sirena')).toBe(0);
  });

  test('in the classic mode there is no turn and no beep', () => {
    renderWithProviders(<GameScreen />, { preloadedState: withTurn(null, 'creatore') });

    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    expect(chiamate('bip') + chiamate('sirena')).toBe(0);
  });
});
