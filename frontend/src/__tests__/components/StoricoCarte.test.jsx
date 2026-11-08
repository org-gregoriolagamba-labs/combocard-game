import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import StoricoCarte from '../../components/game/StoricoCarte';

const USCITE = [
  { valore: 'Asso', seme: 'Denari' },
  { valore: 'Sei', seme: 'Spade' },
  { valore: 'Re', seme: 'Coppe' },
];

describe('StoricoCarte', () => {
  it('says how many cards are out, out of the 40 of the deck', () => {
    render(<StoricoCarte estratte={USCITE} />);

    expect(screen.getByRole('button', { name: /Carte uscite/ })).toHaveTextContent('3 su 40');
  });

  it('is closed until it is opened', () => {
    render(<StoricoCarte estratte={USCITE} />);
    const toggle = screen.getByRole('button', { name: /Carte uscite/ });

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('list')).not.toBeInTheDocument();

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('list')).toBeInTheDocument();
  });

  it('lists the cards by name, the latest first', () => {
    render(<StoricoCarte estratte={USCITE} />);
    fireEvent.click(screen.getByRole('button', { name: /Carte uscite/ }));

    const nomi = within(screen.getByRole('list')).getAllByRole('listitem').map((li) => li.textContent);

    expect(nomi).toEqual(['Re di Coppe', 'Sei di Spade', 'Asso di Denari']);
  });

  it('says so when no card is out yet', () => {
    render(<StoricoCarte estratte={[]} />);
    fireEvent.click(screen.getByRole('button', { name: /Carte uscite/ }));

    expect(screen.getByText('Nessuna carta è ancora uscita.')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('keeps the card in the list, with its name, when its picture is missing', () => {
    render(<StoricoCarte estratte={USCITE} />);
    fireEvent.click(screen.getByRole('button', { name: /Carte uscite/ }));
    expect(document.querySelectorAll('img')).toHaveLength(3);

    fireEvent.error(document.querySelectorAll('img')[0]);

    expect(document.querySelectorAll('img')).toHaveLength(2);
    expect(within(screen.getByRole('list')).getAllByRole('listitem')[0]).toHaveTextContent('Re di Coppe');
  });

  describe('zoom on request', () => {
    const apri = () => {
      render(<StoricoCarte estratte={USCITE} />);
      fireEvent.click(screen.getByRole('button', { name: /Carte uscite/ }));
    };

    it('a card of the list is a button that opens it big', () => {
      apri();

      fireEvent.click(screen.getByRole('button', { name: 'Sei di Spade' }));

      expect(screen.getByRole('dialog', { name: 'Sei di Spade' })).toBeInTheDocument();
    });

    it('the arrows go to the next card, older or newer, and stop at the ends', () => {
      apri();
      fireEvent.click(screen.getByRole('button', { name: 'Re di Coppe' }));

      expect(screen.queryByRole('button', { name: 'Più recente' })).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Meno recente' }));
      expect(screen.getByRole('dialog', { name: 'Sei di Spade' })).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Meno recente' }));
      expect(screen.getByRole('dialog', { name: 'Asso di Denari' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Meno recente' })).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Più recente' }));
      expect(screen.getByRole('dialog', { name: 'Sei di Spade' })).toBeInTheDocument();
    });

    it('closing gives the focus back to the card that was opened', () => {
      apri();
      const miniatura = screen.getByRole('button', { name: 'Sei di Spade' });
      miniatura.focus();
      fireEvent.click(miniatura);

      fireEvent.click(screen.getByRole('button', { name: 'Chiudi' }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(miniatura).toHaveFocus();
    });
  });
});
