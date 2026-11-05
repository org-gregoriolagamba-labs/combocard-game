import React from 'react';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AdminScreen } from '../../../components/admin';
import { renderWithProviders } from '../../test-utils';
import * as adminService from '../../../services/adminService';
import { adminState, anna, carlo, dario, failure, pageOf } from './fixtures';

vi.mock('../../../services/adminService');

describe('AdminScreen: the adjustment of the credits', () => {
  beforeEach(() => {
    adminService.listUsers.mockResolvedValue(pageOf([anna, carlo, dario]));
  });

  const open = async (name = 'Anna') => {
    const view = renderWithProviders(<AdminScreen />, { preloadedState: adminState() });
    fireEvent.click(await screen.findByRole('button', { name: `Rettifica crediti di ${name}` }));
    view.dialog = await screen.findByRole('dialog', { name: `Rettifica crediti di ${name}` });
    return view;
  };
  const type = (label, value) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
  const confirm = () => fireEvent.click(screen.getByRole('button', { name: 'Conferma rettifica' }));
  const message = (label) => screen.getByLabelText(label).getAttribute('aria-describedby');

  test('shows the balance, and what it will be', async () => {
    const { dialog } = await open();
    expect(dialog).toHaveTextContent('Saldo attuale: 100 crediti');

    type('Importo', '50');
    expect(dialog).toHaveTextContent('Saldo dopo: 150 crediti');

    fireEvent.click(screen.getByRole('radio', { name: 'Togli' }));
    type('Importo', '30');
    expect(dialog).toHaveTextContent('Saldo dopo: 70 crediti');
  });

  test('adds credits with a reason: sends the amount, closes, shows the new balance and says it', async () => {
    adminService.adjustCredits.mockResolvedValue({ playerId: 'p1', credits: 150 });
    const { store } = await open();

    type('Importo', '50');
    type('Motivo', 'regalo di benvenuto');
    confirm();

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(adminService.adjustCredits).toHaveBeenCalledWith('p1', { amount: 50, reason: 'regalo di benvenuto' });
    expect(within(screen.getByRole('list', { name: 'Utenti' })).getAllByRole('listitem')[0]).toHaveTextContent('150 crediti');
    expect(store.getState().ui.toasts.map((t) => t.message)).toContain('Crediti aggiornati: Anna ora ha 150 crediti');
  });

  test('takes credits away: the amount goes with a minus', async () => {
    adminService.adjustCredits.mockResolvedValue({ playerId: 'p1', credits: 70 });
    await open();

    fireEvent.click(screen.getByRole('radio', { name: 'Togli' }));
    type('Importo', '30');
    type('Motivo', 'correzione');
    confirm();

    await waitFor(() => expect(adminService.adjustCredits).toHaveBeenCalledWith('p1', { amount: -30, reason: 'correzione' }));
  });

  test('the reason is written without the spaces at the ends', async () => {
    adminService.adjustCredits.mockResolvedValue({ playerId: 'p1', credits: 110 });
    await open();

    type('Importo', '10');
    type('Motivo', '  prova  ');
    confirm();

    await waitFor(() => expect(adminService.adjustCredits).toHaveBeenCalledWith('p1', { amount: 10, reason: 'prova' }));
  });

  test.each([
    ['an empty amount', '', 'x', 'Scrivi un importo'],
    ['an amount of zero', '0', 'x', 'Scrivi un importo'],
    ['an amount over a million', '1000001', 'x', 'Al massimo 1.000.000 crediti per volta'],
    ['no reason', '10', '   ', 'Scrivi il motivo'],
  ])('%s is explained in the field, and nothing is sent', async (_name, amount, reason, text) => {
    await open();

    type('Importo', amount);
    type('Motivo', reason);
    confirm();

    const field = text === 'Scrivi il motivo' ? 'Motivo' : 'Importo';
    expect(document.getElementById(message(field))).toHaveTextContent(text);
    expect(adminService.adjustCredits).not.toHaveBeenCalled();
  });

  test('taking away more than the player has is explained with their balance, and nothing is sent', async () => {
    await open();

    fireEvent.click(screen.getByRole('radio', { name: 'Togli' }));
    type('Importo', '101');
    type('Motivo', 'x');
    confirm();

    expect(document.getElementById(message('Importo'))).toHaveTextContent('Il giocatore ha solo 100 crediti: non puoi toglierne di più');
    expect(adminService.adjustCredits).not.toHaveBeenCalled();
  });

  test('the amount can be emptied and typed again, and starts empty', async () => {
    await open();
    expect(screen.getByLabelText('Importo')).toHaveDisplayValue('');

    type('Importo', '250');
    type('Importo', '');
    expect(screen.getByLabelText('Importo')).toHaveDisplayValue('');

    type('Importo', '7');
    expect(screen.getByLabelText('Importo')).toHaveDisplayValue('7');
  });

  test('what the server says is shown in the dialog, which stays open, and the balance does not change', async () => {
    adminService.adjustCredits.mockRejectedValue(failure('Il giocatore non ha abbastanza crediti'));
    await open();

    fireEvent.click(screen.getByRole('radio', { name: 'Togli' }));
    type('Importo', '30');
    type('Motivo', 'x');
    confirm();

    expect(await screen.findByRole('alert')).toHaveTextContent('Il giocatore non ha abbastanza crediti');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Utenti' })).getAllByRole('listitem')[0]).toHaveTextContent('100 crediti');
  });

  test('a double tap sends it once', async () => {
    adminService.adjustCredits.mockReturnValue(new Promise(() => {}));
    await open();
    type('Importo', '10');
    type('Motivo', 'x');

    confirm();
    confirm();

    expect(adminService.adjustCredits).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: /Conferma rettifica|Invio in corso/ })).toBeDisabled();
  });

  test('"Annulla" and Esc close it without sending anything', async () => {
    await open();
    fireEvent.click(screen.getByRole('button', { name: 'Annulla' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Rettifica crediti di Anna' }));
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(adminService.adjustCredits).not.toHaveBeenCalled();
  });

  test('the admin can correct their own credits: the dialog says it is about themselves', async () => {
    adminService.adjustCredits.mockResolvedValue({ playerId: 'p3', credits: 500 });
    const { dialog, store } = await open('Dario');
    expect(dialog).toHaveTextContent('Stai rettificando i tuoi crediti');

    type('Importo', '500');
    type('Motivo', 'prove');
    confirm();

    await waitFor(() => expect(adminService.adjustCredits).toHaveBeenCalledWith('p3', { amount: 500, reason: 'prove' }));
    await waitFor(() => expect(store.getState().player.credits).toBe(500));
  });
});
