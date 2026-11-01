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
    const onCardClick = jest.fn();
    render(
      <Cartella cartella={griglia} coperte={[[false]]} jollyMode="tris" onCardClick={onCardClick} />,
    );

    fireEvent.click(screen.getByText('Asso'));

    expect(onCardClick).toHaveBeenCalledWith(0, 0);
  });
});
