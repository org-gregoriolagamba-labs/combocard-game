/**
 * Cartella Component
 *
 * The player's sheet laid out like a tombola sheet: values down the rows from
 * Asso to Re, the four suits across the columns. The 25 cards of the player are
 * printed in their place, the other 15 places stay empty, so the shape of every
 * collection can be seen: a tris is a row, a sequenza is neighbouring rows, a
 * scopa is a column, a combocard reale is neighbouring rows in one column.
 *
 * The cards are the light of the table: ivory tiles on a dark ground. Every tile
 * shows the card itself, a small print of the real card of the 1875 deck with its
 * number (the same number as the row), so no tile has to be read through the row
 * label. Every card is a button named by its value and suit; it can be activated
 * only while choosing the card for the jolly. A drawn card is sealed with a badge
 * in the ink of its suit. A card drawn that is not in the sheet leaves its empty place with a solid
 * border and a ringed dot, and is named for screen readers: it is not told by colour alone.
 */

import React, { useState } from "react";
import PropTypes from "prop-types";
import { Check, Sparkles } from "lucide-react";
import Seme from "./Seme";
import { INCHIOSTRO_SEME, SEMI_IN_ORDINE, calcolaProgresso, mappaCartella } from "../../utils";

// The figures that cross rows and columns: their progress is shown in the corner of the sheet
const FIGURE_TRASVERSALI = [
  { tipo: "sequenza", sigla: "SEQ", nome: "Sequenza" },
  { tipo: "napola", sigla: "NAPOLA", nome: "Napola" },
  { tipo: "combocard_reale", sigla: "REALE", nome: "Combocard reale" },
];

const nomeCarta = (carta, coperta) =>
  `${carta.valore} di ${carta.seme}${coperta ? ", coperta" : ""}`;

// The card itself, small: the print of the deck (files of 54 px made from the cards) and its number
function FaccioCarta({ carta, numero, coperta }) {
  const [mancante, setMancante] = useState(false);

  return (
    <span aria-hidden="true" className="flex h-full w-full items-center gap-1 px-[3px]">
      {!mancante && (
        <img
          src={`/carte-mini/${carta.seme.toLowerCase()}-${carta.valore.toLowerCase()}.webp`}
          alt=""
          width={54}
          height={98}
          decoding="async"
          draggable={false}
          onError={() => setMancante(true)}
          className="h-10 w-auto shrink-0 select-none rounded-[2px] border border-inchiostro-900/30"
        />
      )}
      {!coperta && (
        <span className="titolo min-w-0 flex-1 text-center text-[17px] leading-none text-inchiostro-900">
          {numero}
        </span>
      )}
    </span>
  );
}

FaccioCarta.propTypes = {
  carta: PropTypes.shape({ valore: PropTypes.string, seme: PropTypes.string }).isRequired,
  numero: PropTypes.number.isRequired,
  coperta: PropTypes.bool,
};

// The seal that closes a drawn card: a badge in the ink of the suit, with a ring that spreads once
function Sigillo({ seme, nuovo }) {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-lg bg-notte-950/50">
      <span className="absolute right-1 top-1/2 -mt-3 flex h-6 w-6 items-center justify-center">
        {nuovo && (
          <span className={`absolute inset-0 rounded-full ${INCHIOSTRO_SEME[seme].bg} animate-onda`} />
        )}
        <span
          className={`relative flex h-6 w-6 items-center justify-center rounded-full ${INCHIOSTRO_SEME[seme].bg} text-inchiostro-900 shadow-[0_0_14px_var(--sigillo)] ${
            nuovo ? "animate-sigillo" : ""
          }`}
          style={{ "--sigillo": SIGILLO_ALONE[seme] }}
        >
          <Check size={15} strokeWidth={3.5} />
        </span>
      </span>
    </span>
  );
}

const SIGILLO_ALONE = {
  Denari: "rgba(255, 207, 74, 0.7)",
  Coppe: "rgba(255, 106, 85, 0.7)",
  Spade: "rgba(111, 151, 255, 0.7)",
  Bastoni: "rgba(61, 220, 151, 0.7)",
};

Sigillo.propTypes = { seme: PropTypes.string.isRequired, nuovo: PropTypes.bool };

