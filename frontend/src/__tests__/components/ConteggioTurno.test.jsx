import React from 'react';
import { act, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ConteggioTurno, { formattaTempo } from '../../components/game/ConteggioTurno';

describe('formattaTempo', () => {
  test.each([
    [60_000, '1:00'],
    [59_001, '1:00'],
    [54_000, '0:54'],
    [9_100, '0:10'],
    [1, '0:01'],
    [0, '0:00'],
    [-5, '0:00'],
  ])('%i ms is %s', (ms, testo) => {
    expect(formattaTempo(ms)).toBe(testo);
  });
});

describe('ConteggioTurno', () => {
  beforeEach(() => vi.useFakeTimers({ now: new Date('2026-01-01T10:00:00Z') }));
  afterEach(() => vi.useRealTimers());

  test('counts down to the end of the turn', () => {
    render(<ConteggioTurno scadenza={Date.now() + 10_000} />);
    expect(screen.getByTestId('conto-turno')).toHaveTextContent('0:10');

    act(() => {
      vi.advanceTimersByTime(4_000);
    });

    expect(screen.getByTestId('conto-turno')).toHaveTextContent('0:06');
  });

  test('stops at zero', () => {
    render(<ConteggioTurno scadenza={Date.now() + 1_000} />);

    act(() => {
      vi.advanceTimersByTime(5_000);
    });

    expect(screen.getByTestId('conto-turno')).toHaveTextContent('0:00');
  });

  test('stays still while the turn is stopped', () => {
    render(<ConteggioTurno scadenza={Date.now() + 54_000} sospeso restanteMs={41_000} />);

    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    expect(screen.getByTestId('conto-turno')).toHaveTextContent('0:41');
  });

  test('is not read second by second to screen readers', () => {
    render(<ConteggioTurno scadenza={Date.now() + 10_000} />);

    expect(screen.getByTestId('conto-turno')).toHaveAttribute('aria-hidden', 'true');
  });

  test('turns red in the last ten seconds', () => {
    render(<ConteggioTurno scadenza={Date.now() + 8_000} />);

    expect(screen.getByTestId('conto-turno')).toHaveAttribute('data-urgente', 'true');
  });
});
