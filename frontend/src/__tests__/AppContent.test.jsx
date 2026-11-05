import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AppContent from '../AppContent';
import { renderWithProviders } from './test-utils';
import * as authService from '../services/authService';
import * as gameService from '../services/gameService';
import * as adminService from '../services/adminService';

vi.mock('../services/authService');
vi.mock('../services/gameService');
vi.mock('../services/adminService');

const preloaded = (regoleAccettateIl, screen = 'hall') => ({
  player: { id: 'p1', name: 'Anna', credits: 100, currentGameId: null, regoleAccettateIl, isLoading: false, error: null, sessionChecked: true },
  ui: { toasts: [], currentScreen: screen, modals: {}, isLoading: false, vittoriaRecente: null },
  game: { lobbies: [], currentGameId: null, game: null, currentPlayer: null },
});

describe('AppContent: the rules come first', () => {
  beforeEach(() => {
    authService.restoreSession.mockResolvedValue(null);
    gameService.getLobby.mockResolvedValue([]);
  });

  test('a player who never confirmed sees the rules, not the hall', async () => {
    renderWithProviders(<AppContent />, { preloadedState: preloaded(null) });

    expect(await screen.findByRole('heading', { name: 'Prima di giocare: le regole' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Hall' })).not.toBeInTheDocument();
  });

  test('also a player who is already in a lobby reads them first', async () => {
    renderWithProviders(<AppContent />, { preloadedState: preloaded(null, 'lobby') });

    expect(await screen.findByRole('heading', { name: 'Prima di giocare: le regole' })).toBeInTheDocument();
  });

  test('a player who confirmed goes on to the hall', async () => {
    renderWithProviders(<AppContent />, { preloadedState: preloaded('2026-11-03T10:00:00.000Z') });

    expect(await screen.findByRole('heading', { name: 'Hall' })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Prima di giocare: le regole' })).not.toBeInTheDocument());
  });

  test('somebody who is not logged in sees the login page', async () => {
    const state = preloaded(null, 'home');
    state.player.id = null;
    renderWithProviders(<AppContent />, { preloadedState: state });

    expect(await screen.findByRole('heading', { name: /combocard/i })).toBeInTheDocument();
  });
});

describe('AppContent: the admin screen', () => {
  beforeEach(() => {
    authService.restoreSession.mockResolvedValue(null);
    gameService.getLobby.mockResolvedValue([]);
    adminService.listUsers.mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 });
  });

  test('an admin on the admin screen sees it', async () => {
    const state = preloaded('2026-11-03T10:00:00.000Z', 'admin');
    state.player.role = 'admin';
    renderWithProviders(<AppContent />, { preloadedState: state });

    expect(await screen.findByRole('heading', { name: 'Amministrazione' })).toBeInTheDocument();
  });

  test('anybody else is shown the hall, whatever the screen says', async () => {
    renderWithProviders(<AppContent />, { preloadedState: preloaded('2026-11-03T10:00:00.000Z', 'admin') });

    expect(await screen.findByRole('heading', { name: 'Hall' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Amministrazione' })).not.toBeInTheDocument();
    expect(adminService.listUsers).not.toHaveBeenCalled();
  });
});
