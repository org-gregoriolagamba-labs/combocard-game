import React from 'react';
import { screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AdminScreen } from '../../../components/admin';
import { renderWithProviders } from '../../test-utils';
import * as adminService from '../../../services/adminService';
import { adminState, anna, carlo, dario, pageOf } from './fixtures';

vi.mock('../../../services/adminService');

const event = (id, action, details, who = {}) => ({
  id,
  action,
  actorType: 'player',
  actorId: 'p3',
  actorName: 'Dario',
  targetId: 'p1',
  targetName: 'Anna',
  details,
  createdAt: '2026-11-05T10:30:00.000Z',
  ...who,
});

const EVENTS = [
  event(5, 'credits_adjusted', { amount: 50, reason: 'regalo' }),
  event(4, 'credits_adjusted', { amount: -20, reason: 'prove' }, { targetId: 'p3', targetName: 'Dario' }),
  event(3, 'role_changed', { from: 'player', to: 'admin' }, { actorType: 'system', actorId: null, actorName: null, targetId: 'p3', targetName: 'Dario' }),
  event(2, 'role_changed', { from: 'admin', to: 'player' }, { targetName: 'Carlo Rossi', targetId: 'p2' }),
  event(1, 'username_changed', { from: 'Carlo Rossi', to: 'Carlo Bianchi' }, { targetId: 'p2', targetName: 'Carlo Bianchi' }),
];

describe('AdminScreen: the audit log', () => {
  beforeEach(() => {
    adminService.listUsers.mockResolvedValue(pageOf([anna, carlo, dario]));
    adminService.listAudit.mockResolvedValue(pageOf(EVENTS));
  });

  const openRegistro = async () => {
    const view = renderWithProviders(<AdminScreen />, { preloadedState: adminState() });
    fireEvent.click(await screen.findByRole('tab', { name: 'Registro' }));
    view.list = await screen.findByRole('list', { name: 'Azioni registrate' });
    return view;
  };

  test('has two tabs, the users first', async () => {
    renderWithProviders(<AdminScreen />, { preloadedState: adminState() });

    const tabs = await screen.findAllByRole('tab');

    expect(tabs.map((t) => t.textContent)).toEqual(['Utenti', 'Registro']);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(adminService.listAudit).not.toHaveBeenCalled();
  });

  test('the Registro tab asks for the first page and tells each action as a sentence', async () => {
    const { list } = await openRegistro();

    expect(adminService.listAudit).toHaveBeenCalledWith(expect.objectContaining({ page: 1, limit: 20 }));
    const sentences = within(list).getAllByRole('listitem').map((li) => li.textContent);
    expect(sentences[0]).toContain('Dario ha aggiunto 50 crediti al saldo di Anna: «regalo»');
    expect(sentences[1]).toContain('Dario ha tolto 20 crediti dal proprio saldo: «prove»');
    expect(sentences[2]).toContain('Il sistema ha reso admin Dario');
    expect(sentences[3]).toContain('Dario ha reso giocatore Carlo Rossi');
    expect(sentences[4]).toContain('Dario ha cambiato il nome di Carlo Rossi in Carlo Bianchi');
  });

  test('every action has its time', async () => {
    const { list } = await openRegistro();

    const time = within(list).getAllByRole('listitem')[0].querySelector('time');

    expect(time).toHaveAttribute('dateTime', '2026-11-05T10:30:00.000Z');
  });

  test('somebody the game does not know is "un utente", never an empty name', async () => {
    adminService.listAudit.mockResolvedValue(pageOf([event(9, 'credits_adjusted', { amount: 5, reason: 'x' }, { actorName: null, targetName: null })]));

    const { list } = await openRegistro();

    expect(within(list).getByRole('listitem')).toHaveTextContent('Un utente ha aggiunto 5 crediti al saldo di un utente: «x»');
  });

  test('says when nothing was done yet', async () => {
    adminService.listAudit.mockResolvedValue(pageOf([], 0));
    renderWithProviders(<AdminScreen />, { preloadedState: adminState() });

    fireEvent.click(await screen.findByRole('tab', { name: 'Registro' }));

    expect(await screen.findByText('Nessuna azione registrata')).toBeInTheDocument();
  });

  test('has pages like the users', async () => {
    adminService.listAudit.mockResolvedValue(pageOf(EVENTS, 45, 1, 20));
    await openRegistro();

    expect(screen.getByText('Pagina 1 di 3')).toBeInTheDocument();
    adminService.listAudit.mockResolvedValue(pageOf(EVENTS, 45, 2, 20));
    fireEvent.click(screen.getByRole('button', { name: 'Pagina successiva' }));

    expect(await screen.findByText('Pagina 2 di 3')).toBeInTheDocument();
    expect(adminService.listAudit).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }));
  });

  test('going back to the users shows the list again', async () => {
    await openRegistro();

    fireEvent.click(screen.getByRole('tab', { name: 'Utenti' }));

    expect(await screen.findByRole('list', { name: 'Utenti' })).toBeInTheDocument();
  });
});
