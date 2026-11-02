import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BarraAzione } from '../../components/game';

const base = {
  isCreator: true,
  creatorName: 'Anna',
  status: 'playing',
  drawCooldown: 0,
  jollyMode: null,
  onDraw: () => {},
  jollyPending: null,
  onCancelJolly: () => {},
  onConfirmJolly: () => {},
  onChangeJollyCard: () => {},
  onLeave: () => {},
};

describe('BarraAzione', () => {
  describe('creator of the game', () => {
    test('can draw a card', () => {
      const onDraw = jest.fn();
      render(<BarraAzione {...base} onDraw={onDraw} />);

      fireEvent.click(screen.getByRole('button', { name: /Estrai Carta/ }));

      expect(onDraw).toHaveBeenCalledTimes(1);
    });

    test('during the wait it shows the seconds left and cannot draw', () => {
      const onDraw = jest.fn();
      render(<BarraAzione {...base} drawCooldown={5} onDraw={onDraw} />);

      const button = screen.getByRole('button', { name: /Attendi 5s/ });
      fireEvent.click(button);

      expect(button).toBeDisabled();
      expect(onDraw).not.toHaveBeenCalled();
    });

    test('cannot draw while the game is not in play', () => {
      render(<BarraAzione {...base} status="waiting" />);

      expect(screen.getByRole('button', { name: /Estrai Carta/ })).toBeDisabled();
    });
  });

  describe('other players', () => {
    test('see who draws instead of a disabled button', () => {
      render(<BarraAzione {...base} isCreator={false} />);

      expect(screen.getByText(/Estrae Anna/)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Estrai Carta/ })).not.toBeInTheDocument();
    });
  });

  describe('jolly mode', () => {
    test('says which collection it is for and can be cancelled', () => {
      const onCancelJolly = jest.fn();
      render(<BarraAzione {...base} jollyMode="combocard_reale" onCancelJolly={onCancelJolly} />);

      expect(screen.getByText(/Jolly per COMBOCARD REALE/)).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Annulla' }));

      expect(onCancelJolly).toHaveBeenCalledTimes(1);
    });

    test('the creator can still draw while choosing the card', () => {
      render(<BarraAzione {...base} jollyMode="tris" />);

      expect(screen.getByRole('button', { name: /Estrai Carta/ })).toBeEnabled();
    });

    test('another player sees the instruction too', () => {
      render(<BarraAzione {...base} isCreator={false} jollyMode="tris" />);

      expect(screen.getByText(/Jolly per TRIS/)).toBeInTheDocument();
    });
  });

  describe('jolly confirmation', () => {
    const pending = { valore: 'Sei', seme: 'Spade' };

    test('asks about the chosen card by name instead of by coordinates', () => {
      render(<BarraAzione {...base} jollyMode="tris" jollyPending={pending} />);

      expect(screen.getByText(/Usare il Jolly per TRIS sulla carta Sei di Spade\?/)).toBeInTheDocument();
      expect(screen.queryByText(/tocca una carta non coperta/)).not.toBeInTheDocument();
    });

    test('"Usa Jolly" confirms', () => {
      const onConfirmJolly = jest.fn();
      render(<BarraAzione {...base} jollyMode="tris" jollyPending={pending} onConfirmJolly={onConfirmJolly} />);

      fireEvent.click(screen.getByRole('button', { name: 'Usa Jolly' }));

      expect(onConfirmJolly).toHaveBeenCalledTimes(1);
    });

    test('"Cambia carta" goes back to choosing without leaving the mode', () => {
      const onChangeJollyCard = jest.fn();
      const onCancelJolly = jest.fn();
      render(
        <BarraAzione {...base} jollyMode="tris" jollyPending={pending}
          onChangeJollyCard={onChangeJollyCard} onCancelJolly={onCancelJolly} />,
      );

      fireEvent.click(screen.getByRole('button', { name: 'Cambia carta' }));

      expect(onChangeJollyCard).toHaveBeenCalledTimes(1);
      expect(onCancelJolly).not.toHaveBeenCalled();
    });

    test('Esc while confirming goes back to choosing', () => {
      const onChangeJollyCard = jest.fn();
      const onCancelJolly = jest.fn();
      render(
        <BarraAzione {...base} jollyMode="tris" jollyPending={pending}
          onChangeJollyCard={onChangeJollyCard} onCancelJolly={onCancelJolly} />,
      );

      fireEvent.keyDown(screen.getByRole('group', { name: 'Conferma Jolly' }), { key: 'Escape' });

      expect(onChangeJollyCard).toHaveBeenCalledTimes(1);
      expect(onCancelJolly).not.toHaveBeenCalled();
    });

    test('Esc while choosing leaves the jolly mode', () => {
      const onCancelJolly = jest.fn();
      render(<BarraAzione {...base} jollyMode="tris" onCancelJolly={onCancelJolly} />);

      fireEvent.keyDown(screen.getByRole('group', { name: 'Modalità Jolly' }), { key: 'Escape' });

      expect(onCancelJolly).toHaveBeenCalledTimes(1);
    });

    test('the focus goes to the button that answers the current question', () => {
      const { rerender } = render(<BarraAzione {...base} jollyMode="tris" />);
      expect(screen.getByRole('button', { name: 'Annulla' })).toHaveFocus();

      rerender(<BarraAzione {...base} jollyMode="tris" jollyPending={pending} />);

      expect(screen.getByRole('button', { name: 'Usa Jolly' })).toHaveFocus();
    });

    test('the question is announced to screen readers', () => {
      render(<BarraAzione {...base} jollyMode="tris" jollyPending={pending} />);

      expect(screen.getByText(/Usare il Jolly per TRIS/)).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('finished game', () => {
    test('offers the way back to the hall and nothing else', () => {
      const onLeave = jest.fn();
      render(<BarraAzione {...base} status="finished" jollyMode="tris" onLeave={onLeave} />);

      expect(screen.getByText(/PARTITA TERMINATA/)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Estrai Carta/ })).not.toBeInTheDocument();
      expect(screen.queryByText(/Jolly per/)).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /Torna alla Hall/ }));

      expect(onLeave).toHaveBeenCalledTimes(1);
    });
  });

  describe('panel variant (wide screens)', () => {
    test('suggests using the wait to evaluate the jolly', () => {
      render(<BarraAzione {...base} variant="panel" drawCooldown={3} />);

      expect(screen.getByText(/Usa questo tempo per valutare il Jolly/)).toBeInTheDocument();
    });

    test('the bar variant does not repeat the suggestion', () => {
      render(<BarraAzione {...base} variant="bar" drawCooldown={3} />);

      expect(screen.queryByText(/Usa questo tempo/)).not.toBeInTheDocument();
    });
  });
});
