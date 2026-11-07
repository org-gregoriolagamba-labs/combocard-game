import React from 'react';
import { screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { HallScreen } from '../../components/game';
import { HomePage } from '../../pages';
import InfoDialog from '../../components/common/InfoDialog';
import { renderWithProviders } from '../test-utils';
import * as gameService from '../../services/gameService';

vi.mock('../../services/gameService');
vi.mock('../../services/socketService', () => ({
  __esModule: true,
  default: { connect: vi.fn(), disconnect: vi.fn(), getSocket: vi.fn() },
}));
vi.mock('../../config/buildInfo', async (importOriginal) => ({
  ...(await importOriginal()),
  APP_VERSION: '2.4.0',
  BUILD_DATE: '2026-11-08T10:00:00.000Z',
}));

const contatti = vi.hoisted(() => ({
  CONTATTI: {
    autore: 'Gregorio La Gamba',
    linkedin: 'https://www.linkedin.com/in/gregoriolagamba/',
    repository: 'https://github.com/org-gregoriolagamba-labs/combocard-game',
    email: null,
  },
}));
vi.mock('../../config/contatti', async (importOriginal) => ({
  ...(await importOriginal()),
  ...contatti,
}));

const state = () => ({
  player: { id: 'p1', name: 'Anna', credits: 100, regoleAccettateIl: '2026-11-03T10:00:00.000Z', role: 'player' },
  ui: { toasts: [], currentScreen: 'hall', modals: {}, isLoading: false, vittoriaRecente: null },
  game: { lobbies: [], currentGameId: null, game: null, currentPlayer: null },
});

describe('the "Info e contatti" dialog', () => {
  beforeEach(() => {
    contatti.CONTATTI.email = null;
    gameService.getLobby.mockResolvedValue([]);
  });

  test('says which version it is and when it was updated', () => {
    renderWithProviders(<InfoDialog onClose={() => {}} />);

    const dialog = screen.getByRole('dialog', { name: 'Info e contatti' });
    expect(dialog).toHaveTextContent('Versione');
    expect(dialog).toHaveTextContent('2.4.0');
    expect(dialog).toHaveTextContent('Ultimo aggiornamento');
    expect(within(dialog).getByText('8 novembre 2026')).toHaveAttribute('datetime', '2026-11-08T10:00:00.000Z');
  });

  test('describes the game in a few words', () => {
    renderWithProviders(<InfoDialog onClose={() => {}} />);

    expect(screen.getByRole('dialog')).toHaveTextContent(/gioco di carte napoletane/i);
    expect(screen.getByRole('dialog')).toHaveTextContent(/senza valore reale/i);
  });

  test('gives the author, LinkedIn and the repository, opened in a new tab', () => {
    renderWithProviders(<InfoDialog onClose={() => {}} />);

    expect(screen.getByRole('dialog')).toHaveTextContent('Gregorio La Gamba');
    const linkedin = screen.getByRole('link', { name: /LinkedIn/ });
    const repo = screen.getByRole('link', { name: /GitHub/ });
    expect(linkedin).toHaveAttribute('href', 'https://www.linkedin.com/in/gregoriolagamba/');
    expect(repo).toHaveAttribute('href', 'https://github.com/org-gregoriolagamba-labs/combocard-game');
    [linkedin, repo].forEach((link) => {
      expect(link).toHaveAttribute('target', '_blank');
      expect(link.getAttribute('rel')).toMatch(/noopener/);
      expect(link.getAttribute('rel')).toMatch(/noreferrer/);
      expect(link).toHaveTextContent('si apre in una nuova scheda');
    });
  });

  test('credits the deck: the 1875 pack printed in Naples, with the source', () => {
    renderWithProviders(<InfoDialog onClose={() => {}} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Pignalosa');
    expect(dialog).toHaveTextContent('1875');
    const source = within(dialog).getByRole('link', { name: /British Museum/ });
    expect(source).toHaveAttribute('href', 'https://www.britishmuseum.org/collection/object/P_1875-1211-172-211');
    expect(source).toHaveAttribute('target', '_blank');
    expect(source.getAttribute('rel')).toMatch(/noopener/);
  });

  test('shows no email until there is an address to write to', () => {
    renderWithProviders(<InfoDialog onClose={() => {}} />);

    expect(screen.queryByRole('link', { name: /email|scrivi/i })).not.toBeInTheDocument();
  });

  test('with an address, offers it as a link to write', () => {
    contatti.CONTATTI.email = 'ciao@example.org';
    renderWithProviders(<InfoDialog onClose={() => {}} />);

    expect(screen.getByRole('link', { name: /ciao@example\.org/ })).toHaveAttribute('href', 'mailto:ciao@example.org');
  });

  test('closes with Escape and with the close button', () => {
    const onClose = vi.fn();
    renderWithProviders(<InfoDialog onClose={onClose} />);

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: 'Chiudi' }));

    expect(onClose).toHaveBeenCalledTimes(2);
  });

  test('opens from the hall', async () => {
    renderWithProviders(<HallScreen />, { preloadedState: state() });

    fireEvent.click(screen.getByRole('button', { name: 'Info e contatti' }));

    expect(await screen.findByRole('dialog', { name: 'Info e contatti' })).toBeInTheDocument();
  });

  test('opens from the login screen, before entering', () => {
    renderWithProviders(<HomePage />);

    fireEvent.click(screen.getByRole('button', { name: 'Info e contatti' }));

    expect(screen.getByRole('dialog', { name: 'Info e contatti' })).toBeInTheDocument();
  });
});
