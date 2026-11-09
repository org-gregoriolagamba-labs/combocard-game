import { renderHook, act } from '@testing-library/react';
import { useSegnaliTurno } from '../../hooks/useSegnaliTurno';
import { suona } from '../../services/soundService';

vi.mock('../../services/soundService');

const avanza = (ms) => act(() => vi.advanceTimersByTime(ms));
const chiamate = (nome) => vi.mocked(suona).mock.calls.filter(([n]) => n === nome).length;

describe('useSegnaliTurno: the warning of the last seconds of a turn', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date('2026-01-01T10:00:00Z') });
    vi.mocked(suona).mockClear();
  });
  afterEach(() => vi.useRealTimers());

  test('nothing sounds while there is more than five seconds left', () => {
    renderHook(() => useSegnaliTurno(Date.now() + 30_000));

    avanza(24_000);

    expect(suona).not.toHaveBeenCalled();
  });

  test('a beep at 5, 4, 3, 2 and 1 seconds, one for each second, and the siren at zero', () => {
    renderHook(() => useSegnaliTurno(Date.now() + 10_000));

    avanza(4_900);
    expect(chiamate('bip')).toBe(0);

    avanza(200); // 5 seconds left
    expect(chiamate('bip')).toBe(1);
    avanza(1_000);
    expect(chiamate('bip')).toBe(2);
    avanza(3_000); // 1 second left
    expect(chiamate('bip')).toBe(5);
    expect(chiamate('sirena')).toBe(0);

    avanza(1_000); // zero
    expect(chiamate('bip')).toBe(5);
    expect(chiamate('sirena')).toBe(1);
  });

  test('the siren sounds once, not again after zero', () => {
    renderHook(() => useSegnaliTurno(Date.now() + 2_000));

    avanza(10_000);

    expect(chiamate('sirena')).toBe(1);
  });

  test('with no turn nothing sounds', () => {
    renderHook(() => useSegnaliTurno(null));

    avanza(10_000);

    expect(suona).not.toHaveBeenCalled();
  });

  test('while the turn is stopped (the jolly) nothing sounds, and the beeps go on from where it stopped', () => {
    const { rerender } = renderHook(({ scadenza }) => useSegnaliTurno(scadenza), { initialProps: { scadenza: Date.now() + 8_000 } });

    avanza(2_000); // 6 s left
    rerender({ scadenza: null }); // stopped
    avanza(20_000);
    expect(suona).not.toHaveBeenCalled();

    rerender({ scadenza: Date.now() + 6_000 }); // goes on: 6 s left
    avanza(1_100);
    expect(chiamate('bip')).toBe(1);
  });

  test('a new turn has its own beeps, even with the same seconds', () => {
    const { rerender } = renderHook(({ scadenza }) => useSegnaliTurno(scadenza), { initialProps: { scadenza: Date.now() + 5_000 } });
    avanza(5_100);
    expect(chiamate('sirena')).toBe(1);

    rerender({ scadenza: Date.now() + 5_000 });
    avanza(5_100);

    expect(chiamate('bip')).toBe(10);
    expect(chiamate('sirena')).toBe(2);
  });

  test('a screen opened with 3.5 seconds left beeps for what is left', () => {
    renderHook(() => useSegnaliTurno(Date.now() + 3_500));

    avanza(4_000);

    expect(chiamate('bip')).toBe(4);
    expect(chiamate('sirena')).toBe(1);
  });

  test('a turn that was already over when the screen opened does not blare the siren', () => {
    renderHook(() => useSegnaliTurno(Date.now() - 1_000));

    avanza(2_000);

    expect(suona).not.toHaveBeenCalled();
  });

  test('stops when the screen goes away', () => {
    const { unmount } = renderHook(() => useSegnaliTurno(Date.now() + 10_000));
    unmount();

    avanza(12_000);

    expect(suona).not.toHaveBeenCalled();
  });
});
