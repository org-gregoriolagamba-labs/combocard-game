/**
 * Contacts shown in the "Info e contatti" dialog
 *
 * The only place to change a name or a link. The email stays `null` until there is an
 * address that someone reads: with `null` the dialog does not show it.
 */

export const CONTATTI = {
  autore: "Gregorio La Gamba",
  linkedin: "https://www.linkedin.com/in/gregoriolagamba/",
  repository: "https://github.com/org-gregoriolagamba-projects/combocard-game",
  email: null,
};

/** The name of the app and the first year of the copyright (the year of the first commit) */
export const MARCHIO = {
  nome: "ComboCard",
  annoInizio: 2026,
};

/** Where the deck of the cards comes from (the full credits are in public/carte/CREDITI.md) */
export const CREDITI_MAZZO = {
  descrizione: "mazzo napoletano storico stampato a Napoli nel 1875 da Luigi Pignalosa",
  fonte: "British Museum, 1875,1211.172-211",
  url: "https://www.britishmuseum.org/collection/object/P_1875-1211-172-211",
};
