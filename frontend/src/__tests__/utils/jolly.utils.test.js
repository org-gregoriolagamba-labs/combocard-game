import { anteprimaJolly, carteConJolly } from '../../utils/jolly.utils';

const c = (valore, seme, valoreNum) => ({ valore, seme, valoreNum });
const NUM = { Asso: 1, Due: 2, Tre: 3, Quattro: 4, Cinque: 5, Sei: 6, Sette: 7, Fante: 8, Cavallo: 9, Re: 10 };
const k = (valore, seme) => c(valore, seme, NUM[valore]);

// A small sheet: the rows have different lengths, which the functions do not care about
const sheet = (carte, coperti) => ({
  cartella: [carte],
  coperte: [carte.map((x) => coperti.includes(`${x.valore}|${x.seme}`))],
});

describe('anteprimaJolly: what the jolly turns a card into', () => {
  test('tris: two covered cards of the same value, the jolly takes that value and keeps its suit', () => {
    const { cartella, coperte } = sheet(
      [k('Sei', 'Spade'), k('Sei', 'Coppe'), k('Asso', 'Denari')],
      ['Sei|Spade', 'Sei|Coppe']
    );

    expect(anteprimaJolly(cartella, coperte, 0, 2, 'tris')).toEqual({ valore: 'Sei', seme: 'Denari' });
  });

  test('tris: not possible when the card it would become is already in the sheet', () => {
    const { cartella, coperte } = sheet(
      [k('Sei', 'Spade'), k('Sei', 'Coppe'), k('Sei', 'Denari'), k('Asso', 'Denari')],
      ['Sei|Spade', 'Sei|Coppe']
    );

    expect(anteprimaJolly(cartella, coperte, 0, 3, 'tris')).toBeNull();
  });

  test('tris: not possible with only one covered card of a value', () => {
    const { cartella, coperte } = sheet([k('Sei', 'Spade'), k('Asso', 'Denari')], ['Sei|Spade']);

    expect(anteprimaJolly(cartella, coperte, 0, 1, 'tris')).toBeNull();
  });

  test('sequenza: three of four consecutive values covered, the jolly becomes the missing one in its suit', () => {
    const { cartella, coperte } = sheet(
      [k('Due', 'Spade'), k('Tre', 'Coppe'), k('Cinque', 'Denari'), k('Re', 'Bastoni')],
      ['Due|Spade', 'Tre|Coppe', 'Cinque|Denari']
    );

    expect(anteprimaJolly(cartella, coperte, 0, 3, 'sequenza')).toEqual({ valore: 'Quattro', seme: 'Bastoni' });
  });

  test('scopa: four covered cards of one suit, the jolly keeps its value and takes the suit', () => {
    const { cartella, coperte } = sheet(
      [k('Asso', 'Spade'), k('Due', 'Spade'), k('Tre', 'Spade'), k('Quattro', 'Spade'), k('Re', 'Coppe')],
      ['Asso|Spade', 'Due|Spade', 'Tre|Spade', 'Quattro|Spade']
    );

    expect(anteprimaJolly(cartella, coperte, 0, 4, 'scopa')).toEqual({ valore: 'Re', seme: 'Spade' });
  });

  test('napola: a tris and a single, the single becomes a pair', () => {
    const { cartella, coperte } = sheet(
      [k('Sei', 'Spade'), k('Sei', 'Coppe'), k('Sei', 'Denari'), k('Re', 'Spade'), k('Asso', 'Bastoni')],
      ['Sei|Spade', 'Sei|Coppe', 'Sei|Denari', 'Re|Spade']
    );

    expect(anteprimaJolly(cartella, coperte, 0, 4, 'napola')).toEqual({ valore: 'Re', seme: 'Bastoni' });
  });

  test('napola: two pairs, one becomes a tris', () => {
    const { cartella, coperte } = sheet(
      [k('Sei', 'Spade'), k('Sei', 'Coppe'), k('Re', 'Spade'), k('Re', 'Coppe'), k('Asso', 'Bastoni')],
      ['Sei|Spade', 'Sei|Coppe', 'Re|Spade', 'Re|Coppe']
    );

    expect(anteprimaJolly(cartella, coperte, 0, 4, 'napola')).not.toBeNull();
  });

  test('combocard reale: three of four consecutive in one suit, the jolly becomes the missing card of that suit', () => {
    const { cartella, coperte } = sheet(
      [k('Due', 'Spade'), k('Tre', 'Spade'), k('Cinque', 'Spade'), k('Re', 'Coppe')],
      ['Due|Spade', 'Tre|Spade', 'Cinque|Spade']
    );

    expect(anteprimaJolly(cartella, coperte, 0, 3, 'combocard_reale')).toEqual({ valore: 'Quattro', seme: 'Spade' });
  });

  test('nothing is possible when the collection is more than one card away', () => {
    const { cartella, coperte } = sheet([k('Sei', 'Spade'), k('Asso', 'Coppe')], []);

    expect(anteprimaJolly(cartella, coperte, 0, 1, 'tris')).toBeNull();
    expect(anteprimaJolly(cartella, coperte, 0, 1, 'combocard_reale')).toBeNull();
  });
});

describe('carteConJolly: which uncovered cards could be turned', () => {
  test('lists each uncovered card with what it would become, and never a covered one', () => {
    const { cartella, coperte } = sheet(
      [k('Sei', 'Spade'), k('Sei', 'Coppe'), k('Asso', 'Denari'), k('Re', 'Bastoni')],
      ['Sei|Spade', 'Sei|Coppe']
    );

    const risultato = carteConJolly(cartella, coperte, 'tris');

    expect(risultato.map((x) => [x.row, x.col])).toEqual([[0, 2], [0, 3]]);
    expect(risultato[0].conversione).toEqual({ valore: 'Sei', seme: 'Denari' });
  });

  test('is empty when the collection is too far', () => {
    const { cartella, coperte } = sheet([k('Sei', 'Spade'), k('Asso', 'Coppe')], []);

    expect(carteConJolly(cartella, coperte, 'tris')).toEqual([]);
  });
});
