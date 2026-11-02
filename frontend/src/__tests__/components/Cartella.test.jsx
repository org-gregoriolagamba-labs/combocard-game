import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Cartella } from '../../components/game';

const carta = { valore: 'Asso', seme: 'Spade', emoji: '⚔️', valoreNum: 1 };
const griglia = [[carta]];

describe('Cartella', () => {
  test('without optional props it renders, and a click does nothing', () => {
    render(<Cartella cartella={griglia} coperte={[[false]]} />);

    fireEvent.click(screen.getByText('Asso'));

    expect(screen.queryByText('JOLLY')).not.toBeInTheDocument();
  });

  test('in jolly mode a click without a handler uses the default and does not throw', () => {
    render(<Cartella cartella={griglia} coperte={[[false]]} jollyMode="tris" />);

    expect(() => fireEvent.click(screen.getByText('Asso'))).not.toThrow();
  });

  test('in jolly mode a click on an uncovered card calls the handler', () => {
    const onCardClick = vi.fn();
    render(
      <Cartella cartella={griglia} coperte={[[false]]} jollyMode="tris" onCardClick={onCardClick} />,
    );

    fireEvent.click(screen.getByText('Asso'));

    expect(onCardClick).toHaveBeenCalledWith(0, 0);
  });

  describe('each card is a button with its name', () => {
    test('named by value and suit', () => {
      render(<Cartella cartella={griglia} coperte={[[false]]} />);

      expect(screen.getByRole('button', { name: 'Asso di Spade' })).toBeInTheDocument();
    });

    test('a covered card says so, and has no text drawn over it', () => {
      render(<Cartella cartella={griglia} coperte={[[true]]} jollyMode="tris" />);

      expect(screen.getByRole('button', { name: 'Asso di Spade, coperta' })).toBeDisabled();
      expect(screen.queryByText(/Estratta/)).not.toBeInTheDocument();
    });

    test('outside the jolly mode no card can be activated', () => {
      render(<Cartella cartella={griglia} coperte={[[false]]} />);

      expect(screen.getByRole('button', { name: 'Asso di Spade' })).toBeDisabled();
    });

    test('in jolly mode only the uncovered cards can be activated', () => {
      const due = [[carta, { ...carta, valore: 'Re' }]];
      render(<Cartella cartella={due} coperte={[[false, true]]} jollyMode="tris" />);

      expect(screen.getByRole('button', { name: 'Asso di Spade' })).toBeEnabled();
      expect(screen.getByRole('button', { name: 'Re di Spade, coperta' })).toBeDisabled();
    });

    test('once the jolly is used no card can be activated', () => {
      render(<Cartella cartella={griglia} coperte={[[false]]} jollyMode="tris" jollyUsato />);

      expect(screen.getByRole('button', { name: 'Asso di Spade' })).toBeDisabled();
    });

    test('the chosen card is marked as pressed', () => {
      render(
        <Cartella
          cartella={griglia}
          coperte={[[false]]}
          jollyMode="tris"
          selected={{ row: 0, col: 0 }}
        />,
      );

      expect(screen.getByRole('button', { name: 'Asso di Spade' })).toHaveAttribute('aria-pressed', 'true');
    });
  });

  test('the suit is drawn with its Neapolitan illustration', () => {
    const { container } = render(<Cartella cartella={griglia} coperte={[[false]]} />);

    expect(container.querySelector('img')).toHaveAttribute('src', '/semi/spade.webp');
  });

  test('the jolly card is marked', () => {
    render(<Cartella cartella={griglia} coperte={[[false]]} jollyPos={{ row: 0, col: 0 }} />);

    expect(screen.getByText('JOLLY')).toBeInTheDocument();
  });
});
