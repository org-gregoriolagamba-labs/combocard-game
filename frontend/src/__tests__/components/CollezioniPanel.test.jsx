import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CollezioniPanel } from '../../components/game';

const carta = { valore: 'Asso', seme: 'Spade', emoji: '⚔️', valoreNum: 1 };
const cartella = Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => ({ ...carta })));
const coperte = Array.from({ length: 5 }, () => Array(5).fill(false));

const open = { vinto: false, vincitore: null };
const baseGame = () => ({
  status: 'playing',
  players: [{ id: 'anna', name: 'Anna' }, { id: 'carlo', name: 'Carlo' }],
  collezioni: { tris: { ...open }, sequenza: { ...open }, scopa: { ...open }, napola: { ...open }, combocard_reale: { ...open } },
  collezioniDistribuzione: { tris: 20, sequenza: 20, scopa: 25, napola: 25, combocard_reale: 60 },
});
const player = (overrides = {}) => ({ id: 'carlo', jollyUsato: false, cartella, coperte, ...overrides });

const row = (tipo) => screen.getByTestId(`collezione-${tipo}`);

const renderPanel = (props = {}) =>
  render(
    <CollezioniPanel
      game={baseGame()}
      currentPlayer={player()}
      onJollyMode={() => {}}
      isGameFinished={false}
      {...props}
    />,
  );

describe('CollezioniPanel', () => {
  test('lists the five collections, each with its prize', () => {
    renderPanel();

    for (const [tipo, label, prize] of [['tris', 'TRIS', '20'], ['sequenza', 'SEQUENZA', '20'], ['scopa', 'SCOPA', '25'], ['napola', 'NAPOLA', '25'], ['combocard_reale', 'COMBOCARD REALE', '60']]) {
      expect(row(tipo)).toHaveTextContent(label);
      expect(row(tipo)).toHaveTextContent(`Premio ${prize}`);
    }
  });

  test('shows how close the player is, in numbers', () => {
    renderPanel();

    expect(row('tris')).toHaveTextContent('0/3');
    expect(row('scopa')).toHaveTextContent('0/5');
  });

  test('a collection is won by itself: there is no button to claim it', () => {
    renderPanel();

    const names = screen.getAllByRole('button').map((b) => b.getAttribute('aria-label') ?? b.textContent);
    expect(names.some((n) => /^🎯|^TRIS$|rivendic/i.test(n))).toBe(false);
  });

  test('the jolly button names its collection and starts the jolly for it', () => {
    const onJollyMode = vi.fn();
    renderPanel({ onJollyMode });

    fireEvent.click(screen.getByRole('button', { name: 'Usa il Jolly per TRIS' }));

    expect(screen.getAllByRole('button', { name: /^Usa il Jolly per / })).toHaveLength(5);
    expect(onJollyMode).toHaveBeenCalledWith('tris');
  });

  test('a won collection says who won it, and has no jolly button', () => {
    const game = baseGame();
    game.collezioni.tris = { vinto: true, vincitore: 'anna' };
    renderPanel({ game });

    expect(row('tris')).toHaveTextContent('Vinta da Anna');
    expect(screen.queryByRole('button', { name: 'Usa il Jolly per TRIS' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Usa il Jolly per SEQUENZA' })).toBeInTheDocument();
  });

  test('when several players win it together, it names them all', () => {
    const game = baseGame();
    game.collezioni.scopa = { vinto: true, vincitore: ['anna', 'carlo'] };
    renderPanel({ game });

    expect(row('scopa')).toHaveTextContent('Vinta da Anna, Carlo');
  });

  test('a winner who left the game is still acknowledged', () => {
    const game = baseGame();
    game.collezioni.napola = { vinto: true, vincitore: 'sconosciuto' };
    renderPanel({ game });

    expect(row('napola')).toHaveTextContent('Vinta da un giocatore');
  });

  test('once the jolly is used there are no jolly buttons, and the panel says so', () => {
    renderPanel({ currentPlayer: player({ jollyUsato: true }) });

    expect(screen.queryByRole('button', { name: /^Usa il Jolly per / })).not.toBeInTheDocument();
    expect(screen.getByText(/Jolly usato/)).toBeInTheDocument();
  });

  test('a finished game offers no jolly', () => {
    renderPanel({ isGameFinished: true });

    expect(screen.queryByRole('button', { name: /^Usa il Jolly per / })).not.toBeInTheDocument();
  });

  test('the progress is read in words, not only seen in colour', () => {
    renderPanel();

    expect(row('tris').querySelector('[aria-hidden="true"]')).not.toBeNull();
    expect(row('tris')).toHaveTextContent(/0\/3/);
  });

  test('the rules stay in the panel, closed on a narrow screen', () => {
    renderPanel();

    expect(screen.getByRole('button', { name: /Come si gioca/ })).toHaveAttribute('aria-expanded', 'false');
  });
});
