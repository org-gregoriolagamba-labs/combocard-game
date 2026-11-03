import gameReducer, {
  clearJollyInCorso,
  declareJolly,
  playJolly,
  setJollyInCorso,
} from '../../store/slices/gameSlice';
import * as gameService from '../../services/gameService';
import { createTestStore, mockGameState } from '../test-utils';

vi.mock('../../services/gameService');

const hold = (overrides = {}) => ({ playerId: 'anna', name: 'Anna', tipo: 'tris', scadenza: 1_000_000, ...overrides });
const withGame = (jollyInCorso = null) => ({
  ...mockGameState,
  game: { ...mockGameState.game, jollyInCorso },
});

describe('the pause for the jolly choice in the game state', () => {
  test('setJollyInCorso keeps who is choosing with the game', () => {
    const state = gameReducer(withGame(), setJollyInCorso(hold()));

    expect(state.game.jollyInCorso).toEqual(hold());
  });

  test('without a game there is nothing to change and nothing breaks', () => {
    const state = gameReducer({ ...mockGameState, game: null }, setJollyInCorso(hold()));

    expect(state.game).toBeNull();
  });

  test('clearJollyInCorso without a player ends any pause', () => {
    const state = gameReducer(withGame(hold()), clearJollyInCorso());

    expect(state.game.jollyInCorso).toBeNull();
  });

  test('with a player it ends only that player\'s pause: an old message cannot end another one', () => {
    const state = gameReducer(withGame(hold({ playerId: 'carlo' })), clearJollyInCorso('anna'));

    expect(state.game.jollyInCorso).toEqual(hold({ playerId: 'carlo' }));
  });

  test('declaring the jolly stores the pause the server answers with', async () => {
    gameService.startJollyChoice.mockResolvedValue({ success: true, jollyInCorso: hold() });
    const store = createTestStore({ game: withGame() });

    await store.dispatch(declareJolly({ gameId: 'game-456', tipo: 'tris' }));

    expect(gameService.startJollyChoice).toHaveBeenCalledWith('game-456', 'tris');
    expect(store.getState().game.game.jollyInCorso).toEqual(hold());
  });

  test('a refused declaration changes nothing and carries the reason', async () => {
    gameService.startJollyChoice.mockRejectedValue(new Error('Un altro giocatore sta scegliendo il Jolly'));
    const store = createTestStore({ game: withGame() });

    const result = await store.dispatch(declareJolly({ gameId: 'game-456', tipo: 'tris' }));

    expect(result.payload).toBe('Un altro giocatore sta scegliendo il Jolly');
    expect(store.getState().game.game.jollyInCorso).toBeNull();
  });

  test('using the jolly ends the pause', async () => {
    gameService.useJolly.mockResolvedValue({ convertedTo: { valore: 'Sei', seme: 'Denari' } });
    const store = createTestStore({ game: withGame(hold()) });

    await store.dispatch(playJolly({ gameId: 'game-456', row: 0, col: 0, tipo: 'tris' }));

    expect(store.getState().game.game.jollyInCorso).toBeNull();
  });
});
