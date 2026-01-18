/**
 * Player Slice Tests
 */

import playerReducer, {
  setPlayer,
  clearPlayer,
  clearError,
} from '../../store/slices/playerSlice';

describe('playerSlice', () => {
  // Updated to match the actual initialState in playerSlice.js
  const initialState = {
    id: null,
    name: '',
    credits: 0,
    currentGameId: null,
    isLoading: false,
    error: null,
  };

  test('should return initial state', () => {
    expect(playerReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  test('should handle setPlayer', () => {
    const player = {
      id: 'player-123',
      name: 'Test Player',
      credits: 100,
    };
    
    const state = playerReducer(initialState, setPlayer(player));
    
    expect(state.id).toBe('player-123');
    expect(state.name).toBe('Test Player');
    expect(state.credits).toBe(100);
  });

  test('should handle clearPlayer', () => {
    const currentState = {
      id: 'player-123',
      name: 'Test Player',
      credits: 100,
      currentGameId: 'game-1',
      isLoading: false,
      error: null,
    };
    
    const state = playerReducer(currentState, clearPlayer());
    
    expect(state).toEqual(initialState);
  });

  test('should handle clearError', () => {
    const currentState = {
      ...initialState,
      error: 'Some error message'
    };

    const state = playerReducer(currentState, clearError());
    
    expect(state.error).toBe(null);
  });
});