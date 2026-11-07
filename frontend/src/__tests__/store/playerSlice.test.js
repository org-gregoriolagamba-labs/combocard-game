/**
 * Player Slice Tests
 */

import playerReducer, {
  setPlayer,
  clearPlayer,
  clearError,
  setRole,
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
    sessionChecked: false,
    regoleAccettateIl: null,
    role: 'player',
    mustChangePassword: false,
  };

  test('should return initial state', () => {
    expect(playerReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  describe('the rules confirmation', () => {
    const player = { id: 'p1', name: 'Anna', credits: 0, currentGameId: null };

    test('a player who never confirmed has no date, one who did has it', () => {
      const nuovo = playerReducer(initialState, { type: 'player/login/fulfilled', payload: { player: { ...player, regoleAccettateIl: null } } });
      const vecchio = playerReducer(initialState, { type: 'player/login/fulfilled', payload: { player: { ...player, regoleAccettateIl: '2026-11-03T10:00:00.000Z' } } });

      expect(nuovo.regoleAccettateIl).toBeNull();
      expect(vecchio.regoleAccettateIl).toBe('2026-11-03T10:00:00.000Z');
    });

    test('the date is restored with the session', () => {
      const state = playerReducer(initialState, { type: 'player/restoreSession/fulfilled', payload: { ...player, regoleAccettateIl: '2026-11-03T10:00:00.000Z' } });

      expect(state.regoleAccettateIl).toBe('2026-11-03T10:00:00.000Z');
    });

    test('confirming stores the date', () => {
      const state = playerReducer({ ...initialState, id: 'p1' }, { type: 'player/acceptRules/fulfilled', payload: { regoleAccettateIl: '2026-11-03T10:00:00.000Z' } });

      expect(state.regoleAccettateIl).toBe('2026-11-03T10:00:00.000Z');
      expect(state.isLoading).toBe(false);
    });

    test('a failed confirmation keeps the player unconfirmed and says why', () => {
      const state = playerReducer({ ...initialState, id: 'p1' }, { type: 'player/acceptRules/rejected', payload: 'Impossibile contattare il server' });

      expect(state.regoleAccettateIl).toBeNull();
      expect(state.error).toBe('Impossibile contattare il server');
    });
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
    
    expect(state).toEqual({ ...initialState, sessionChecked: true });
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

describe('playerSlice: the role', () => {
  const player = { id: 'p1', name: 'Anna', credits: 10, currentGameId: null };
  const fresh = playerReducer(undefined, { type: 'unknown' });

  test('a player is a player until the server says otherwise', () => {
    expect(fresh.role).toBe('player');
  });

  test.each([
    ['player/login/fulfilled'],
    ['player/register/fulfilled'],
  ])('%s takes the role from beside the player', (type) => {
    const state = playerReducer(fresh, { type, payload: { accessToken: 't', player, role: 'admin' } });

    expect(state.role).toBe('admin');
    expect(state.name).toBe('Anna');
  });

  test('a login without a role is a player', () => {
    const state = playerReducer({ ...fresh, role: 'admin' }, { type: 'player/login/fulfilled', payload: { accessToken: 't', player } });

    expect(state.role).toBe('player');
  });

  test('restoring the session takes the role of the player', () => {
    const state = playerReducer(fresh, { type: 'player/restoreSession/fulfilled', payload: { ...player, role: 'admin' } });

    expect(state.role).toBe('admin');
  });

  test('setRole changes it (a 403 of the admin area makes a player of whoever was not an admin any more)', () => {
    expect(playerReducer({ ...fresh, role: 'admin' }, setRole('player')).role).toBe('player');
  });

  test('clearing the player forgets the role too', () => {
    expect(playerReducer({ ...fresh, role: 'admin' }, clearPlayer()).role).toBe('player');
  });
});
