import { celleVincenti } from '../../utils/vincite.utils';

const NUM = { Asso: 1, Due: 2, Tre: 3, Quattro: 4, Cinque: 5, Sei: 6, Sette: 7, Fante: 8, Cavallo: 9, Re: 10 };
const k = (valore, seme) => ({ valore, seme, valoreNum: NUM[valore] });
const sheet = (carte, coperti) => ({
  cartella: [carte],
  coperte: [carte.map((x) => coperti.includes(`${x.valore}|${x.seme}`))],
});
const colonne = (celle) => celle.map((c) => c.col).sort((a, b) => a - b);

describe('celleVincenti: the places that make a collection', () => {
  test('tris: three covered cards of one value', () => {
    const { cartella, coperte } = sheet(
      [k('Sei', 'Spade'), k('Sei', 'Coppe'), k('Sei', 'Denari'), k('Re', 'Spade')],
      ['Sei|Spade', 'Sei|Coppe', 'Sei|Denari', 'Re|Spade']
    );

    expect(colonne(celleVincenti(cartella, coperte, 'tris'))).toEqual([0, 1, 2]);
  });

  test('sequenza: one card for each of four consecutive values', () => {
    const { cartella, coperte } = sheet(
      [k('Due', 'Spade'), k('Tre', 'Coppe'), k('Quattro', 'Denari'), k('Cinque', 'Bastoni'), k('Re', 'Spade')],
      ['Due|Spade', 'Tre|Coppe', 'Quattro|Denari', 'Cinque|Bastoni']
    );

    expect(colonne(celleVincenti(cartella, coperte, 'sequenza'))).toEqual([0, 1, 2, 3]);
  });

  test('scopa: five covered cards of one suit', () => {
    const carte = ['Asso', 'Due', 'Tre', 'Quattro', 'Cinque', 'Re'].map((v) => k(v, 'Spade'));
    const { cartella, coperte } = sheet(carte, carte.slice(0, 5).map((x) => `${x.valore}|${x.seme}`));

    expect(celleVincenti(cartella, coperte, 'scopa')).toHaveLength(5);
  });

  test('napola: three of one value and two of another', () => {
    const { cartella, coperte } = sheet(
      [k('Sei', 'Spade'), k('Sei', 'Coppe'), k('Sei', 'Denari'), k('Re', 'Spade'), k('Re', 'Coppe'), k('Asso', 'Bastoni')],
      ['Sei|Spade', 'Sei|Coppe', 'Sei|Denari', 'Re|Spade', 'Re|Coppe']
    );

    expect(celleVincenti(cartella, coperte, 'napola')).toHaveLength(5);
  });

  test('combocard reale: four consecutive values of one suit', () => {
    const carte = ['Fante', 'Cavallo', 'Re', 'Sette'].map((v) => k(v, 'Coppe'));
    const { cartella, coperte } = sheet(carte, carte.map((x) => `${x.valore}|${x.seme}`));

    expect(celleVincenti(cartella, coperte, 'combocard_reale')).toHaveLength(4);
  });

  test('is empty when the collection is not complete', () => {
    const { cartella, coperte } = sheet([k('Sei', 'Spade'), k('Sei', 'Coppe')], ['Sei|Spade', 'Sei|Coppe']);

    expect(celleVincenti(cartella, coperte, 'tris')).toEqual([]);
    expect(celleVincenti(cartella, coperte, 'unknown')).toEqual([]);
  });
});