function Cartella({
  cartella,
  coperte,
  estratte = [],
  jollyPos = null,
  jollyMode = null,
  jollyUsato = false,
  selected = null,
  possibili = null,
  destinazione = null,
  evidenziate = [],
  vinte = [],
  onCardClick = () => {},
}) {
  const choosing = Boolean(jollyMode) && !jollyUsato;
  const righe = mappaCartella(cartella, coperte, estratte);
  // How near each row (a tris) and each column (a scopa) is: shown on the sheet itself
  const perRiga = righe.map((riga) => riga.filter((p) => p.coperta).length);
  const perColonna = SEMI_IN_ORDINE.map((_, c) => righe.filter((riga) => riga[c].coperta).length);
  // The same count as the collections panel; a figure appears when at most two cards are missing
  const vicine = FIGURE_TRASVERSALI.filter(({ tipo }) => !vinte.includes(tipo))
    .map((figura) => ({ ...figura, ...calcolaProgresso({ cartella, coperte }, figura.tipo) }))
    .filter(({ count, total }) => count > 0 && total - count <= 2);
  const luci = new Set(evidenziate.map((p) => `${p.row}-${p.col}`));
  // With the list, only the cards the jolly can turn are active; without it, every uncovered card is
  const attive = possibili ? new Set(possibili.map((p) => `${p.row}-${p.col}`)) : null;

  // The seals already on the sheet when it appears do not play their entrance again
  const [giaCoperte] = useState(
    () => new Set(righe.flat().filter((p) => p.coperta).map((p) => `${p.seme}|${p.valore}`))
  );

  return (
    <table className="w-full table-fixed border-separate [border-spacing:3px] max-[359px]:[border-spacing:2px] max-[319px]:min-w-[18.25rem]">
      <caption className="sr-only">
        La tua cartella: i valori in riga da Asso a Re, i semi in colonna
      </caption>
      <thead>
        <tr>
          <td className="w-[5.6rem] p-0 align-middle max-[359px]:w-[5.4rem]">
            {vicine.length > 0 && (
              <ul className="flex flex-col items-start gap-px pl-0.5">
                {vicine.map(({ tipo, sigla, nome, count, total }) => (
                  <li key={tipo}>
                    <span
                      aria-hidden="true"
                      className={`block whitespace-nowrap rounded-sm px-1 text-[11px] font-bold leading-[14px] ${
                        total - count <= 1 ? "bg-oro text-inchiostro-900" : "bg-notte-600 text-testo"
                      }`}
                    >
                      {`${sigla} ${count}/${total}`}
                    </span>
                    <span className="sr-only">{`${nome}: ${count} carte su ${total}`}</span>
                  </li>
                ))}
              </ul>
            )}
          </td>
          {SEMI_IN_ORDINE.map((seme, indiceSeme) => (
            <th
              key={seme}
              scope="col"
              className={`relative rounded-lg border border-linea-forte px-0.5 py-1 text-center max-[379px]:px-0 ${INCHIOSTRO_SEME[seme].soft}`}
            >
              <Seme seme={seme} className="mx-auto h-6 w-6" />
              <span className={`block text-[13px] font-bold leading-tight tracking-tight max-[379px]:text-[11px] ${INCHIOSTRO_SEME[seme].text}`}>
                {seme}
              </span>
              {perColonna[indiceSeme] >= 3 && (
                <span
                  aria-hidden="true"
                  className={`absolute right-0.5 top-0.5 rounded-sm px-1 text-[11px] font-bold leading-4 ${
                    perColonna[indiceSeme] >= 5 ? "bg-oro text-inchiostro-900" : "bg-notte-600 text-testo"
                  }`}
                >
                  {perColonna[indiceSeme]}/5
                </span>
              )}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {righe.map((riga, indiceRiga) => (
          <tr key={riga[0].valore}>
            <th scope="row" className="p-0 text-left font-normal">
              <span className="flex h-11 items-center gap-1 pl-0.5">
                <span className="titolo flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-linea-forte bg-notte-700 text-[12px] leading-none text-testo">
                  {indiceRiga + 1}
                </span>
                <span className="flex min-w-0 flex-col items-start">
                  <span className="text-[13px] font-bold leading-tight text-testo">{riga[0].valore}</span>
                  {perRiga[indiceRiga] >= 2 && (
                    <span
                      aria-hidden="true"
                      className={`rounded-sm px-1 text-[11px] font-bold leading-4 ${
                        perRiga[indiceRiga] >= 3 ? "bg-oro text-inchiostro-900" : "bg-notte-600 text-testo"
                      }`}
                    >
                      {perRiga[indiceRiga]}/3
                    </span>
                  )}
                </span>
              </span>
            </th>
            {riga.map((posto) => {
              if (!posto.carta) {
                const arrivo =
                  destinazione && destinazione.valore === posto.valore && destinazione.seme === posto.seme;
                return (
                  <td key={posto.seme} className="p-0">
                    <span
                      aria-hidden="true"
                      className={`flex h-11 items-center justify-center rounded-lg border ${
                        arrivo
                          ? "border-dashed border-oro bg-oro/20"
                          : posto.estratta
                          ? "border-solid border-testo-3 bg-notte-800"
                          : "border-dashed border-linea-forte"
                      }`}
                    >
                      {arrivo ? (
                        <Sparkles size={20} className="text-oro" />
                      ) : (
                        posto.estratta && (
                          <span
                            data-testid="uscita-senza-te"
                            className="h-3 w-3 rounded-full bg-testo-2 ring-2 ring-testo-3/60"
                          />
                        )
                      )}
                    </span>
                    {posto.estratta && !arrivo && (
                      <span className="sr-only">{`${posto.valore} di ${posto.seme}: uscita, non è nella tua cartella`}</span>
                    )}
                  </td>
                );
              }

              const { carta, row, col, coperta } = posto;
              const isJolly = Boolean(jollyPos) && jollyPos.row === row && jollyPos.col === col;
              const isClickable = choosing && !coperta && (!attive || attive.has(`${row}-${col}`));
              const isSelected = Boolean(selected) && selected.row === row && selected.col === col;
              const nuovo = coperta && !giaCoperte.has(`${posto.seme}|${posto.valore}`);

              return (
                <td key={posto.seme} className="p-0">
                  <button
                    type="button"
                    onClick={() => isClickable && onCardClick(row, col)}
                    disabled={!isClickable}
                    aria-label={nomeCarta(carta, coperta)}
                    aria-pressed={choosing ? isSelected : undefined}
                    className={`relative flex h-11 w-full items-center justify-center overflow-hidden rounded-lg bg-carta shadow-carta transition motion-reduce:transition-none disabled:cursor-default ${
                      luci.has(`${row}-${col}`)
                        ? "z-10 scale-105 ring-4 ring-oro shadow-[0_0_24px_rgba(255,207,74,0.8)]"
                        : isSelected
                        ? "z-10 scale-110 ring-4 ring-white"
                        : isClickable
                        ? "cursor-pointer ring-2 ring-oro hover:scale-105"
                        : choosing && !coperta
                        ? "opacity-35"
                        : ""
                    }`}
                  >
                    <FaccioCarta carta={carta} numero={indiceRiga + 1} coperta={coperta} />

                    {isJolly && (
                      <span className="absolute left-0 top-0 rounded-br-md bg-oro px-1 text-[10px] font-bold leading-4 text-inchiostro-900">
                        {carta.wasJolly ? "USATO" : "JOLLY"}
                      </span>
                    )}

                    {coperta && <Sigillo seme={carta.seme} nuovo={nuovo} />}
                  </button>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

Cartella.propTypes = {
  cartella: PropTypes.arrayOf(
    PropTypes.arrayOf(
      PropTypes.shape({
        valore: PropTypes.string,
        seme: PropTypes.string,
        emoji: PropTypes.string,
        wasJolly: PropTypes.bool,
      })
    )
  ).isRequired,
  coperte: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.bool)).isRequired,
  estratte: PropTypes.arrayOf(
    PropTypes.shape({ valore: PropTypes.string, seme: PropTypes.string })
  ),
  jollyPos: PropTypes.shape({
    row: PropTypes.number,
    col: PropTypes.number,
  }),
  jollyMode: PropTypes.string,
  jollyUsato: PropTypes.bool,
  selected: PropTypes.shape({
    row: PropTypes.number,
    col: PropTypes.number,
  }),
  possibili: PropTypes.arrayOf(PropTypes.shape({ row: PropTypes.number, col: PropTypes.number })),
  destinazione: PropTypes.shape({ valore: PropTypes.string, seme: PropTypes.string }),
  evidenziate: PropTypes.arrayOf(PropTypes.shape({ row: PropTypes.number, col: PropTypes.number })),
  vinte: PropTypes.arrayOf(PropTypes.string),
  onCardClick: PropTypes.func,
};

export default Cartella;
