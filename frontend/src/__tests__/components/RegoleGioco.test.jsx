import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RegoleGioco } from '../../components/game';

const game = {
  montepremi: 200,
  collezioniDistribuzione: { tris: 20, sequenza: 30, scopa: 40, napola: 50, combocard_reale: 60 },
};

describe('RegoleGioco', () => {
  test('explains the game in sections: aim, how a game goes, the sheet, collections, the jolly, the end', () => {
    render(<RegoleGioco game={game} />);

    for (const titolo of ['Lo scopo', 'Come funziona una partita', 'La cartella', 'Le collezioni', 'Il Jolly', 'Come finisce']) {
      expect(screen.getByRole('heading', { name: titolo })).toBeInTheDocument();
    }
  });

  test('says how a game goes: who draws, how often, and that the sheet covers by itself', () => {
    render(<RegoleGioco game={game} />);

    expect(screen.getByText(/Estrae una carta alla volta/)).toHaveTextContent('8 secondi');
    expect(screen.getByText(/si copre da sola con un sigillo/)).toBeInTheDocument();
    expect(screen.getByText(/formano il montepremi/)).toBeInTheDocument();
  });

  test('gives the rule of each collection, with the share of the pot this game really uses', () => {
    render(<RegoleGioco game={game} />);

    expect(screen.getByText(/Tris/, { selector: 'strong' }).closest('li')).toHaveTextContent('(10% del montepremi)');
    expect(screen.getByText(/Combocard Reale/, { selector: 'strong' }).closest('li')).toHaveTextContent('(30% del montepremi)');
    expect(screen.getByText(/Dopo il Re non si riparte dall'Asso/)).toBeInTheDocument();
  });

  test('without the game it still gives the rules, only without percentages', () => {
    render(<RegoleGioco />);

    expect(screen.getByText(/tre carte coperte con lo stesso valore \(una riga/)).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent('% del montepremi');
  });

  test('says that a collection is won once, and shared when it is completed together', () => {
    render(<RegoleGioco game={game} />);

    expect(screen.getByText(/una volta sola per partita/)).toHaveTextContent('si dividono il premio');
  });

  test('says how the game ends and what happens to the credits', () => {
    render(<RegoleGioco game={game} />);

    const fine = screen.getByText(/La partita finisce quando qualcuno completa la Combocard Reale/);
    expect(fine).toHaveTextContent('si dividono in parti uguali tra tutti i giocatori');
    expect(fine).toHaveTextContent('perdi i crediti d');
  });

  test('explains the turns, the time limit and the cards of discipline', () => {
    render(<RegoleGioco game={game} />);

    expect(screen.getByText(/a turno tutti i giocatori/)).toBeInTheDocument();
    expect(screen.getByText(/cartellino giallo/)).toBeInTheDocument();
    expect(screen.getByText(/cartellino rosso/)).toBeInTheDocument();
  });
});
