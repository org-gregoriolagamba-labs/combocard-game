import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { HallScreen } from '../../components/game';
import { renderWithProviders } from '../test-utils';
import * as gameService from '../../services/gameService';
import * as playerService from '../../services/playerService';

vi.mock('../../services/gameService');
vi.mock('../../services/playerService');

const state = (credits = 100) => ({
  player: { id: 'p1', name: 'Anna', credits },
  game: { lobbies: [], currentGameId: null, game: null, currentPlayer: null },
});

describe('HallScreen', () => {
  beforeEach(() => {
    gameService.getLobby.mockResolvedValue([]);
  });

  describe('the dialog to take credits', () => {
    const openCassa = () => fireEvent.click(screen.getByRole('button', { name: 'Prendi crediti' }));

    test('is a dialog that says the credits are play money', () => {
      renderWithProviders(<HallScreen />, { preloadedState: state() });

      openCassa();

      const dialog = screen.getByRole('dialog', { name: 'Prendi crediti di gioco' });
      expect(dialog).toHaveTextContent('crediti di gioco');
      expect(dialog).toHaveTextContent('nessun pagamento');
    });

    test('the amount field has a name', () => {
      renderWithProviders(<HallScreen />, { preloadedState: state() });

      openCassa();

      expect(screen.getByLabelText('Quanti crediti vuoi?')).toBeInTheDocument();
    });

    test('with nothing chosen it cannot add, and says what to do', () => {
      renderWithProviders(<HallScreen />, { preloadedState: state() });

      openCassa();

      expect(screen.getByRole('button', { name: 'Scegli un importo' })).toBeDisabled();
    });

    test('the amounts are real tap targets', () => {
      renderWithProviders(<HallScreen />, { preloadedState: state() });

      openCassa();

      for (const amount of ['+10', '+100', '+500']) {
        expect(screen.getByRole('button', { name: amount }).className).toMatch(/min-h-\[44px\]/);
      }
      expect(screen.getByRole('button', { name: /Azzera/ }).className).toMatch(/min-h-\[44px\]/);
    });

    test('choosing an amount enables the button that names it', () => {
      renderWithProviders(<HallScreen />, { preloadedState: state() });
      openCassa();

      fireEvent.click(screen.getByRole('button', { name: '+100' }));
      fireEvent.click(screen.getByRole('button', { name: '+50' }));

      expect(screen.getByRole('button', { name: 'Aggiungi 150 crediti' })).toBeEnabled();
    });

    test('adding credits sends the amount once, even with a double tap', async () => {
      playerService.buyCredits.mockResolvedValue({ credits: 250 });
      renderWithProviders(<HallScreen />, { preloadedState: state() });
      openCassa();
      fireEvent.click(screen.getByRole('button', { name: '+100' }));

      const add = screen.getByRole('button', { name: 'Aggiungi 100 crediti' });
      fireEvent.click(add);
      fireEvent.click(add);

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(playerService.buyCredits).toHaveBeenCalledTimes(1);
      expect(playerService.buyCredits).toHaveBeenCalledWith('p1', 100);
    });

    test('Esc closes it', () => {
      renderWithProviders(<HallScreen />, { preloadedState: state() });
      openCassa();

      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('creating a game', () => {
    const openCreate = () => fireEvent.click(screen.getByRole('button', { name: /Crea Nuova Partita/ }));

    test('the fields have names', () => {
      renderWithProviders(<HallScreen />, { preloadedState: state() });

      openCreate();

      expect(screen.getByLabelText('Crediti richiesti per partecipare')).toBeInTheDocument();
      expect(screen.getByLabelText('Numero massimo giocatori')).toBeInTheDocument();
    });

    test('a number of players out of range is explained in the field, and nothing is sent', () => {
      renderWithProviders(<HallScreen />, { preloadedState: state() });
      openCreate();

      fireEvent.change(screen.getByLabelText('Numero massimo giocatori'), { target: { value: '50' } });
      fireEvent.click(screen.getByRole('button', { name: /Crea Partita/ }));

      expect(screen.getByLabelText('Numero massimo giocatori')).toHaveAccessibleDescription('Da 2 a 10 giocatori');
      expect(gameService.createGame).not.toHaveBeenCalled();
    });

    test('the credits to ask start from what the player has, up to 100', () => {
      const { unmount } = renderWithProviders(<HallScreen />, { preloadedState: state(30) });
      openCreate();
      expect(screen.getByLabelText('Crediti richiesti per partecipare')).toHaveValue(30);
      unmount();

      renderWithProviders(<HallScreen />, { preloadedState: state(500) });
      openCreate();
      expect(screen.getByLabelText('Crediti richiesti per partecipare')).toHaveValue(100);
    });

    test('each field says what it means', () => {
      renderWithProviders(<HallScreen />, { preloadedState: state() });

      openCreate();

      expect(screen.getByLabelText('Crediti richiesti per partecipare')).toHaveAccessibleDescription(/montepremi/);
      expect(screen.getByLabelText('Numero massimo giocatori')).toHaveAccessibleDescription(/parte da sola/);
    });

    test('too few credits are explained in the field, with what to do', () => {
      renderWithProviders(<HallScreen />, { preloadedState: state(30) });
      openCreate();

      fireEvent.change(screen.getByLabelText('Crediti richiesti per partecipare'), { target: { value: '100' } });
      fireEvent.click(screen.getByRole('button', { name: /Crea Partita/ }));

      expect(screen.getByLabelText('Crediti richiesti per partecipare'))
        .toHaveAccessibleDescription('Hai 30 crediti: aggiungine con «Prendi crediti» o chiedi meno crediti');
      expect(gameService.createGame).not.toHaveBeenCalled();
    });
  });

  describe('the numeric fields can be emptied and typed again', () => {
    const openCassa = () => fireEvent.click(screen.getByRole('button', { name: 'Prendi crediti' }));
    const openCreate = () => fireEvent.click(screen.getByRole('button', { name: /Crea Nuova Partita/ }));
    const type = (label, value) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

    test('in the credits dialog the field stays empty when the value is deleted, then takes a new one', () => {
      renderWithProviders(<HallScreen />, { preloadedState: state() });
      openCassa();

      type('Quanti crediti vuoi?', '50');
      type('Quanti crediti vuoi?', '');

      expect(screen.getByLabelText('Quanti crediti vuoi?')).toHaveDisplayValue('');
      expect(screen.getByRole('button', { name: 'Scegli un importo' })).toBeDisabled();

      type('Quanti crediti vuoi?', '7');

      expect(screen.getByLabelText('Quanti crediti vuoi?')).toHaveDisplayValue('7');
      expect(screen.getByRole('button', { name: 'Aggiungi 7 crediti' })).toBeEnabled();
    });

    test('the quick amounts work from an empty field', () => {
      renderWithProviders(<HallScreen />, { preloadedState: state() });
      openCassa();
      type('Quanti crediti vuoi?', '');

      fireEvent.click(screen.getByRole('button', { name: '+100' }));

      expect(screen.getByLabelText('Quanti crediti vuoi?')).toHaveDisplayValue('100');
    });

    test('more than 10000 credits are brought back to 10000', () => {
      renderWithProviders(<HallScreen />, { preloadedState: state() });
      openCassa();

      type('Quanti crediti vuoi?', '20000');

      expect(screen.getByLabelText('Quanti crediti vuoi?')).toHaveDisplayValue('10000');
    });

    test('the credits to ask for a game can be emptied and typed again, and an empty one is asked for in the field', () => {
      renderWithProviders(<HallScreen />, { preloadedState: state() });
      openCreate();

      type('Crediti richiesti per partecipare', '');
      expect(screen.getByLabelText('Crediti richiesti per partecipare')).toHaveDisplayValue('');

      fireEvent.click(screen.getByRole('button', { name: /Crea Partita/ }));
      expect(screen.getByLabelText('Crediti richiesti per partecipare'))
        .toHaveAccessibleDescription('Scrivi quanti crediti servono per entrare');
      expect(gameService.createGame).not.toHaveBeenCalled();

      type('Crediti richiesti per partecipare', '2');
      expect(screen.getByLabelText('Crediti richiesti per partecipare')).toHaveDisplayValue('2');
    });

    test('the number of players can be emptied and typed again, and an empty one is asked for in the field', () => {
      renderWithProviders(<HallScreen />, { preloadedState: state() });
      openCreate();

      type('Numero massimo giocatori', '');
      expect(screen.getByLabelText('Numero massimo giocatori')).toHaveDisplayValue('');

      fireEvent.click(screen.getByRole('button', { name: /Crea Partita/ }));
      expect(screen.getByLabelText('Numero massimo giocatori')).toHaveAccessibleDescription('Da 2 a 10 giocatori');
      expect(gameService.createGame).not.toHaveBeenCalled();

      type('Numero massimo giocatori', '4');
      expect(screen.getByLabelText('Numero massimo giocatori')).toHaveDisplayValue('4');
    });

    test('a game made with retyped values is sent with numbers, not text', () => {
      gameService.createGame.mockResolvedValue({ gameId: 'g1' });
      renderWithProviders(<HallScreen />, { preloadedState: state() });
      openCreate();

      type('Crediti richiesti per partecipare', '');
      type('Crediti richiesti per partecipare', '40');
      type('Numero massimo giocatori', '');
      type('Numero massimo giocatori', '4');
      fireEvent.click(screen.getByRole('button', { name: /Crea Partita/ }));

      expect(gameService.createGame).toHaveBeenCalledWith(
        expect.objectContaining({ requiredCredits: 40, maxPlayers: 4 }),
      );
    });
  });

  describe('joining', () => {
    const lobby = { id: 'g1', creatorName: 'Carla', playerCount: 1, maxPlayers: 6, requiredCredits: 50 };
    const withLobby = (credits) => ({ ...state(credits), game: { ...state(credits).game, lobbies: [lobby] } });

    beforeEach(() => {
      gameService.getLobby.mockResolvedValue([lobby]);
    });

    test('a game says what it costs and what is left, before joining', () => {
      renderWithProviders(<HallScreen />, { preloadedState: withLobby(80) });

      expect(screen.getByText(/costa 50 crediti/)).toBeInTheDocument();
      expect(screen.getByText(/te ne restano 30/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Unisciti' })).toBeEnabled();
    });

    test('a game that costs more than the player has says how many credits are missing', () => {
      renderWithProviders(<HallScreen />, { preloadedState: withLobby(20) });

      expect(screen.getByText('Ti mancano 30 crediti')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Unisciti' })).toBeDisabled();
    });

    test('the two exits have different names', () => {
      renderWithProviders(<HallScreen />, { preloadedState: state() });

      expect(screen.getByRole('button', { name: "Esci dall'account" })).toBeInTheDocument();
    });

    describe('a private game', () => {
      const openJoin = () => fireEvent.click(screen.getByRole('button', { name: /Unisciti a Partita Privata/ }));

      test('a wrong code is explained in the field, which keeps what was typed', async () => {
        gameService.joinGame.mockRejectedValue(new Error('Partita non trovata: controlla il codice'));
        renderWithProviders(<HallScreen />, { preloadedState: state() });
        openJoin();

        fireEvent.change(screen.getByLabelText('Codice Partita'), { target: { value: 'abc123' } });
        fireEvent.click(screen.getByRole('button', { name: 'Unisciti' }));

        await waitFor(() =>
          expect(screen.getByLabelText('Codice Partita')).toHaveAccessibleDescription('Partita non trovata: controlla il codice'),
        );
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByLabelText('Codice Partita')).toHaveValue('abc123');
      });

      test('an empty code is asked for in the field', () => {
        renderWithProviders(<HallScreen />, { preloadedState: state() });
        openJoin();

        fireEvent.click(screen.getByRole('button', { name: 'Unisciti' }));

        expect(screen.getByLabelText('Codice Partita')).toHaveAccessibleDescription('Inserisci il codice della partita');
        expect(gameService.joinGame).not.toHaveBeenCalled();
      });
    });
  });

  test('without games waiting it invites to create one', () => {
    renderWithProviders(<HallScreen />, { preloadedState: state() });

    expect(screen.getByText(/Nessuna partita in attesa/)).toBeInTheDocument();
  });

  test('a very long name does not break the header', () => {
    const long = 'A'.repeat(80);
    renderWithProviders(<HallScreen />, { preloadedState: { ...state(), player: { id: 'p1', name: long, credits: 100 } } });

    expect(screen.getByText(new RegExp(long)).className).toMatch(/break-words/);
  });
});
