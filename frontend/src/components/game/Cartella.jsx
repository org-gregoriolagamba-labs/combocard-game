/**
 * Cartella Component
 *
 * The player's sheet laid out like a tombola sheet: values down the rows from
 * Asso to Re, the four suits across the columns. The 25 cards of the player are
 * printed in their place, the other 15 places stay empty, so the shape of every
 * collection can be seen: a tris is a row, a sequenza is neighbouring rows, a
 * scopa is a column, a combocard reale is neighbouring rows in one column.
 *
 * Every card is a button named by its value and suit; it can be activated only
 * while choosing the card for the jolly. A drawn card is covered by a bean.
 */

import React, { useState } from "react";
import PropTypes from "prop-types";
import { Sparkles } from "lucide-react";
import Seme from "./Seme";
import { INCHIOSTRO_SEME, SEMI_IN_ORDINE, mappaCartella } from "../../utils";

const nomeCarta = (carta, coperta) =>
  `${carta.valore} di ${carta.seme}${coperta ? ", coperta" : ""}`;

// The bean lies a little crooked, and not always the same way
const INCLINAZIONI = ["-rotate-12", "rotate-6", "-rotate-3", "rotate-12", "rotate-3"];

// A dried bean, drawn flat in the vermilion ink: kidney outline, the hilum and a few speckles
function Fagiolo({ nuovo, indice }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 30 22"
      className={`pointer-events-none absolute bottom-0.5 right-0.5 h-[22px] w-[30px] ${INCLINAZIONI[indice % INCLINAZIONI.length]} ${
        nuovo ? "animate-fagiolo-giu" : ""
      }`}
    >
      <path
        d="M3.2 12.2C2 5.6 9.4 1.6 16.8 2.2c8.2.7 12.4 6 10.6 11.6-1.8 5.6-9.8 7.8-15.6 5.2-4.2-1.8-8-3.2-8.6-6.8Z"
        fill="#b92d1b"
        stroke="#7c1a0e"
        strokeWidth="1.2"
      />
      <path d="M11 9.6c3-2.6 7.2-2.4 9.6.2" fill="none" stroke="#7c1a0e" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="9" cy="14.6" r="0.9" fill="#7c1a0e" />
      <circle cx="19.4" cy="15.2" r="0.9" fill="#7c1a0e" />
      <circle cx="23.2" cy="9.6" r="0.8" fill="#7c1a0e" />
    </svg>
  );
}

Fagiolo.propTypes = { nuovo: PropTypes.bool, indice: PropTypes.number };

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
  // With the list, only the cards the jolly can turn are active; without it, every uncovered card is
  const luci = new Set(evidenziate.map((p) => `${p.row}-${p.col}`));
  const attive = possibili ? new Set(possibili.map((p) => `${p.row}-${p.col}`)) : null;
  const righe = mappaCartella(cartella, coperte, estratte);
  // How near each row (a tris) and each column (a scopa) is: shown on the sheet itself
  const perRiga = righe.map((riga) => riga.filter((p) => p.coperta).length);
  const perColonna = SEMI_IN_ORDINE.map((_, c) => righe.filter((riga) => riga[c].coperta).length);

  // The beans already on the sheet when it appears do not fall again
  const [giaCoperte] = useState(
    () => new Set(righe.flat().filter((p) => p.coperta).map((p) => `${p.seme}|${p.valore}`))
  );

  return (
    <table className="w-full table-fixed border-separate [border-spacing:2px]">
      <caption className="sr-only">
        La tua cartella: i valori in riga da Asso a Re, i semi in colonna
      </caption>
      <thead>
        <tr>
          <td className="w-[5.6rem] p-0" />
          {SEMI_IN_ORDINE.map((seme) => (
            <th
              key={seme}
              scope="col"
              className={`relative rounded-md border-2 border-inchiostro-900 px-0.5 py-1 text-center ${INCHIOSTRO_SEME[seme].soft}`}
            >
              <Seme seme={seme} className="mx-auto h-6 w-6" />
              <span className={`block text-[13px] font-bold leading-tight tracking-tight ${INCHIOSTRO_SEME[seme].text}`}>
                {seme}
              </span>
              {perColonna[SEMI_IN_ORDINE.indexOf(seme)] >= 3 && (
                <span aria-hidden="true" className={`absolute right-0.5 top-0.5 rounded-sm px-1 text-[11px] font-bold leading-4 text-cartone-50 ${perColonna[SEMI_IN_ORDINE.indexOf(seme)] >= 5 ? "bg-fagiolo" : "bg-inchiostro-900"}`}>
                  {perColonna[SEMI_IN_ORDINE.indexOf(seme)]}/5
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
                <span className="titolo flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-inchiostro-900 bg-cartone-200 text-[12px] leading-none text-inchiostro-900">
                  {indiceRiga + 1}
                </span>
                <span className="flex min-w-0 flex-col items-start">
                  <span className="text-[13px] font-bold leading-tight text-inchiostro-900">{riga[0].valore}</span>
                  {perRiga[indiceRiga] >= 2 && (
                    <span aria-hidden="true" className={`rounded-sm px-1 text-[11px] font-bold leading-4 text-cartone-50 ${perRiga[indiceRiga] >= 3 ? "bg-fagiolo" : "bg-inchiostro-900"}`}>
                      {perRiga[indiceRiga]}/3
                    </span>
                  )}
                </span>
              </span>
            </th>
            {riga.map((posto, indiceColonna) => {
              if (!posto.carta) {
                const arrivo =
                  destinazione && destinazione.valore === posto.valore && destinazione.seme === posto.seme;
                return (
                  <td key={posto.seme} className="p-0">
                    <span
                      aria-hidden="true"
                      className={`flex h-11 items-center justify-center rounded-md border-2 border-dashed ${
                        arrivo ? "border-inchiostro-900 bg-ocra" : "border-cartone-400/70"
                      }`}
                    >
                      {arrivo ? (
                        <Sparkles size={20} className="text-inchiostro-900" />
                      ) : (
                        posto.estratta && <span className="h-1.5 w-1.5 rounded-full bg-inchiostro-500/70" />
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
                    className={`relative flex h-11 w-full items-center justify-center overflow-hidden rounded-md border-2 bg-cartone-50 transition motion-reduce:transition-none disabled:cursor-default ${
                      luci.has(`${row}-${col}`)
                        ? "z-10 scale-105 border-inchiostro-900 ring-4 ring-ocra"
                        : isSelected
                        ? "z-10 scale-110 border-inchiostro-900 ring-4 ring-inchiostro-900"
                        : isClickable
                        ? "cursor-pointer border-ocra-dark ring-2 ring-ocra hover:scale-105"
                        : choosing && !coperta
                        ? "border-inchiostro-900 opacity-40"
                        : "border-inchiostro-900"
                    }`}
                  >
                    <Seme seme={carta.seme} fallback={carta.emoji} className="h-8 w-8" />

                    {isJolly && (
                      <span className="absolute left-0 top-0 rounded-br-md bg-ocra px-1 text-[10px] font-bold leading-4 text-inchiostro-900">
                        {carta.wasJolly ? "USATO" : "JOLLY"}
                      </span>
                    )}

                    {coperta && <Fagiolo nuovo={nuovo} indice={indiceRiga + indiceColonna} />}
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
