import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CartaNapoletana } from '../../components/game';

describe('CartaNapoletana', () => {
  test('shows the card of the historical deck, named by value and suit', () => {
    render(<CartaNapoletana valore="Quattro" seme="Coppe" />);

    const img = screen.getByRole('img', { name: 'Quattro di Coppe' });
    expect(img).toHaveAttribute('src', '/carte/coppe-quattro.webp');
  });

  test.each([
    ['Asso', 'Denari', '/carte/denari-asso.webp'],
    ['Fante', 'Spade', '/carte/spade-fante.webp'],
    ['Cavallo', 'Bastoni', '/carte/bastoni-cavallo.webp'],
    ['Re', 'Coppe', '/carte/coppe-re.webp'],
  ])('%s di %s uses %s', (valore, seme, src) => {
    render(<CartaNapoletana valore={valore} seme={seme} />);

    expect(screen.getByRole('img')).toHaveAttribute('src', src);
  });

  test('has fixed dimensions, so the page does not shift when it loads', () => {
    render(<CartaNapoletana valore="Re" seme="Coppe" />);

    expect(screen.getByRole('img')).toHaveAttribute('width', '198');
    expect(screen.getByRole('img')).toHaveAttribute('height', '360');
  });

  test('if the image cannot be loaded it shows the name of the card', () => {
    render(<CartaNapoletana valore="Re" seme="Coppe" />);

    fireEvent.error(screen.getByRole('img'));

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('Re di Coppe')).toBeInTheDocument();
  });
});
