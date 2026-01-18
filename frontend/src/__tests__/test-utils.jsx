/**
 * Test Utilities
 * 
 * Custom render function and test utilities for React Testing Library.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import playerReducer from '../store/slices/playerSlice';
import gameReducer from '../store/slices/gameSlice';
import uiReducer from '../store/slices/uiSlice';

/**
 * Create a test store with optional preloaded state
 */
export function createTestStore(preloadedState = {}) {
  return configureStore({
    reducer: {
      player: playerReducer,
      game: gameReducer,
      ui: uiReducer,
    },
    preloadedState,
  });
}

/**
 * Custom render function that wraps components with Redux Provider
 */
export function renderWithProviders(
  ui,
  {
    preloadedState = {},
    store = createTestStore(preloadedState),
    ...renderOptions
  } = {}
) {
  function Wrapper({ children }) {
    return <Provider store={store}>{children}</Provider>;
  }
  
  return {
    store,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}

/**
 * Default player state for testing
 */
export const mockPlayerState = {
  id: 'player-123',
  name: 'Test Player',
  credits: 100,
  isRegistered: true,
  loading: false,
  error: null,
};

/**
 * Default game state for testing
 */
export const mockGameState = {
  currentGameId: 'game-456',
  game: {
    id: 'game-456',
    status: 'playing',
    players: [
      {
        id: 'player-123',
        name: 'Test Player',
        gettoni: 50,
        cartella: [],
        coperte: [],
        collezioni: [],
        jollyUsato: false,
      },
    ],
    mazzo: [],
    montepremi: 100,
    collezioni: {
      tris: { vinto: false },
      sequenza: { vinto: false },
      scopa: { vinto: false },
      napola: { vinto: false },
      combocard_reale: { vinto: false },
    },
    collezioniDistribuzione: {
      tris: 20,
      sequenza: 20,
      scopa: 25,
      napola: 25,
      combocard_reale: 100,
    },
  },
  currentPlayer: null,
  ultimaCartaEstratta: null,
  jollyMode: null,
  drawCooldown: 0,
  lobby: [],
  loading: false,
  error: null,
};

/**
 * Default UI state for testing
 */
export const mockUiState = {
  currentScreen: 'home',
  toasts: [],
  modals: {
    isOpen: false,
    type: null,
    data: null,
  },
};

// Re-export everything from testing library
export * from '@testing-library/react';
