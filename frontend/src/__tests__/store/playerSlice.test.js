/**
 * Player Slice Tests
 */

import playerReducer, {
  setPlayer,
  clearPlayer,
  setLoading,
  setError,
} from '../../store/slices/playerSlice';

describe('playerSlice', () => {
  const initialState = {
    id: null,
    name: '',
    credits: 0,
    isRegistered: false,
    loading: false,
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
    expect(state.isRegistered).toBe(true);
  });

  test('should handle clearPlayer', () => {
    const currentState = {
      id: 'player-123',
      name: 'Test Player',
      credits: 100,
      isRegistered: true,
      loading: false,
      error: null,
    };
    
    const state = playerReducer(currentState, clearPlayer());
    
    expect(state).toEqual(initialState);
  });

  test('should handle setLoading', () => {
    const state = playerReducer(initialState, setLoading(true));
    
    expect(state.loading).toBe(true);
  });

  test('should handle setError', () => {
    const state = playerReducer(initialState, setError('Network error'));
    
    expect(state.error).toBe('Network error');
    expect(state.loading).toBe(false);
  });
});
