import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Cartella } from '../../components/game';

const carta = { valore: 'Asso', seme: 'Spade', emoji: '⚔️', valoreNum: 1 };
const griglia = [[carta]];

describe('Cartella', () => {
  test('without optional props it renders, and a click does nothing', () => {
    render(<Cartella cartella={griglia} coperte={[[false]]} />);

    fireEvent.click(screen.getByRole('button', { name: 'Asso di Spade' }));

    expect(screen.queryByText('JOLLY')).not.toBeInTheDocument();
  });

  test('in jolly mode a click without a handler uses the default and does not throw', () => {
    render(<Cartella cartella={griglia} coperte={[[false]]} jollyMode="tris" />);

    expect(() => fireEvent.click(screen.getByRole('button', { name: 'Asso di Spade' }))).not.toThrow();
  });

  test('in jolly mode a click on an uncovered card calls the handler with its place in the player grid', () => {
    const onCardClick = vi.fn();
    render(
      <Cartella cartella={griglia} coperte={[[false]]} jollyMode="tris" onCardClick={onCardClick} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Asso di Spade' }));

    expect(onCardClick).toHaveBeenCalledWith(0, 0);
  });

  describe('laid out like a tombola sheet', () => {
    test('is a table: ten rows of values and four columns of suits', () => {
      render(<Cartella cartella={griglia} coperte={[[false]]} />);

      expect(screen.getAllByRole('columnheader').map((th) => th.textContent)).toEqual([
        'Denari', 'Coppe', 'Spade', 'Bastoni',
      ]);
      expect(screen.getAllByRole('rowheader')).toHaveLength(10);
      expect(screen.getAllByRole('rowheader')[0]).toHaveTextContent('Asso');
      expect(screen.getAllByRole('rowheader')[9]).toHaveTextContent('Re');
    });

    test('a card sits in the row of its value and the column of its suit, wherever it is in the player grid', () => {
      const re = { valore: 'Re', seme: 'Coppe', valoreNum: 10 };
      render(<Cartella cartella={[[carta, re]]} coperte={[[false, false]]} />);

      const rigaRe = screen.getByRole('rowheader', { name: /Re/ }).closest('tr');
      expect(within(rigaRe).getByRole('button', { name: 'Re di Coppe' })).toBeInTheDocument();
      const rigaAsso = screen.getByRole('rowheader', { name: /Asso/ }).closest('tr');
      expect(within(rigaAsso).getByRole('button', { name: 'Asso di Spade' })).toBeInTheDocument();
    });

    test('the places of the cards that are not in the sheet are empty and have no button', () => {
      render(<Cartella cartella={griglia} coperte={[[false]]} />);

      expect(screen.getAllByRole('button')).toHaveLength(1);
    });
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

    test('with the list of the possible cards, only those can be activated', () => {
      const due = [[carta, { ...carta, valore: 'Re', valoreNum: 10 }]];
      render(
        <Cartella cartella={due} coperte={[[false, false]]} jollyMode="tris" possibili={[{ row: 0, col: 1 }]} />,
      );

      expect(screen.getByRole('button', { name: 'Re di Spade' })).toBeEnabled();
      expect(screen.getByRole('button', { name: 'Asso di Spade' })).toBeDisabled();
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

  describe('the sheet shows how near a figure is', () => {
    const sei = (seme) => ({ valore: 'Sei', seme, valoreNum: 6 });
    const tre = (seme) => ({ valore: 'Tre', seme, valoreNum: 3 });

    test('a row with two covered cards of one value shows 2/3, a tris being three', () => {
      render(<Cartella cartella={[[sei('Spade'), sei('Coppe'), tre('Spade')]]} coperte={[[true, true, false]]} />);

      const riga = screen.getByRole('rowheader', { name: /Sei/ });
      expect(riga).toHaveTextContent('2/3');
      expect(screen.getByRole('rowheader', { name: /Tre/ })).not.toHaveTextContent('/3');
    });

    test('a column with three covered cards of one suit shows 3/5, a scopa being five', () => {
      const carte = [['Asso', 1], ['Due', 2], ['Tre', 3], ['Re', 10]].map(([valore, valoreNum]) => ({ valore, seme: 'Spade', valoreNum }));
      render(<Cartella cartella={[carte]} coperte={[[true, true, true, false]]} />);

      expect(screen.getByRole('columnheader', { name: /Spade/ })).toHaveTextContent('3/5');
      expect(screen.getByRole('columnheader', { name: /Coppe/ })).not.toHaveTextContent('/5');
    });
  });

  test('the suit is drawn with its Neapolitan illustration', () => {
    const { container } = render(<Cartella cartella={griglia} coperte={[[false]]} />);

    expect(container.querySelector('tbody img')).toHaveAttribute('src', '/semi/spade.webp');
  });

  test('the jolly card is marked', () => {
    render(<Cartella cartella={griglia} coperte={[[false]]} jollyPos={{ row: 0, col: 0 }} />);

    expect(screen.getByText('JOLLY')).toBeInTheDocument();
  });
});
