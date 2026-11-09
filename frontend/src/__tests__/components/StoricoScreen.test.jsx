import React from 'react';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StoricoScreen } from '../../components/game';
import { renderWithProviders } from '../test-utils';
import * as meService from '../../services/meService';

vi.mock('../../services/meService');

const stato = () => ({ player: { id: 'p1', name: 'Anna', credits: 500 }, ui: { currentScreen: 'storico', toasts: [] } });

const movimento = (n, extra = {}) => ({
  id: n,
  tipo: 'game_entry',
  importo: -100,
  saldoDopo: 400,
  data: '2026-03-05T10:30:00.000Z',
  partita: { id: 'g1', creatore: 'Bruno' },
  ...extra,
});

const pagina = (items, total = items.length) => ({ disponibile: true, items, total, page: 1, limit: 20 });

const statistiche = {
  partiteGiocate: 12,
  partiteConCollezione: 5,
  partiteVinte: 2,
  collezioniVinte: { tris: 3, sequenza: 1, scopa: 2, napola: 0, combocard_reale: 2 },
  creditiSpesi: 1200,
  creditiVinti: 1500,
  saldoNetto: 300,
  incassoMassimo: 420,
};

describe('StoricoScreen', () => {
  beforeEach(() => {
    meService.getMovements.mockReset();
    meService.getStats.mockReset();
    meService.getMovements.mockResolvedValue(pagina([movimento(1)]));
    meService.getStats.mockResolvedValue({ disponibile: true, statistiche });
  });

  test('has the two sections, and opens on the movements', async () => {
    renderWithProviders(<StoricoScreen />, { preloadedState: stato() });

    expect(screen.getByRole('heading', { name: 'Storico e statistiche' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Movimenti' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Statistiche' })).toHaveAttribute('aria-selected', 'false');
    await screen.findByRole('list', { name: 'Movimenti' });
  });

  test('goes back to the hall', () => {
    const { store } = renderWithProviders(<StoricoScreen />, { preloadedState: stato() });

    fireEvent.click(screen.getByRole('button', { name: /Torna alla hall/ }));

    expect(store.getState().ui.currentScreen).toBe('hall');
  });

  describe('the movements', () => {
    test('each one says what it is, the game, the amount with its sign, and the balance after', async () => {
      meService.getMovements.mockResolvedValue(pagina([
        movimento(1, { tipo: 'game_payout', importo: 150, saldoDopo: 550 }),
        movimento(2),
        movimento(3, { tipo: 'purchase', importo: 500, saldoDopo: 500, partita: null }),
      ]));
      renderWithProviders(<StoricoScreen />, { preloadedState: stato() });

      const righe = within(await screen.findByRole('list', { name: 'Movimenti' })).getAllByRole('listitem');

      expect(righe[0]).toHaveTextContent('Premio');
      expect(righe[0]).toHaveTextContent('Partita di Bruno');
      expect(righe[0]).toHaveTextContent('+150');
      expect(righe[0]).toHaveTextContent('Saldo 550');
      expect(righe[1]).toHaveTextContent("Quota d'ingresso");
      expect(righe[1]).toHaveTextContent('−100');
      expect(righe[2]).toHaveTextContent('Crediti presi');
      expect(righe[2]).not.toHaveTextContent('Partita');
    });

    test.each([
      ['initial', 'Crediti iniziali'],
      ['purchase', 'Crediti presi'],
      ['game_entry', "Quota d'ingresso"],
      ['game_payout', 'Premio'],
      ['game_refund', 'Rimborso'],
      ['admin_adjustment', "Rettifica dell'amministrazione"],
      ['account_closed', 'Account chiuso'],
    ])('the type %s is %s', async (tipo, testo) => {
      meService.getMovements.mockResolvedValue(pagina([movimento(1, { tipo, partita: null })]));
      renderWithProviders(<StoricoScreen />, { preloadedState: stato() });

      expect(await screen.findByText(testo, { selector: 'p, span' })).toBeInTheDocument();
    });

    test('shows the date and time of each one', async () => {
      renderWithProviders(<StoricoScreen />, { preloadedState: stato() });

      const ora = await screen.findByText(/2026/);
      expect(ora.tagName).toBe('TIME');
      expect(ora).toHaveAttribute('dateTime', '2026-03-05T10:30:00.000Z');
    });

    test('says so when there is nothing yet', async () => {
      meService.getMovements.mockResolvedValue(pagina([]));
      renderWithProviders(<StoricoScreen />, { preloadedState: stato() });

      expect(await screen.findByText('Nessun movimento')).toBeInTheDocument();
    });

    test('without the database it says that the history is not available', async () => {
      meService.getMovements.mockResolvedValue({ disponibile: false });
      renderWithProviders(<StoricoScreen />, { preloadedState: stato() });

      expect(await screen.findByText(/disponibile solo quando il server usa il database/)).toBeInTheDocument();
      expect(screen.queryByRole('list', { name: 'Movimenti' })).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Tipo')).not.toBeInTheDocument();
    });

    test('a failure is shown and can be tried again', async () => {
      meService.getMovements.mockRejectedValueOnce(new Error('Errore di rete'));
      renderWithProviders(<StoricoScreen />, { preloadedState: stato() });

      expect(await screen.findByRole('alert')).toHaveTextContent('Errore di rete');
      fireEvent.click(screen.getByRole('button', { name: 'Riprova' }));

      await screen.findByRole('list', { name: 'Movimenti' });
      expect(meService.getMovements).toHaveBeenCalledTimes(2);
    });

    test('is paged', async () => {
      meService.getMovements.mockResolvedValue(pagina([movimento(1)], 45));
      renderWithProviders(<StoricoScreen />, { preloadedState: stato() });
      await screen.findByText('Pagina 1 di 3');

      fireEvent.click(screen.getByRole('button', { name: 'Pagina successiva' }));

      await waitFor(() => expect(meService.getMovements).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })));
    });

    test('can be filtered by type, from the first page', async () => {
      meService.getMovements.mockResolvedValue(pagina([movimento(1)], 45));
      renderWithProviders(<StoricoScreen />, { preloadedState: stato() });
      await screen.findByText('Pagina 1 di 3');
      fireEvent.click(screen.getByRole('button', { name: 'Pagina successiva' }));
      await screen.findByText('Pagina 2 di 3');

      fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'game_payout' } });

      await waitFor(() => expect(meService.getMovements).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'game_payout', page: 1 })));
    });

    test('can be filtered by period: the whole first and last day', async () => {
      renderWithProviders(<StoricoScreen />, { preloadedState: stato() });
      await screen.findByRole('list', { name: 'Movimenti' });

      fireEvent.change(screen.getByLabelText('Dal'), { target: { value: '2026-03-01' } });
      fireEvent.change(screen.getByLabelText('Al'), { target: { value: '2026-03-31' } });

      await waitFor(() => {
        const ultima = meService.getMovements.mock.calls.at(-1)[0];
        expect(new Date(ultima.from).getTime()).toBe(new Date('2026-03-01T00:00:00').getTime());
        expect(new Date(ultima.to).getTime()).toBe(new Date('2026-03-31T23:59:59.999').getTime());
      });
    });
  });

  describe('the statistics', () => {
    const apri = async () => {
      renderWithProviders(<StoricoScreen />, { preloadedState: stato() });
      fireEvent.click(screen.getByRole('tab', { name: 'Statistiche' }));
    };

    test('show the games, the collections, the credits and the best prize', async () => {
      await apri();

      const pannello = await screen.findByRole('tabpanel');
      await within(pannello).findByText('Partite giocate');
      expect(pannello).toHaveTextContent(/Partite giocate\s*12/);
      expect(pannello).toHaveTextContent(/Partite con almeno una collezione\s*5/);
      expect(pannello).toHaveTextContent(/Combocard Reale vinte\s*2/);
      expect(pannello).toHaveTextContent(/Tris\s*3/);
      expect(pannello).toHaveTextContent(/Scopa\s*2/);
      expect(pannello).toHaveTextContent(/Napola\s*0/);
      expect(pannello).toHaveTextContent(/Crediti spesi\s*1200/);
      expect(pannello).toHaveTextContent(/Crediti vinti\s*1500/);
      expect(pannello).toHaveTextContent(/Bilancio\s*\+300/);
      expect(pannello).toHaveTextContent(/Incasso più alto in una partita\s*420/);
    });

    test('a negative balance is written with its sign', async () => {
      meService.getStats.mockResolvedValue({ disponibile: true, statistiche: { ...statistiche, saldoNetto: -70 } });
      await apri();

      expect(await screen.findByText(/−70/)).toBeInTheDocument();
    });

    test('without the database it says that the statistics are not available', async () => {
      meService.getStats.mockResolvedValue({ disponibile: false });
      await apri();

      expect(await screen.findByText(/disponibili solo quando il server usa il database/)).toBeInTheDocument();
    });

    test('a failure is shown and can be tried again', async () => {
      meService.getStats.mockRejectedValueOnce(new Error('Errore di rete'));
      await apri();

      expect(await screen.findByRole('alert')).toHaveTextContent('Errore di rete');
      fireEvent.click(screen.getByRole('button', { name: 'Riprova' }));

      await screen.findByText('Partite giocate');
    });
  });
});
