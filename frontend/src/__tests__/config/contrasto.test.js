/**
 * Contrast of the palette (WCAG 2.2): text 4.5:1, the border that is the only sign of a control 3:1.
 * It reads the tokens of tailwind.config.cjs, so a colour changed there is checked here.
 */

import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { theme } = require('../../../tailwind.config.cjs');
const c = theme.extend.colors;

const luminanza = (hex) => {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrasto = (a, b) => {
  const [chiaro, scuro] = [luminanza(a), luminanza(b)].sort((x, y) => y - x);
  return (chiaro + 0.05) / (scuro + 0.05);
};

// The grounds on which text and controls sit
const fondi = { 'notte-950': c.notte[950], 'notte-900': c.notte[900], 'notte-800': c.notte[800], 'notte-700': c.notte[700] };

describe('contrast of the palette', () => {
  test.each(Object.entries(fondi))('the border of a control (linea-forte) has 3:1 on %s', (_, fondo) => {
    expect(contrasto(c.linea.forte, fondo)).toBeGreaterThanOrEqual(3);
  });

  test.each(Object.entries(fondi))('the text colours have 4.5:1 on %s', (_, fondo) => {
    for (const testo of [c.testo.DEFAULT, c.testo[2], c.testo[3]]) {
      expect(contrasto(testo, fondo)).toBeGreaterThanOrEqual(4.5);
    }
  });

  test.each(Object.entries(fondi))('the ink of the suits and the error have 4.5:1 on %s', (_, fondo) => {
    for (const inchiostro of [c.denari.DEFAULT, c.coppe.DEFAULT, c.spade.DEFAULT, c.bastoni.DEFAULT, c.errore.DEFAULT]) {
      expect(contrasto(inchiostro, fondo)).toBeGreaterThanOrEqual(4.5);
    }
  });

  test('the dark text on the gold has 4.5:1', () => {
    expect(contrasto(c.inchiostro[900], c.oro.DEFAULT)).toBeGreaterThanOrEqual(4.5);
  });
});
