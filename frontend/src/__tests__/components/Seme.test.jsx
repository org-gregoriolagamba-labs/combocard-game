import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Seme } from '../../components/game';

describe('Seme', () => {
  test.each([
    ['Spade', 'spade'],
    ['Coppe', 'coppe'],
    ['Denari', 'denari'],
    ['Bastoni', 'bastoni'],
  ])('%s shows the illustration of the Neapolitan suit', (seme, file) => {
    const { container } = render(<Seme seme={seme} />);

    expect(container.querySelector('img')).toHaveAttribute('src', `/semi/${file}.webp`);
  });

  test('the illustration is decoration: the card button carries the name', () => {
    const { container } = render(<Seme seme="Coppe" />);

    expect(container.querySelector('img')).toHaveAttribute('alt', '');
    expect(container.querySelector('img')).toHaveAttribute('aria-hidden', 'true');
  });

  test('swords and clubs are tilted to fill a square, cups and coins are not', () => {
    const tilted = (seme) => render(<Seme seme={seme} />).container.querySelector('img').className;

    expect(tilted('Spade')).toMatch(/rotate/);
    expect(tilted('Bastoni')).toMatch(/rotate/);
    expect(tilted('Coppe')).not.toMatch(/rotate/);
    expect(tilted('Denari')).not.toMatch(/rotate/);
  });

  test('an unknown suit falls back to the emoji sent by the server', () => {
    const { container } = render(<Seme seme="Bastonetti" fallback="🪵" />);

    expect(container.querySelector('img')).toBeNull();
    expect(container).toHaveTextContent('🪵');
  });
});
