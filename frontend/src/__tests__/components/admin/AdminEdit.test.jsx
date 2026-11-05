import React from 'react';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AdminScreen } from '../../../components/admin';
import { renderWithProviders } from '../../test-utils';
import * as adminService from '../../../services/adminService';
import { adminState, anna, carlo, dario, failure, pageOf } from './fixtures';

vi.mock('../../../services/adminService');

describe('AdminScreen: rename and role', () => {
  beforeEach(() => {
    adminService.listUsers.mockResolvedValue(pageOf([anna, carlo, dario]));
  });

  const open = async (name = 'Anna') => {
    const view = renderWithProviders(<AdminScreen />, { preloadedState: adminState() });
    fireEvent.click(await screen.findByRole('button', { name: `Modifica ${name}` }));
    view.dialog = await screen.findByRole('dialog', { name: `Modifica ${name}` });
    return view;
  };
  const rename = (value) => fireEvent.change(screen.getByLabelText('Nuovo nome utente'), { target: { value } });
  const card = (index) => within(screen.getByRole('list', { name: 'Utenti' })).getAllByRole('listitem')[index];

  describe('the name', () => {
    test('starts with the current name, and cannot be saved until it changes', async () => {
      await open();

      expect(screen.getByLabelText('Nuovo nome utente')).toHaveDisplayValue('Anna');
      expect(screen.getByRole('button', { name: 'Salva nome' })).toBeDisabled();

      rename('Anna Rossi');
      expect(screen.getByRole('button', { name: 'Salva nome' })).toBeEnabled();
    });

    test('renames: sends the name, shows it in the list, says it', async () => {
      adminService.updateUser.mockResolvedValue({ ...anna, username: 'Anna Rossi' });
      const { store } = await open();

      rename('  Anna Rossi  ');
      fireEvent.click(screen.getByRole('button', { name: 'Salva nome' }));

      await waitFor(() => expect(adminService.updateUser).toHaveBeenCalledWith('p1', { username: 'Anna Rossi' }));
      await waitFor(() => expect(card(0)).toHaveTextContent('Anna Rossi'));
      expect(store.getState().ui.toasts.map((t) => t.message)).toContain('Nome cambiato: ora è Anna Rossi');
    });

    test('a name that is too short is explained in the field, and nothing is sent', async () => {
      await open();

      rename('ab');
      fireEvent.click(screen.getByRole('button', { name: 'Salva nome' }));

      const field = screen.getByLabelText('Nuovo nome utente');
      expect(document.getElementById(field.getAttribute('aria-describedby'))).toHaveTextContent('Almeno 3 caratteri');
      expect(adminService.updateUser).not.toHaveBeenCalled();
    });

    test('a name already in use is explained with what the server says, in the dialog', async () => {
      adminService.updateUser.mockRejectedValue(failure('Questo nome utente è già in uso'));
      await open();

      rename('Dario');
      fireEvent.click(screen.getByRole('button', { name: 'Salva nome' }));

      expect(await screen.findByRole('alert')).toHaveTextContent('Questo nome utente è già in uso');
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    test('a player in a game cannot be renamed: the field is off and says why', async () => {
      await open('Carlo Rossi');

      expect(screen.getByLabelText('Nuovo nome utente')).toBeDisabled();
      expect(screen.getByRole('dialog')).toHaveTextContent('Il giocatore è in una partita: il nome si può cambiare dopo');
      expect(screen.getByRole('button', { name: 'Salva nome' })).toBeDisabled();
    });
  });

  describe('the role', () => {
    test('shows the role, and the button for the other one', async () => {
      const { dialog } = await open();
      expect(dialog).toHaveTextContent('Ruolo attuale: Giocatore');
      expect(screen.getByRole('button', { name: 'Rendi admin' })).toBeInTheDocument();
    });

    test('asks to confirm before changing it, and "Annulla" sends nothing', async () => {
      await open();

      fireEvent.click(screen.getByRole('button', { name: 'Rendi admin' }));
      const confirm = await screen.findByRole('dialog', { name: 'Rendere admin Anna?' });
      fireEvent.click(within(confirm).getByRole('button', { name: 'Annulla' }));

      expect(adminService.updateUser).not.toHaveBeenCalled();
    });

    test('makes an admin: sends the role, and the list shows it', async () => {
      adminService.updateUser.mockResolvedValue({ ...anna, role: 'admin' });
      const { store } = await open();

      fireEvent.click(screen.getByRole('button', { name: 'Rendi admin' }));
      fireEvent.click(within(await screen.findByRole('dialog', { name: 'Rendere admin Anna?' })).getByRole('button', { name: 'Sì, conferma' }));

      await waitFor(() => expect(adminService.updateUser).toHaveBeenCalledWith('p1', { role: 'admin' }));
      await waitFor(() => expect(card(0)).toHaveTextContent('Admin'));
      expect(store.getState().ui.toasts.map((t) => t.message)).toContain('Anna ora è admin');
    });

    test('makes a player of another admin', async () => {
      adminService.listUsers.mockResolvedValue(pageOf([anna, { ...carlo, role: 'admin', inGame: false }, dario]));
      adminService.updateUser.mockResolvedValue({ ...carlo, role: 'player', inGame: false });
      await open('Carlo Rossi');

      fireEvent.click(screen.getByRole('button', { name: 'Rendi giocatore' }));
      fireEvent.click(within(await screen.findByRole('dialog', { name: 'Rendere giocatore Carlo Rossi?' })).getByRole('button', { name: 'Sì, conferma' }));

      await waitFor(() => expect(adminService.updateUser).toHaveBeenCalledWith('p2', { role: 'player' }));
    });

    test('the last admin cannot be demoted: the server says so in the dialog', async () => {
      adminService.updateUser.mockRejectedValue(failure("Non si può togliere il ruolo all'ultimo admin"));
      await open('Dario');

      fireEvent.click(screen.getByRole('button', { name: 'Rendi giocatore' }));
      fireEvent.click(within(await screen.findByRole('dialog', { name: 'Rendere giocatore Dario?' })).getByRole('button', { name: 'Sì, conferma' }));

      expect(await screen.findByRole('alert')).toHaveTextContent("Non si può togliere il ruolo all'ultimo admin");
    });

    test('an admin who demotes themselves is warned, and then leaves the admin area', async () => {
      adminService.updateUser.mockResolvedValue({ ...dario, role: 'player' });
      const { store } = await open('Dario');

      fireEvent.click(screen.getByRole('button', { name: 'Rendi giocatore' }));
      const confirm = await screen.findByRole('dialog', { name: 'Rendere giocatore Dario?' });
      expect(confirm).toHaveTextContent("Perderai l'accesso all'amministrazione");
      fireEvent.click(within(confirm).getByRole('button', { name: 'Sì, conferma' }));

      await waitFor(() => expect(store.getState().player.role).toBe('player'));
      expect(store.getState().ui.currentScreen).toBe('hall');
    });
  });
});
