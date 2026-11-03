import React from 'react';
import { screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RegoleScreen } from '../../components/game';
import { renderWithProviders } from '../test-utils';
import * as playerService from '../../services/playerService';

vi.mock('../../services/playerService');

const state = () => ({
  player: { id: 'p1', name: 'Anna', credits: 0, regoleAccettateIl: null },
});

// A fake IntersectionObserver that lets the test say when the end of the rules is seen
let observers;
const installObserver = () => {
  observers = [];
  window.IntersectionObserver = class {
    constructor(callback) {
      this.callback = callback;
      observers.push(this);
    }
    observe() {}
    disconnect() {}
  };
};
const reachTheEnd = () => act(() => observers.forEach((o) => o.callback([{ isIntersecting: true }])));

describe('RegoleScreen: the rules every new player must read', () => {
  beforeEach(() => installObserver());
  afterEach(() => {
    delete window.IntersectionObserver;
  });

  test('says why it is there and shows the whole rules', () => {
    renderWithProviders(<RegoleScreen />, { preloadedState: state() });

    expect(screen.getByRole('heading', { name: 'Prima di giocare: le regole' })).toBeInTheDocument();
    expect(screen.getByText(/non inizia finché tutti i giocatori nuovi/)).toBeInTheDocument();
    for (const titolo of ['Lo scopo', 'Come funziona una partita', 'La cartella', 'Le collezioni', 'Il Jolly', 'Come finisce']) {
      expect(screen.getByRole('heading', { name: titolo })).toBeInTheDocument();
    }
  });

  test('the player cannot declare to have read until the end of the rules has been seen', () => {
    renderWithProviders(<RegoleScreen />, { preloadedState: state() });

    expect(screen.getByLabelText(/Ho letto e compreso le regole/)).toBeDisabled();
    expect(screen.getByText(/Scorri fino in fondo/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confermo e continuo' })).toBeDisabled();
  });

  test('at the end the declaration can be ticked, and only then the player can continue', () => {
    renderWithProviders(<RegoleScreen />, { preloadedState: state() });
    reachTheEnd();

    const casella = screen.getByLabelText(/Ho letto e compreso le regole/);
    expect(casella).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Confermo e continuo' })).toBeDisabled();

    fireEvent.click(casella);

    expect(screen.getByRole('button', { name: 'Confermo e continuo' })).toBeEnabled();
  });

  test('confirming tells the server and stores the date', async () => {
    playerService.acceptRules.mockResolvedValue({ regoleAccettateIl: '2026-11-03T10:00:00.000Z' });
    const { store } = renderWithProviders(<RegoleScreen />, { preloadedState: state() });
    reachTheEnd();
    fireEvent.click(screen.getByLabelText(/Ho letto e compreso le regole/));

    fireEvent.click(screen.getByRole('button', { name: 'Confermo e continuo' }));

    await waitFor(() => expect(store.getState().player.regoleAccettateIl).toBe('2026-11-03T10:00:00.000Z'));
    expect(playerService.acceptRules).toHaveBeenCalledWith('p1');
  });

  test('a double tap confirms once', async () => {
    playerService.acceptRules.mockResolvedValue({ regoleAccettateIl: '2026-11-03T10:00:00.000Z' });
    renderWithProviders(<RegoleScreen />, { preloadedState: state() });
    reachTheEnd();
    fireEvent.click(screen.getByLabelText(/Ho letto e compreso le regole/));

    const conferma = screen.getByRole('button', { name: 'Confermo e continuo' });
    fireEvent.click(conferma);
    fireEvent.click(conferma);

    await waitFor(() => expect(playerService.acceptRules).toHaveBeenCalledTimes(1));
  });

  test('if the server cannot be reached the reason is shown and the player can try again', async () => {
    playerService.acceptRules.mockRejectedValue(new Error('Impossibile contattare il server: controlla la connessione e riprova'));
    renderWithProviders(<RegoleScreen />, { preloadedState: state() });
    reachTheEnd();
    fireEvent.click(screen.getByLabelText(/Ho letto e compreso le regole/));

    fireEvent.click(screen.getByRole('button', { name: 'Confermo e continuo' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Impossibile contattare il server');
    expect(screen.getByRole('button', { name: 'Confermo e continuo' })).toBeEnabled();
  });

  test('a browser without IntersectionObserver lets the player declare at once', () => {
    delete window.IntersectionObserver;
    renderWithProviders(<RegoleScreen />, { preloadedState: state() });

    expect(screen.getByLabelText(/Ho letto e compreso le regole/)).toBeEnabled();
  });
});
