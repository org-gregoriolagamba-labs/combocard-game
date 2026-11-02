import React from 'react';
import { screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Toast } from '../../components/common';
import { renderWithProviders } from '../test-utils';

const toast = (overrides = {}) => ({ id: 1, message: 'Partita iniziata', type: 'success', duration: 3000, ...overrides });
const stateWith = (...toasts) => ({ ui: { toasts, currentScreen: 'game', modals: {}, isLoading: false } });

describe('Toast', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test('keeps its live region on the page even when there is nothing to say', () => {
    renderWithProviders(<Toast />, { preloadedState: stateWith() });

    expect(screen.getByRole('region', { name: 'Notifiche' })).toHaveAttribute('aria-live', 'polite');
  });

  test('a notice is announced as a status', () => {
    renderWithProviders(<Toast />, { preloadedState: stateWith(toast()) });

    expect(screen.getByRole('status')).toHaveTextContent('Partita iniziata');
  });

  test('an error is announced at once', () => {
    renderWithProviders(<Toast />, { preloadedState: stateWith(toast({ type: 'error', message: 'Non hai crediti sufficienti' })) });

    expect(screen.getByRole('alert')).toHaveTextContent('Non hai crediti sufficienti');
  });

  test('goes away by itself after its duration', () => {
    const { store } = renderWithProviders(<Toast />, { preloadedState: stateWith(toast({ duration: 3000 })) });

    act(() => { jest.advanceTimersByTime(2999); });
    expect(store.getState().ui.toasts).toHaveLength(1);
    act(() => { jest.advanceTimersByTime(1); });

    expect(store.getState().ui.toasts).toHaveLength(0);
  });

  test('each notice has its own time, a new one does not extend the others', () => {
    const { store } = renderWithProviders(<Toast />, {
      preloadedState: stateWith(toast({ id: 1, duration: 3000 }), toast({ id: 2, message: 'Altro', duration: 6000 })),
    });

    act(() => { jest.advanceTimersByTime(3000); });

    expect(store.getState().ui.toasts.map((t) => t.id)).toEqual([2]);
  });

  test('stops its timers when it is closed', () => {
    const { store, unmount } = renderWithProviders(<Toast />, { preloadedState: stateWith(toast()) });
    unmount();

    act(() => { jest.advanceTimersByTime(5000); });

    expect(store.getState().ui.toasts).toHaveLength(1);
  });

  test('a tap closes it', () => {
    const { store } = renderWithProviders(<Toast />, { preloadedState: stateWith(toast()) });

    fireEvent.click(screen.getByText('Partita iniziata'));

    expect(store.getState().ui.toasts).toHaveLength(0);
  });
});
