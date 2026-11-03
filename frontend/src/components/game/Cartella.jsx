/**
 * Cartella Component
 *
 * The player's sheet laid out like a tombola sheet: values down the rows from
 * Asso to Re, the four suits across the columns. The 25 cards of the player are
 * printed in their place, the other 15 places stay empty, so the shape of every
 * collection can be seen: a tris is a row, a sequenza is neighbouring rows, a
 * scopa is a column, a combocard reale is neighbouring rows in one column.
 *
 * The cards are the light of the table: ivory tiles on a dark ground. Every card
 * is a button named by its value and suit; it can be activated only while
 * choosing the card for the jolly. A drawn card is sealed with a badge in the
 * ink of its suit.
 */

import React, { useState } from "react";
import PropTypes from "prop-types";
import { Check, Sparkles } from "lucide-react";
import Seme from "./Seme";
import { INCHIOSTRO_SEME, SEMI_IN_ORDINE, mappaCartella } from "../../utils";

const nomeCarta = (carta, coperta) =>
  `${carta.valore} di ${carta.seme}${coperta ? ", coperta" : ""}`;

// The seal that closes a drawn card: a badge in the ink of the suit, with a ring that spreads once
function Sigillo({ seme, nuovo }) {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-lg bg-notte-950/50">
      <span className="absolute bottom-0.5 right-0.5 flex h-6 w-6 items-center justify-center">
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
  onCardClick = () => {},
}) {
  const choosing = Boolean(jollyMode) && !jollyUsato;
  const righe = mappaCartella(cartella, coperte, estratte);
  // How near each row (a tris) and each column (a scopa) is: shown on the sheet itself
  const perRiga = righe.map((riga) => riga.filter((p) => p.coperta).length);
  const perColonna = SEMI_IN_ORDINE.map((_, c) => righe.filter((riga) => riga[c].coperta).length);
  const luci = new Set(evidenziate.map((p) => `${p.row}-${p.col}`));
  // With the list, only the cards the jolly can turn are active; without it, every uncovered card is
  const attive = possibili ? new Set(possibili.map((p) => `${p.row}-${p.col}`)) : null;

  // The seals already on the sheet when it appears do not play their entrance again
  const [giaCoperte] = useState(
    () => new Set(righe.flat().filter((p) => p.coperta).map((p) => `${p.seme}|${p.valore}`))
  );

  return (
    <table className="w-full table-fixed border-separate [border-spacing:3px]">
      <caption className="sr-only">
        La tua cartella: i valori in riga da Asso a Re, i semi in colonna
      </caption>
      <thead>
        <tr>
          <td className="w-[5.6rem] p-0" />
          {SEMI_IN_ORDINE.map((seme, indiceSeme) => (
            <th
              key={seme}
              scope="col"
              className={`relative rounded-lg border border-linea-forte px-0.5 py-1 text-center ${INCHIOSTRO_SEME[seme].soft}`}
            >
              <Seme seme={seme} className="mx-auto h-6 w-6" />
              <span className={`block text-[13px] font-bold leading-tight tracking-tight ${INCHIOSTRO_SEME[seme].text}`}>
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
                      className={`flex h-11 items-center justify-center rounded-lg border border-dashed ${
                        arrivo ? "border-oro bg-oro/20" : "border-linea"
                      }`}
                    >
                      {arrivo ? (
                        <Sparkles size={20} className="text-oro" />
                      ) : (
                        posto.estratta && <span className="h-1.5 w-1.5 rounded-full bg-testo-3/70" />
                      )}
                    </span>
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
                    <Seme seme={carta.seme} fallback={carta.emoji} className="h-8 w-8" />

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
  onCardClick: PropTypes.func,
};

export default Cartella;
