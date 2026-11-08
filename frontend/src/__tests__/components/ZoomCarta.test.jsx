import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ZoomCarta from '../../components/game/ZoomCarta';

const carta = { valore: 'Re', seme: 'Coppe' };

describe('ZoomCarta', () => {
  it('shows the big card in a dialog named after it', () => {
    render(<ZoomCarta carta={carta} onClose={() => {}} />);

    expect(screen.getByRole('dialog', { name: 'Re di Coppe' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Re di Coppe' })).toHaveAttribute('src', '/carte/coppe-re.webp');
  });

  it('says what the card is for the player when a state is given', () => {
    render(<ZoomCarta carta={carta} stato="Coperta" onClose={() => {}} />);

    expect(screen.getByText('Coperta')).toBeInTheDocument();
  });

  it('closes with the button and with Esc', () => {
    const onClose = vi.fn();
    render(<ZoomCarta carta={carta} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: 'Chiudi' }));
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('has no arrows when there is nothing to go to', () => {
    render(<ZoomCarta carta={carta} onClose={() => {}} />);

    expect(screen.queryByRole('button', { name: /Più recente|Meno recente/ })).not.toBeInTheDocument();
  });

  it('goes to the neighbours with the arrows and with the arrow keys', () => {
    const onPiuRecente = vi.fn();
    const onMenoRecente = vi.fn();
    render(
      <ZoomCarta carta={carta} onClose={() => {}} onPiuRecente={onPiuRecente} onMenoRecente={onMenoRecente} posizione="2 di 5" />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Più recente' }));
    fireEvent.click(screen.getByRole('button', { name: 'Meno recente' }));
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });

    expect(onPiuRecente).toHaveBeenCalledTimes(2);
    expect(onMenoRecente).toHaveBeenCalledTimes(2);
    expect(screen.getByText('2 di 5')).toBeInTheDocument();
  });

  it('keeps the name when the picture is missing', () => {
    render(<ZoomCarta carta={carta} onClose={() => {}} />);

    fireEvent.error(screen.getByRole('img', { name: 'Re di Coppe' }));

    expect(screen.getAllByText('Re di Coppe').length).toBeGreaterThan(0);
  });
});
