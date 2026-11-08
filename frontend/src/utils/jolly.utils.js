/**
 * What the jolly can do, worked out in the browser so the screen can say it
 * before the player taps. It mirrors the server (backend/src/services/jolly.service.js),
 * which stays the judge: the jolly turns one card of the sheet into the card
 * that completes a collection that is exactly ONE card away.
 *
 * - tris, sequenza, napola: the card changes value and keeps its suit
 * - scopa: the card changes suit and keeps its value
 * - combocard reale: the card changes value and suit
 * - it never becomes a card that is already in the sheet, its own card included
 */

import { VALORI_IN_ORDINE } from "./mazzo.utils";

const NUMERO = Object.fromEntries(VALORI_IN_ORDINE.map((v, i) => [v, i + 1]));
const NOME = (numero) => VALORI_IN_ORDINE[numero - 1];
const LUNGHEZZA = 4;

// Every place counts, the one of the jolly too: a card cannot become itself
const giaInCartella = (cartella, valore, seme) =>
  cartella.some((riga) => riga.some((carta) => carta.valore === valore && carta.seme === seme));

/**
 * The card the jolly would make of the card at (row, col) for a collection,
 * or null when it cannot complete it.
 */
export function anteprimaJolly(cartella, coperte, row, col, tipo) {
  const carta = cartella[row]?.[col];
  if (!carta) return null;

  const coperti = [];
  cartella.forEach((riga, r) =>
    riga.forEach((c, i) => {
      if (coperte[r]?.[i] && !(r === row && i === col)) coperti.push(c);
    })
  );
  const libera = (valore, seme) => !giaInCartella(cartella, valore, seme);
  const numeroDi = (c) => c.valoreNum ?? NUMERO[c.valore];

  if (tipo === "tris") {
    const conteggi = {};
    coperti.forEach((c) => (conteggi[c.valore] = (conteggi[c.valore] || 0) + 1));
    for (const valore of Object.keys(conteggi)) {
      if (conteggi[valore] >= 2 && libera(valore, carta.seme)) return { valore, seme: carta.seme };
    }
    return null;
  }

  if (tipo === "sequenza") {
    const numeri = [...new Set(coperti.map(numeroDi))];
    for (let inizio = 1; inizio <= 10 - LUNGHEZZA + 1; inizio++) {
      const presenti = [];
      for (let v = inizio; v < inizio + LUNGHEZZA; v++) if (numeri.includes(v)) presenti.push(v);
      if (presenti.length === LUNGHEZZA - 1) {
        const numero = [...Array(LUNGHEZZA).keys()].map((i) => inizio + i).find((v) => !numeri.includes(v));
        const valore = NOME(numero);
        if (libera(valore, carta.seme)) return { valore, seme: carta.seme };
      }
    }
    return null;
  }

  if (tipo === "napola") {
    const conteggi = {};
    coperti.forEach((c) => (conteggi[c.valore] = (conteggi[c.valore] || 0) + 1));
    const ordinati = Object.entries(conteggi).sort((a, b) => b[1] - a[1]);
    if (ordinati.length >= 2 && ordinati[0][1] === 2 && ordinati[1][1] >= 2 && libera(ordinati[0][0], carta.seme)) {
      return { valore: ordinati[0][0], seme: carta.seme };
    }
    if (ordinati.length >= 2 && ordinati[0][1] >= 3 && ordinati[1][1] === 1 && libera(ordinati[1][0], carta.seme)) {
      return { valore: ordinati[1][0], seme: carta.seme };
    }
    return null;
  }

  if (tipo === "scopa") {
    const conteggi = {};
    coperti.forEach((c) => (conteggi[c.seme] = (conteggi[c.seme] || 0) + 1));
    let migliore = null;
    let massimo = 0;
    for (const seme of Object.keys(conteggi)) {
      if (conteggi[seme] > massimo) {
        massimo = conteggi[seme];
        migliore = seme;
      }
    }
    if (migliore && massimo >= 4 && libera(carta.valore, migliore)) {
      return { valore: carta.valore, seme: migliore };
    }
    return null;
  }

  if (tipo === "combocard_reale") {
    const perSeme = {};
    coperti.forEach((c) => {
      (perSeme[c.seme] ??= []).push(numeroDi(c));
    });
    for (const seme of Object.keys(perSeme)) {
      const numeri = [...new Set(perSeme[seme])];
      for (let inizio = 1; inizio <= 10 - LUNGHEZZA + 1; inizio++) {
        const presenti = [];
        for (let v = inizio; v < inizio + LUNGHEZZA; v++) if (numeri.includes(v)) presenti.push(v);
        if (presenti.length === LUNGHEZZA - 1) {
          const numero = [...Array(LUNGHEZZA).keys()].map((i) => inizio + i).find((v) => !numeri.includes(v));
          const valore = NOME(numero);
          if (libera(valore, seme)) return { valore, seme };
        }
      }
    }
    return null;
  }

  return null;
}

/**
 * Every uncovered card that the jolly could turn for a collection, with the
 * card it would become: [{ row, col, conversione }].
 */
export function carteConJolly(cartella, coperte, tipo) {
  const risultato = [];
  cartella.forEach((riga, row) =>
    riga.forEach((_, col) => {
      if (coperte[row]?.[col]) return;
      const conversione = anteprimaJolly(cartella, coperte, row, col, tipo);
      if (conversione) risultato.push({ row, col, conversione });
    })
  );
  return risultato;
}
