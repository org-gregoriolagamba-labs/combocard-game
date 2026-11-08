import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Cartella } from '../../components/game';
import { calcolaProgresso } from '../../utils';

const carta = { valore: 'Asso', seme: 'Spade', emoji: '⚔️', valoreNum: 1 };
const griglia = [[carta]];

describe('Cartella', () => {
  test('without optional props it renders, and a click does nothing', () => {
    render(<Cartella cartella={griglia} coperte={[[false]]} />);

    fireEvent.click(screen.getByRole('button', { name: 'Asso di Spade' }));

    expect(screen.queryByText('JOLLY')).not.toBeInTheDocument();
  });

  test('in jolly mode a click without a handler uses the default and does not throw', () => {
    render(<Cartella cartella={griglia} coperte={[[false]]} jollyMode="tris" />);

    expect(() => fireEvent.click(screen.getByRole('button', { name: 'Asso di Spade' }))).not.toThrow();
  });

  test('in jolly mode a click on an uncovered card calls the handler with its place in the player grid', () => {
    const onCardClick = vi.fn();
    render(
      <Cartella cartella={griglia} coperte={[[false]]} jollyMode="tris" onCardClick={onCardClick} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Asso di Spade' }));

    expect(onCardClick).toHaveBeenCalledWith(0, 0);
  });

  describe('laid out like a tombola sheet', () => {
    test('is a table: ten rows of values and four columns of suits', () => {
      render(<Cartella cartella={griglia} coperte={[[false]]} />);

      expect(screen.getAllByRole('columnheader').map((th) => th.textContent)).toEqual([
        'Denari', 'Coppe', 'Spade', 'Bastoni',
      ]);
      expect(screen.getAllByRole('rowheader')).toHaveLength(10);
      expect(screen.getAllByRole('rowheader')[0]).toHaveTextContent('Asso');
      expect(screen.getAllByRole('rowheader')[9]).toHaveTextContent('Re');
    });

    test('a card sits in the row of its value and the column of its suit, wherever it is in the player grid', () => {
      const re = { valore: 'Re', seme: 'Coppe', valoreNum: 10 };
      render(<Cartella cartella={[[carta, re]]} coperte={[[false, false]]} />);

      const rigaRe = screen.getByRole('rowheader', { name: /Re/ }).closest('tr');
      expect(within(rigaRe).getByRole('button', { name: 'Re di Coppe' })).toBeInTheDocument();
      const rigaAsso = screen.getByRole('rowheader', { name: /Asso/ }).closest('tr');
      expect(within(rigaAsso).getByRole('button', { name: 'Asso di Spade' })).toBeInTheDocument();
    });

    test('the places of the cards that are not in the sheet are empty and have no button', () => {
      render(<Cartella cartella={griglia} coperte={[[false]]} />);

      expect(screen.getAllByRole('button')).toHaveLength(1);
    });
  });

  describe('a card drawn that is not in the sheet', () => {
    const uscita = { valore: 'Re', seme: 'Coppe' };

    test('is named for screen readers: drawn, and not in your sheet', () => {
      render(<Cartella cartella={griglia} coperte={[[false]]} estratte={[uscita]} />);

      expect(screen.getByText('Re di Coppe: uscita, non è nella tua cartella')).toBeInTheDocument();
    });

    test('has a visible mark of its own, not only a colour', () => {
      render(<Cartella cartella={griglia} coperte={[[false]]} estratte={[uscita]} />);

      expect(screen.getByTestId('uscita-senza-te')).toBeInTheDocument();
      expect(screen.getAllByTestId('uscita-senza-te')).toHaveLength(1);
    });

    test('an empty place whose card has not come out has neither the mark nor the name', () => {
      render(<Cartella cartella={griglia} coperte={[[false]]} />);

      expect(screen.queryByTestId('uscita-senza-te')).not.toBeInTheDocument();
      expect(screen.queryByText(/non è nella tua cartella/)).not.toBeInTheDocument();
    });

    test('a card of the sheet that came out gets no such mark', () => {
      render(<Cartella cartella={griglia} coperte={[[true]]} estratte={[carta]} />);

      expect(screen.queryByTestId('uscita-senza-te')).not.toBeInTheDocument();
    });
  });

  describe('each card is a button with its name', () => {
    test('named by value and suit', () => {
      render(<Cartella cartella={griglia} coperte={[[false]]} />);

      expect(screen.getByRole('button', { name: 'Asso di Spade' })).toBeInTheDocument();
    });

    test('a covered card says so, and has no text drawn over it', () => {
      render(<Cartella cartella={griglia} coperte={[[true]]} jollyMode="tris" />);

      expect(screen.getByRole('button', { name: 'Asso di Spade, coperta' })).toBeDisabled();
      expect(screen.queryByText(/Estratta/)).not.toBeInTheDocument();
    });

    test('outside the jolly mode no card can be activated', () => {
      render(<Cartella cartella={griglia} coperte={[[false]]} />);

      expect(screen.getByRole('button', { name: 'Asso di Spade' })).toBeDisabled();
    });

    test('in jolly mode only the uncovered cards can be activated', () => {
      const due = [[carta, { ...carta, valore: 'Re' }]];
      render(<Cartella cartella={due} coperte={[[false, true]]} jollyMode="tris" />);

      expect(screen.getByRole('button', { name: 'Asso di Spade' })).toBeEnabled();
      expect(screen.getByRole('button', { name: 'Re di Spade, coperta' })).toBeDisabled();
    });

    test('with the list of the possible cards, only those can be activated', () => {
      const due = [[carta, { ...carta, valore: 'Re', valoreNum: 10 }]];
      render(
        <Cartella cartella={due} coperte={[[false, false]]} jollyMode="tris" possibili={[{ row: 0, col: 1 }]} />,
      );

      expect(screen.getByRole('button', { name: 'Re di Spade' })).toBeEnabled();
      expect(screen.getByRole('button', { name: 'Asso di Spade' })).toBeDisabled();
    });

    test('once the jolly is used no card can be activated', () => {
      render(<Cartella cartella={griglia} coperte={[[false]]} jollyMode="tris" jollyUsato />);

      expect(screen.getByRole('button', { name: 'Asso di Spade' })).toBeDisabled();
    });

    test('the chosen card is marked as pressed', () => {
      render(
        <Cartella
          cartella={griglia}
          coperte={[[false]]}
          jollyMode="tris"
          selected={{ row: 0, col: 0 }}
        />,
      );

      expect(screen.getByRole('button', { name: 'Asso di Spade' })).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('the sheet shows how near a figure is', () => {
    const sei = (seme) => ({ valore: 'Sei', seme, valoreNum: 6 });
    const tre = (seme) => ({ valore: 'Tre', seme, valoreNum: 3 });

    test('a row with two covered cards of one value shows 2/3, a tris being three', () => {
      render(<Cartella cartella={[[sei('Spade'), sei('Coppe'), tre('Spade')]]} coperte={[[true, true, false]]} />);

      const riga = screen.getByRole('rowheader', { name: /Sei/ });
      expect(riga).toHaveTextContent('2/3');
      expect(screen.getByRole('rowheader', { name: /Tre/ })).not.toHaveTextContent('/3');
    });

    test('a column with three covered cards of one suit shows 3/5, a scopa being five', () => {
      const carte = [['Asso', 1], ['Due', 2], ['Tre', 3], ['Re', 10]].map(([valore, valoreNum]) => ({ valore, seme: 'Spade', valoreNum }));
      render(<Cartella cartella={[carte]} coperte={[[true, true, true, false]]} />);

      expect(screen.getByRole('columnheader', { name: /Spade/ })).toHaveTextContent('3/5');
      expect(screen.getByRole('columnheader', { name: /Coppe/ })).not.toHaveTextContent('/5');
    });
  });

  describe('the corner of the sheet shows how near the figures across the rows are', () => {
    const spade = (valore, valoreNum) => ({ valore, seme: 'Spade', valoreNum });
    const sequenza3 = [spade('Asso', 1), spade('Due', 2), spade('Tre', 3), spade('Re', 10)];

    test('three consecutive values covered show SEQ 3/4 and REALE 3/4 when they are of one suit', () => {
      render(<Cartella cartella={[sequenza3]} coperte={[[true, true, true, false]]} />);

      expect(screen.getByText('SEQ 3/4')).toBeInTheDocument();
      expect(screen.getByText('REALE 3/4')).toBeInTheDocument();
      expect(screen.getByText('Sequenza: 3 carte su 4')).toBeInTheDocument();
      expect(screen.getByText('Combocard reale: 3 carte su 4')).toBeInTheDocument();
    });

    test('a tris and a single of another value show NAPOLA 4/5', () => {
      const sei = (seme) => ({ valore: 'Sei', seme, valoreNum: 6 });
      const cartella = [[sei('Spade'), sei('Coppe'), sei('Denari'), { valore: 'Re', seme: 'Spade', valoreNum: 10 }]];
      render(<Cartella cartella={cartella} coperte={[[true, true, true, true]]} />);

      expect(screen.getByText('NAPOLA 4/5')).toBeInTheDocument();
    });

    test('a figure that is still far is not shown', () => {
      render(<Cartella cartella={[sequenza3]} coperte={[[true, false, false, false]]} />);

      expect(screen.queryByText(/^SEQ /)).not.toBeInTheDocument();
      expect(screen.queryByText(/NAPOLA/)).not.toBeInTheDocument();
      expect(screen.queryByText(/REALE/)).not.toBeInTheDocument();
    });

    test('a figure already won is not shown, the others are', () => {
      render(<Cartella cartella={[sequenza3]} coperte={[[true, true, true, false]]} vinte={['sequenza']} />);

      expect(screen.queryByText(/^SEQ /)).not.toBeInTheDocument();
      expect(screen.getByText('REALE 3/4')).toBeInTheDocument();
    });

    test('the numbers are the ones of the collections panel, on a full sheet', () => {
      const valori = ['Asso', 'Due', 'Tre', 'Quattro', 'Cinque', 'Sei', 'Sette', 'Fante', 'Cavallo', 'Re'];
      const mazzo = ['Spade', 'Coppe', 'Denari', 'Bastoni'].flatMap((seme) =>
        valori.map((valore, i) => ({ valore, seme, valoreNum: i + 1 })),
      );
      const venticinque = mazzo.slice(0, 25);
      const cartella = Array.from({ length: 5 }, (_, r) => venticinque.slice(r * 5, r * 5 + 5));
      const coperte = cartella.map((riga, r) => riga.map((_, c) => (r * 5 + c) % 3 !== 0));
      render(<Cartella cartella={cartella} coperte={coperte} />);

      const giocatore = { cartella, coperte };
      const attese = [['SEQ', 'sequenza'], ['NAPOLA', 'napola'], ['REALE', 'combocard_reale']];
      attese.forEach(([nome, tipo]) => {
        const { count, total } = calcolaProgresso(giocatore, tipo);
        const testo = `${nome} ${count}/${total}`;
        if (total - count <= 2) expect(screen.getByText(testo)).toBeInTheDocument();
        else expect(screen.queryByText(new RegExp(`^${nome} `))).not.toBeInTheDocument();
      });
    });
  });

  describe('every place shows the card itself', () => {
    const quattroDiSpade = { valore: 'Quattro', seme: 'Spade', emoji: '', valoreNum: 4 };
    const reDiCoppe = { valore: 'Re', seme: 'Coppe', emoji: '', valoreNum: 10 };

    test('is the small print of the real card, with the number of its row', () => {
      // Row 4 (the Quattro), column Spade: the place of the Quattro di Spade
      const { container } = render(<Cartella cartella={[[quattroDiSpade]]} coperte={[[false]]} />);
      const tessera = screen.getByRole('button', { name: 'Quattro di Spade' });

      expect(tessera.querySelector('img')).toHaveAttribute('src', '/carte-mini/spade-quattro.webp');
      expect(tessera).toHaveTextContent('4');
      // The suit art is no longer the only thing in the place: only the headers still use it
      expect(container.querySelectorAll('tbody img[src^="/semi/"]')).toHaveLength(0);
    });

    test('a figure carries the number of its row too (Re is the tenth)', () => {
      render(<Cartella cartella={[[reDiCoppe]]} coperte={[[false]]} />);
      const tessera = screen.getByRole('button', { name: 'Re di Coppe' });

      expect(tessera.querySelector('img')).toHaveAttribute('src', '/carte-mini/coppe-re.webp');
      expect(tessera).toHaveTextContent('10');
    });

    test('the number is the one printed on the row label', () => {
      render(<Cartella cartella={[[quattroDiSpade]]} coperte={[[false]]} />);
      const riga = screen.getByRole('rowheader', { name: /Quattro/ });

      expect(riga).toHaveTextContent('4');
      expect(riga).toHaveTextContent('Quattro');
    });

    test('a covered card keeps its print and shows the seal instead of the number', () => {
      render(<Cartella cartella={[[quattroDiSpade]]} coperte={[[true]]} />);
      const tessera = screen.getByRole('button', { name: 'Quattro di Spade, coperta' });

      expect(tessera.querySelector('img')).toHaveAttribute('src', '/carte-mini/spade-quattro.webp');
      expect(tessera).not.toHaveTextContent('4');
    });

    test('the print is decoration: the name of the button says the card', () => {
      render(<Cartella cartella={[[quattroDiSpade]]} coperte={[[false]]} />);
      const stampa = screen.getByRole('button', { name: 'Quattro di Spade' }).querySelector('img');

      expect(stampa).toHaveAttribute('alt', '');
      expect(stampa.closest('[aria-hidden="true"]')).not.toBeNull();
    });

    test('if the print cannot be loaded the number is still there', () => {
      render(<Cartella cartella={[[quattroDiSpade]]} coperte={[[false]]} />);
      const tessera = screen.getByRole('button', { name: 'Quattro di Spade' });

      fireEvent.error(tessera.querySelector('img'));

      expect(tessera.querySelector('img')).toBeNull();
      expect(tessera).toHaveTextContent('4');
    });
  });

  test('the jolly card is marked', () => {
    render(<Cartella cartella={griglia} coperte={[[false]]} jollyPos={{ row: 0, col: 0 }} />);

    expect(screen.getByText('JOLLY')).toBeInTheDocument();
  });
});
