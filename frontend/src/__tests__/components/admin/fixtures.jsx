/**
 * Data shared by the tests of the admin screen
 */

export const anna = { playerId: 'p1', username: 'Anna', role: 'player', credits: 100, createdAt: '2026-01-01T10:00:00.000Z', inGame: false };
export const carlo = { playerId: 'p2', username: 'Carlo Rossi', role: 'player', credits: 50, createdAt: '2026-01-02T10:00:00.000Z', inGame: true };
export const dario = { playerId: 'p3', username: 'Dario', role: 'admin', credits: 0, createdAt: '2026-01-03T10:00:00.000Z', inGame: false };

export const partita1 = {
  id: 'g1', status: 'playing', isPrivate: false, requiredCredits: 100, maxPlayers: 4, montepremi: 200,
  createdAt: '2026-11-04T10:00:00.000Z', players: [{ id: 'p1', name: 'Anna' }, { id: 'p2', name: 'Carlo Rossi' }],
};
export const partita2 = {
  id: 'g2', status: 'waiting', isPrivate: true, requiredCredits: 50, maxPlayers: 6, montepremi: 0,
  createdAt: '2026-11-05T09:00:00.000Z', players: [{ id: 'p3', name: 'Dario' }],
};

export const pageOf = (items, total = items.length, page = 1, limit = 20) => ({ items, total, page, limit });

/** The admin is Dario (p3), on the admin screen */
export const adminState = (extra = {}) => ({
  player: {
    id: 'p3',
    name: 'Dario',
    credits: 0,
    role: 'admin',
    currentGameId: null,
    regoleAccettateIl: '2026-11-03T10:00:00.000Z',
    isLoading: false,
    error: null,
    sessionChecked: true,
  },
  ui: { toasts: [], currentScreen: 'admin', modals: {}, isLoading: false, vittoriaRecente: null },
  game: { lobbies: [], currentGameId: null, game: null, currentPlayer: null },
  ...extra,
});

export const failure = (message, status) => Object.assign(new Error(message), status ? { status } : {});
