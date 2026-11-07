import React from 'react';
import { screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { HallScreen } from '../../components/game';
import { HomePage } from '../../pages';
import Footer from '../../components/common/Footer';
import { renderWithProviders } from '../test-utils';
import * as gameService from '../../services/gameService';

vi.mock('../../services/gameService');
vi.mock('../../services/socketService', () => ({
  __esModule: true,
  default: { connect: vi.fn(), disconnect: vi.fn(), getSocket: vi.fn() },
}));

const build = vi.hoisted(() => ({ date: '2026-11-08T10:00:00.000Z' }));
vi.mock('../../config/buildInfo', async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    APP_VERSION: '2.4.0',
    get BUILD_DATE() {
      return build.date;
    },
  };
});

const state = () => ({
  player: { id: 'p1', name: 'Anna', credits: 100, regoleAccettateIl: '2026-11-03T10:00:00.000Z', role: 'player' },
  ui: { toasts: [], currentScreen: 'hall', modals: {}, isLoading: false, vittoriaRecente: null },
  game: { lobbies: [], currentGameId: null, game: null, currentPlayer: null },
});

describe('the footer', () => {
  beforeEach(() => {
    build.date = '2026-11-08T10:00:00.000Z';
    gameService.getLobby.mockResolvedValue([]);
  });

  test('names the app with its trademark, the copyright and the version', () => {
    renderWithProviders(<Footer />);

    const footer = screen.getByRole('contentinfo');
    expect(footer).toHaveTextContent('ComboCard™');
    expect(footer).toHaveTextContent('© 2026 Gregorio La Gamba');
    expect(footer).toHaveTextContent('v2.4.0');
  });

  test('never claims a registered trademark: the sign is ™, not ®', () => {
    renderWithProviders(<Footer />);

    expect(screen.getByRole('contentinfo').textContent).not.toContain('®');
  });

  test('the year follows the build: from the first year to the year of the build', () => {
    build.date = '2027-02-01T10:00:00.000Z';
    renderWithProviders(<Footer />);

    expect(screen.getByRole('contentinfo')).toHaveTextContent('© 2026–2027 Gregorio La Gamba');
  });

  test('the link opens the "Info e contatti" dialog, and closing it gives the focus back', () => {
    renderWithProviders(<Footer />);
    const link = within(screen.getByRole('contentinfo')).getByRole('button', { name: 'Info e contatti' });

    fireEvent.click(link);
    expect(screen.getByRole('dialog', { name: 'Info e contatti' })).toBeInTheDocument();

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(link).toHaveFocus();
  });

  test('is at the foot of the login screen and of the hall, each with a single link', async () => {
    const login = renderWithProviders(<HomePage />);
    expect(within(screen.getByRole('contentinfo')).getByText(/ComboCard™/)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Info e contatti' })).toHaveLength(1);
    login.unmount();

    renderWithProviders(<HallScreen />, { preloadedState: state() });
    expect(await screen.findByRole('contentinfo')).toHaveTextContent('ComboCard™');
    expect(screen.getAllByRole('button', { name: 'Info e contatti' })).toHaveLength(1);
  });
});
