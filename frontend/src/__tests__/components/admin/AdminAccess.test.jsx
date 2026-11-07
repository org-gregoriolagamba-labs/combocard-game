import React from 'react';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AdminScreen } from '../../../components/admin';
import { renderWithProviders } from '../../test-utils';
import * as adminService from '../../../services/adminService';
import { adminState, anna, carlo, dario, failure, pageOf } from './fixtures';

vi.mock('../../../services/adminService');

const suspendedAnna = { ...anna, suspended: true };

describe('AdminScreen: suspension and sessions', () => {
  beforeEach(() => {
    adminService.listUsers.mockResolvedValue(pageOf([anna, carlo, dario]));
  });

  const open = async (name = 'Anna') => {
    const view = renderWithProviders(<AdminScreen />, { preloadedState: adminState() });
    fireEvent.click(await screen.findByRole('button', { name: `Accesso di ${name}` }));
    view.dialog = await screen.findByRole('dialog', { name: `Accesso di ${name}` });
    return view;
  };
  const reason = (value) => fireEvent.change(screen.getByLabelText('Motivo'), { target: { value } });
  const row = (n) => within(screen.getByRole('list', { name: 'Utenti' })).getAllByRole('listitem')[n];

  test('a suspended user is marked in the list', async () => {
    adminService.listUsers.mockResolvedValue(pageOf([suspendedAnna, carlo]));
    renderWithProviders(<AdminScreen />, { preloadedState: adminState() });

    await screen.findByRole('list', { name: 'Utenti' });

    expect(row(0)).toHaveTextContent('Sospeso');
    expect(row(1)).not.toHaveTextContent('Sospeso');
  });

  test('the admin has no access button on their own row: they cannot suspend themselves', async () => {
    renderWithProviders(<AdminScreen />, { preloadedState: adminState() });
    await screen.findByRole('list', { name: 'Utenti' });

    expect(screen.queryByRole('button', { name: 'Accesso di Dario' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Accesso di Anna' })).toBeInTheDocument();
  });

  test('an active user can be suspended or have the sessions closed, not reinstated', async () => {
    const { dialog } = await open();

    expect(within(dialog).getByRole('button', { name: "Sospendi l'accesso" })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Chiudi le sessioni' })).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: "Riabilita l'accesso" })).not.toBeInTheDocument();
  });

  test('suspends with a reason: sends it, closes, marks the user and says it', async () => {
    adminService.suspendUser.mockResolvedValue({ ...anna, suspended: true });
    const { store } = await open();

    reason('  abuso  ');
    fireEvent.click(screen.getByRole('button', { name: "Sospendi l'accesso" }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(adminService.suspendUser).toHaveBeenCalledWith('p1', { reason: 'abuso' });
    expect(row(0)).toHaveTextContent('Sospeso');
    expect(store.getState().ui.toasts.map((t) => t.message)).toContain('Accesso sospeso: Anna');
  });

  test('closes the sessions with a reason, and the user stays as they were', async () => {
    adminService.revokeSessions.mockResolvedValue({ ...anna, suspended: false });
    const { store } = await open();

    reason('furto');
    fireEvent.click(screen.getByRole('button', { name: 'Chiudi le sessioni' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(adminService.revokeSessions).toHaveBeenCalledWith('p1', { reason: 'furto' });
    expect(row(0)).not.toHaveTextContent('Sospeso');
    expect(store.getState().ui.toasts.map((t) => t.message)).toContain('Sessioni chiuse: Anna');
  });

  test('a suspended user can only be reinstated', async () => {
    adminService.listUsers.mockResolvedValue(pageOf([suspendedAnna, carlo, dario]));
    adminService.unsuspendUser.mockResolvedValue({ ...anna, suspended: false });
    const { dialog, store } = await open();

    expect(within(dialog).queryByRole('button', { name: "Sospendi l'accesso" })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Chiudi le sessioni' })).not.toBeInTheDocument();
    reason('chiarito');
    fireEvent.click(within(dialog).getByRole('button', { name: "Riabilita l'accesso" }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(adminService.unsuspendUser).toHaveBeenCalledWith('p1', { reason: 'chiarito' });
    expect(row(0)).not.toHaveTextContent('Sospeso');
    expect(store.getState().ui.toasts.map((t) => t.message)).toContain('Accesso riabilitato: Anna');
  });

  test('without a reason nothing is sent, and the field explains', async () => {
    await open();

    reason('   ');
    fireEvent.click(screen.getByRole('button', { name: "Sospendi l'accesso" }));

    expect(document.getElementById(screen.getByLabelText('Motivo').getAttribute('aria-describedby'))).toHaveTextContent('Scrivi il motivo');
    expect(adminService.suspendUser).not.toHaveBeenCalled();
    expect(adminService.revokeSessions).not.toHaveBeenCalled();
  });

  test('an error of the server is shown in the dialog, which stays open', async () => {
    adminService.suspendUser.mockRejectedValue(failure("Non si può sospendere l'ultimo admin", 409));
    await open();

    reason('x');
    fireEvent.click(screen.getByRole('button', { name: "Sospendi l'accesso" }));

    expect(await screen.findByRole('alert')).toHaveTextContent("Non si può sospendere l'ultimo admin");
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(row(0)).not.toHaveTextContent('Sospeso');
  });

  test('a double tap sends it once', async () => {
    adminService.suspendUser.mockImplementation(() => new Promise(() => {}));
    await open();

    reason('abuso');
    const button = screen.getByRole('button', { name: "Sospendi l'accesso" });
    fireEvent.click(button);
    fireEvent.click(button);

    expect(adminService.suspendUser).toHaveBeenCalledTimes(1);
  });

  test('"Indietro" closes the dialog and sends nothing', async () => {
    await open();

    fireEvent.click(screen.getByRole('button', { name: 'Indietro' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(adminService.suspendUser).not.toHaveBeenCalled();
  });

  describe('the reset of the password', () => {
    const temporary = 'K7QM-X2PD-9WJT';

    test('is offered for an active user and for a suspended one, never on the own row', async () => {
      const { dialog } = await open();
      expect(within(dialog).getByRole('button', { name: 'Reimposta la password' })).toBeInTheDocument();
    });

    test('is offered also for a suspended user', async () => {
      adminService.listUsers.mockResolvedValue(pageOf([suspendedAnna, carlo, dario]));
      const { dialog } = await open();

      expect(within(dialog).getByRole('button', { name: 'Reimposta la password' })).toBeInTheDocument();
    });

    test('needs a reason, and sends nothing without it', async () => {
      await open();

      reason('  ');
      fireEvent.click(screen.getByRole('button', { name: 'Reimposta la password' }));

      expect(document.getElementById(screen.getByLabelText('Motivo').getAttribute('aria-describedby'))).toHaveTextContent('Scrivi il motivo');
      expect(adminService.resetPassword).not.toHaveBeenCalled();
    });

    test('shows the temporary password once, says to give it to the user, and the dialog stays until it is closed', async () => {
      adminService.resetPassword.mockResolvedValue({ user: anna, temporaryPassword: temporary });
      const { store } = await open();

      reason('dimenticata');
      fireEvent.click(screen.getByRole('button', { name: 'Reimposta la password' }));

      const dialog = await screen.findByRole('dialog', { name: 'Accesso di Anna' });
      expect(adminService.resetPassword).toHaveBeenCalledWith('p1', { reason: 'dimenticata' });
      expect(within(dialog).getByLabelText('Password provvisoria')).toHaveTextContent(temporary);
      expect(dialog).toHaveTextContent('non sarà più visibile');
      expect(within(dialog).queryByLabelText('Motivo')).not.toBeInTheDocument();
      expect(within(dialog).queryByRole('button', { name: "Sospendi l'accesso" })).not.toBeInTheDocument();
      expect(store.getState().ui.toasts.map((t) => t.message)).toContain('Password reimpostata: Anna');

      fireEvent.click(within(dialog).getByRole('button', { name: 'Fatto' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.queryByText(temporary)).not.toBeInTheDocument();
    });

    test('the password is not in the toast nor anywhere in the page once the dialog is closed', async () => {
      adminService.resetPassword.mockResolvedValue({ user: anna, temporaryPassword: temporary });
      const { store } = await open();
      reason('x');
      fireEvent.click(screen.getByRole('button', { name: 'Reimposta la password' }));
      fireEvent.click(await screen.findByRole('button', { name: 'Fatto' }));

      expect(document.body).not.toHaveTextContent(temporary);
      expect(JSON.stringify(store.getState())).not.toContain(temporary);
    });

    test('an error of the server is shown in the dialog, which stays open', async () => {
      adminService.resetPassword.mockRejectedValue(failure('Utente non trovato', 404));
      await open();

      reason('x');
      fireEvent.click(screen.getByRole('button', { name: 'Reimposta la password' }));

      expect(await screen.findByRole('alert')).toHaveTextContent('Utente non trovato');
      expect(screen.getByLabelText('Motivo')).toBeInTheDocument();
    });

    test('a double tap sends it once', async () => {
      adminService.resetPassword.mockImplementation(() => new Promise(() => {}));
      await open();

      reason('x');
      const button = screen.getByRole('button', { name: 'Reimposta la password' });
      fireEvent.click(button);
      fireEvent.click(button);

      expect(adminService.resetPassword).toHaveBeenCalledTimes(1);
    });
  });
});
