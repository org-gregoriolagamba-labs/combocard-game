import { mappaCartella, VALORI_IN_ORDINE, SEMI_IN_ORDINE } from '../../utils/mazzo.utils';

const c = (valore, seme) => ({ valore, seme });

describe('mappaCartella', () => {
  const cartella = [
    [c('Sei', 'Spade'), c('Asso', 'Denari')],
    [c('Re', 'Bastoni'), c('Tre', 'Coppe')],
  ];
  const coperte = [[true, false], [false, true]];

  test('lays the whole deck out: ten rows of values, four columns of suits', () => {
    const mappa = mappaCartella(cartella, coperte);

    expect(mappa).toHaveLength(VALORI_IN_ORDINE.length);
    mappa.forEach((riga, i) => {
      expect(riga.map((p) => p.seme)).toEqual(SEMI_IN_ORDINE);
      expect(riga.every((p) => p.valore === VALORI_IN_ORDINE[i])).toBe(true);
    });
  });

  test('puts each card of the player in the place of its value and suit', () => {
    const mappa = mappaCartella(cartella, coperte);
    const sei = mappa[5][SEMI_IN_ORDINE.indexOf('Spade')];

    expect(sei.carta).toEqual(c('Sei', 'Spade'));
    expect(sei).toMatchObject({ row: 0, col: 0, coperta: true });
  });

  test('keeps the coordinates of the player grid, so the server is still called with them', () => {
    const mappa = mappaCartella(cartella, coperte);

    expect(mappa[9][SEMI_IN_ORDINE.indexOf('Bastoni')]).toMatchObject({ row: 1, col: 0, coperta: false });
    expect(mappa[2][SEMI_IN_ORDINE.indexOf('Coppe')]).toMatchObject({ row: 1, col: 1, coperta: true });
  });

  test('leaves empty the places of the cards that are not in the sheet', () => {
    const mappa = mappaCartella(cartella, coperte);
    const vuoti = mappa.flat().filter((p) => p.carta === null);

    expect(vuoti).toHaveLength(36);
    expect(vuoti[0]).toMatchObject({ row: null, col: null, coperta: false });
  });

  test('marks the places whose card has been drawn, mine or not', () => {
    const mappa = mappaCartella(cartella, coperte, [c('Due', 'Coppe'), c('Sei', 'Spade')]);

    expect(mappa[1][SEMI_IN_ORDINE.indexOf('Coppe')]).toMatchObject({ carta: null, estratta: true });
    expect(mappa[5][SEMI_IN_ORDINE.indexOf('Spade')].estratta).toBe(true);
    expect(mappa[0][0].estratta).toBe(false);
  });
});
