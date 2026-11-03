/**
 * The deck laid out like a tombola sheet: values down the rows from Asso to Re,
 * suits across the columns. The 25 cards of a player sit in their own place on
 * this 10 x 4 table; the other 15 places stay empty. Where a card sits never
 * changes a rule: collections look only at values and suits.
 */

// The order of the Neapolitan deck, left to right
export const SEMI_IN_ORDINE = ["Denari", "Coppe", "Spade", "Bastoni"];

export const VALORI_IN_ORDINE = [
  "Asso", "Due", "Tre", "Quattro", "Cinque", "Sei", "Sette", "Fante", "Cavallo", "Re",
];

// Each suit has its own ink in every screen (classes are written in full for Tailwind)
export const INCHIOSTRO_SEME = {
  Denari: { text: "text-denari", bg: "bg-denari", soft: "bg-denari-soft", border: "border-denari" },
  Coppe: { text: "text-coppe", bg: "bg-coppe", soft: "bg-coppe-soft", border: "border-coppe" },
  Spade: { text: "text-spade", bg: "bg-spade", soft: "bg-spade-soft", border: "border-spade" },
  Bastoni: { text: "text-bastoni", bg: "bg-bastoni", soft: "bg-bastoni-soft", border: "border-bastoni" },
};

/**
 * The 40 places of the table, row by row, each with the card of the player when
 * it has one: { valore, seme, carta, row, col, coperta, estratta }.
 * `carta` is null for a place that is not in the player's sheet; `row` and `col`
 * are then null too. `estratte` is the list of cards drawn so far.
 */
export function mappaCartella(cartella, coperte, estratte = []) {
  const posti = new Map();
  cartella.forEach((riga, row) =>
    riga.forEach((carta, col) => {
      posti.set(`${carta.seme}|${carta.valore}`, { carta, row, col });
    })
  );
  const uscite = new Set(estratte.map((c) => `${c.seme}|${c.valore}`));

  return VALORI_IN_ORDINE.map((valore) =>
    SEMI_IN_ORDINE.map((seme) => {
      const chiave = `${seme}|${valore}`;
      const posto = posti.get(chiave);
      return {
        valore,
        seme,
        carta: posto?.carta ?? null,
        row: posto ? posto.row : null,
        col: posto ? posto.col : null,
        coperta: posto ? Boolean(coperte[posto.row]?.[posto.col]) : false,
        estratta: uscite.has(chiave),
      };
    })
  );
}
