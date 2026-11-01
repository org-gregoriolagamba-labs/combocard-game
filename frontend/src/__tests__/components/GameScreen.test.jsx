import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { GameScreen } from '../../components/game';
import { renderWithProviders, mockGameState } from '../test-utils';

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
    expect(screen.getByText('Tuoi Gettoni')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Hall/ })).toBeInTheDocument();
  });

  test('every collection has a claim button', () => {
    renderWithProviders(<GameScreen />, { preloadedState: stateFor('carlo') });

    for (const label of ['TRIS', 'SEQUENZA', 'SCOPA', 'NAPOLA', 'COMBOCARD REALE']) {
      expect(screen.getByRole('button', { name: new RegExp(label) })).toBeInTheDocument();
    }
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

  test('the last drawn card is shown with its value and suit', () => {
    const state = stateFor('carlo', { ultimaCartaEstratta: { valore: 'Re', seme: 'Coppe', emoji: '🏆' } });
    renderWithProviders(<GameScreen />, { preloadedState: state });

    expect(screen.getByText('Re')).toBeInTheDocument();
    expect(screen.getByText('di Coppe')).toBeInTheDocument();
  });
});
