import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BarraAzione } from '../../components/game';

const base = {
  puoEstrarre: true,
  chiEstrae: 'Anna',
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
      const onDraw = vi.fn();
      render(<BarraAzione {...base} onDraw={onDraw} />);

      fireEvent.click(screen.getByRole('button', { name: /Estrai Carta/ }));

      expect(onDraw).toHaveBeenCalledTimes(1);
    });

    test('during the wait it shows the seconds left and cannot draw', () => {
      const onDraw = vi.fn();
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
      render(<BarraAzione {...base} puoEstrarre={false} />);

      expect(screen.getByText(/Estrae Anna/)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Estrai Carta/ })).not.toBeInTheDocument();
    });
  });

  describe('jolly mode', () => {
    test('says which collection it is for and can be cancelled', () => {
      const onCancelJolly = vi.fn();
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
      render(<BarraAzione {...base} puoEstrarre={false} jollyMode="tris" />);

      expect(screen.getByText(/Jolly per TRIS/)).toBeInTheDocument();
    });
  });

  describe('jolly confirmation', () => {
    const pending = { valore: 'Sei', seme: 'Spade' };

    test('asks about the chosen card by name instead of by coordinates', () => {
      render(<BarraAzione {...base} jollyMode="tris" jollyPending={pending} />);

      expect(screen.getByText(/Per TRIS, il Jolly cambia Sei di Spade/)).toBeInTheDocument();
      expect(screen.queryByText(/tocca una carta evidenziata/)).not.toBeInTheDocument();
    });

    test('says which card it becomes, so the rule is not a secret', () => {
      render(
        <BarraAzione
          {...base}
          jollyMode="tris"
          jollyPending={pending}
          jollyConversione={{ valore: 'Sei', seme: 'Denari' }}
        />,
      );

      expect(
        screen.getByText('Per TRIS, il Jolly cambia Sei di Spade in Sei di Denari. Usarlo?'),
      ).toBeInTheDocument();
    });

    test('while choosing it says how many cards can be turned', () => {
      render(<BarraAzione {...base} jollyMode="tris" jollyScelte={3} />);

      expect(screen.getByText(/Jolly per TRIS: tocca una carta evidenziata \(3\)/)).toBeInTheDocument();
    });

    test('"Usa Jolly" confirms', () => {
      const onConfirmJolly = vi.fn();
      render(<BarraAzione {...base} jollyMode="tris" jollyPending={pending} onConfirmJolly={onConfirmJolly} />);

      fireEvent.click(screen.getByRole('button', { name: 'Usa Jolly' }));

      expect(onConfirmJolly).toHaveBeenCalledTimes(1);
    });

    test('"Cambia carta" goes back to choosing without leaving the mode', () => {
      const onChangeJollyCard = vi.fn();
      const onCancelJolly = vi.fn();
      render(
        <BarraAzione {...base} jollyMode="tris" jollyPending={pending}
          onChangeJollyCard={onChangeJollyCard} onCancelJolly={onCancelJolly} />,
      );

      fireEvent.click(screen.getByRole('button', { name: 'Cambia carta' }));

      expect(onChangeJollyCard).toHaveBeenCalledTimes(1);
      expect(onCancelJolly).not.toHaveBeenCalled();
    });

    test('Esc while confirming goes back to choosing', () => {
      const onChangeJollyCard = vi.fn();
      const onCancelJolly = vi.fn();
      render(
        <BarraAzione {...base} jollyMode="tris" jollyPending={pending}
          onChangeJollyCard={onChangeJollyCard} onCancelJolly={onCancelJolly} />,
      );

      fireEvent.keyDown(screen.getByRole('group', { name: 'Conferma Jolly' }), { key: 'Escape' });

      expect(onChangeJollyCard).toHaveBeenCalledTimes(1);
      expect(onCancelJolly).not.toHaveBeenCalled();
    });

    test('Esc while choosing leaves the jolly mode', () => {
      const onCancelJolly = vi.fn();
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

      expect(screen.getByText(/Per TRIS, il Jolly cambia/)).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('while a player chooses the jolly card', () => {
    const scadenza = Date.now() + 25_000;
    const altro = { nome: 'Bruno', scadenza, mia: false };

    test('the creator cannot draw and is told why', () => {
      const onDraw = vi.fn();
      render(<BarraAzione {...base} pausa={altro} onDraw={onDraw} />);

      const bottone = screen.getByRole('button', { name: /Estrazione in pausa/ });
      fireEvent.click(bottone);

      expect(bottone).toBeDisabled();
      expect(onDraw).not.toHaveBeenCalled();
      expect(screen.queryByRole('button', { name: /Estrai Carta/ })).not.toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent('Bruno sta scegliendo il Jolly');
    });

    test('another player is told who is choosing, and still sees who draws', () => {
      render(<BarraAzione {...base} puoEstrarre={false} pausa={altro} />);

      expect(screen.getByText(/Bruno sta scegliendo il Jolly/)).toBeInTheDocument();
      expect(screen.getByText(/Estrae Anna/)).toBeInTheDocument();
    });

    test('the seconds left are shown, and are hidden from screen readers', () => {
      render(<BarraAzione {...base} pausa={altro} />);

      const secondi = screen.getByText(/^\d+ s$/);

      expect(secondi).toHaveAttribute('aria-hidden', 'true');
      expect(Number.parseInt(secondi.textContent, 10)).toBeGreaterThan(20);
    });

    test('the player who chooses sees the time to choose, and the draw waits for them too', () => {
      render(
        <BarraAzione
          {...base}
          jollyMode="tris"
          jollyScelte={3}
          pausa={{ nome: 'Anna', scadenza, mia: true }}
        />,
      );

      expect(screen.getByText(/Le estrazioni sono ferme: hai ancora/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Estrazione in pausa/ })).toBeDisabled();
      // The player is not told "who is choosing": it is the player
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    test('with no pause nothing about it is shown', () => {
      render(<BarraAzione {...base} pausa={null} />);

      expect(screen.queryByText(/sta scegliendo il Jolly/)).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Estrai Carta/ })).toBeEnabled();
    });
  });

  describe('finished game', () => {
    test('offers the way back to the hall and nothing else', () => {
      const onLeave = vi.fn();
      render(<BarraAzione {...base} status="finished" jollyMode="tris" onLeave={onLeave} />);

      expect(screen.getByText(/Partita terminata/)).toBeInTheDocument();
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

  describe('drawing by turns', () => {
    const adesso = Date.now();
    const turno = (secondi, extra = {}) => ({ scadenza: adesso + secondi * 1000, sospeso: false, restanteMs: secondi * 1000, ...extra });

    test('everybody sees who is drawing and the time left', () => {
      render(<BarraAzione {...base} puoEstrarre={false} chiEstrae="Marta" turno={turno(54)} />);

      expect(screen.getByText(/Estrae Marta/)).toBeInTheDocument();
      expect(screen.getByTestId('conto-turno')).toHaveTextContent(/0:5[34]/);
    });

    test('the player on turn draws, with the time left beside the button', () => {
      const onDraw = vi.fn();
      render(<BarraAzione {...base} puoEstrarre chiEstrae="Anna" turno={turno(30)} onDraw={onDraw} />);

      fireEvent.click(screen.getByRole('button', { name: /Estrai Carta/ }));

      expect(onDraw).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('conto-turno')).toHaveTextContent(/0:(29|30)/);
    });

    test('the time stops while the jolly is chosen', () => {
      render(<BarraAzione {...base} puoEstrarre={false} chiEstrae="Marta" turno={turno(54, { sospeso: true, restanteMs: 41_000 })} />);

      expect(screen.getByTestId('conto-turno')).toHaveTextContent('0:41');
    });

    test('a player with a red card is told, and cannot draw', () => {
      render(<BarraAzione {...base} puoEstrarre={false} espulso chiEstrae="Marta" turno={turno(54)} />);

      expect(screen.getByText(/Cartellino rosso/)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Estrai Carta/ })).not.toBeInTheDocument();
      expect(screen.getByText(/Estrae Marta/)).toBeInTheDocument();
    });

    test('with no turn (the classic mode) there is no countdown', () => {
      render(<BarraAzione {...base} />);

      expect(screen.queryByTestId('conto-turno')).not.toBeInTheDocument();
    });
  });
});
