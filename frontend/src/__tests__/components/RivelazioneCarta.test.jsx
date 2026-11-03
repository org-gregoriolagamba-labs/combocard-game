import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RivelazioneCarta, Coriandoli } from '../../components/game';

const asso = { valore: 'Asso', seme: 'Denari' };
const re = { valore: 'Re', seme: 'Coppe' };

describe('RivelazioneCarta', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  test('does not play for the card that was already drawn when the screen opened', () => {
    render(<RivelazioneCarta carta={asso} />);

    expect(screen.queryByTestId('rivelazione-carta')).not.toBeInTheDocument();
  });

  test('plays for a new card and goes away by itself', () => {
    const { rerender } = render(<RivelazioneCarta carta={asso} />);

    rerender(<RivelazioneCarta carta={re} />);
    expect(screen.getByTestId('rivelazione-carta')).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(1800));
    expect(screen.queryByTestId('rivelazione-carta')).not.toBeInTheDocument();
  });

  test('never blocks a tap and is hidden from screen readers', () => {
    const { rerender } = render(<RivelazioneCarta carta={asso} />);
    rerender(<RivelazioneCarta carta={re} />);

    const scena = screen.getByTestId('rivelazione-carta');
    expect(scena).toHaveClass('pointer-events-none');
    expect(scena).toHaveAttribute('aria-hidden', 'true');
  });

  test('is skipped when the player asks for less movement', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true });
    const { rerender } = render(<RivelazioneCarta carta={asso} />);

    rerender(<RivelazioneCarta carta={re} />);

    expect(screen.queryByTestId('rivelazione-carta')).not.toBeInTheDocument();
  });
});

describe('Coriandoli', () => {
  test('is a decoration: hidden from screen readers and from taps', () => {
    render(<Coriandoli id="tris" />);

    const burst = screen.getByTestId('coriandoli');
    expect(burst).toHaveAttribute('aria-hidden', 'true');
    expect(burst).toHaveClass('pointer-events-none');
    expect(burst.children.length).toBeGreaterThan(10);
  });
});
