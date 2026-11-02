/**
 * The places of the sheet that make a collection, so the screen can light them
 * when it is won: [{ row, col }] or [] when the collection is not complete.
 */

const numeroDi = (carta) => carta.valoreNum;

function coperti(cartella, coperte) {
  const lista = [];
  cartella.forEach((riga, row) =>
    riga.forEach((carta, col) => {
      if (coperte[row]?.[col]) lista.push({ row, col, carta });
    })
  );
  return lista;
}

const raggruppa = (lista, chiave) => {
  const gruppi = {};
  lista.forEach((x) => (gruppi[chiave(x)] ??= []).push(x));
  return gruppi;
};

const posti = (lista) => lista.map(({ row, col }) => ({ row, col }));

// One card for each of four consecutive values, or null
function corsa(lista, lunghezza = 4) {
  const perNumero = raggruppa(lista, (x) => numeroDi(x.carta));
  for (let inizio = 1; inizio <= 10 - lunghezza + 1; inizio++) {
    const scelti = [];
    for (let v = inizio; v < inizio + lunghezza; v++) {
      if (!perNumero[v]) break;
      scelti.push(perNumero[v][0]);
    }
    if (scelti.length === lunghezza) return scelti;
  }
  return null;
}

export function celleVincenti(cartella, coperte, tipo) {
  const tutti = coperti(cartella, coperte);

  if (tipo === "tris") {
    const gruppo = Object.values(raggruppa(tutti, (x) => x.carta.valore)).find((g) => g.length >= 3);
    return gruppo ? posti(gruppo.slice(0, 3)) : [];
  }

  if (tipo === "sequenza") {
    const scelti = corsa(tutti);
    return scelti ? posti(scelti) : [];
  }

  if (tipo === "scopa") {
    const gruppo = Object.values(raggruppa(tutti, (x) => x.carta.seme)).find((g) => g.length >= 5);
    return gruppo ? posti(gruppo.slice(0, 5)) : [];
  }

  if (tipo === "napola") {
    const gruppi = Object.values(raggruppa(tutti, (x) => x.carta.valore));
    const tre = gruppi.find((g) => g.length >= 3);
    if (!tre) return [];
    const due = gruppi.find((g) => g !== tre && g.length >= 2);
    return due ? posti([...tre.slice(0, 3), ...due.slice(0, 2)]) : [];
  }

  if (tipo === "combocard_reale") {
    for (const gruppo of Object.values(raggruppa(tutti, (x) => x.carta.seme))) {
      const scelti = corsa(gruppo);
      if (scelti) return posti(scelti);
    }
    return [];
  }

  return [];
}
