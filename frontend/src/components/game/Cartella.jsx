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

function Fagiolo({ nuovo, indice }) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute bottom-0.5 right-0.5 h-[22px] w-[30px] ${INCLINAZIONI[indice % INCLINAZIONI.length]} ${
        nuovo ? "animate-fagiolo-giu" : ""
      }`}
    >
      <span className="block h-full w-full rounded-[50%_50%_46%_54%/58%_58%_42%_42%] border border-fagiolo-dark bg-fagiolo shadow-[0_2px_3px_rgba(42,26,15,0.55),inset_3px_3px_4px_rgba(255,255,255,0.28)]" />
    </span>
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
          <td className="w-[5.1rem] p-0" />
          {SEMI_IN_ORDINE.map((seme) => (
            <th
              key={seme}
              scope="col"
              className={`rounded-md border-2 border-inchiostro-900 px-0.5 py-1 text-center ${INCHIOSTRO_SEME[seme].soft}`}
            >
              <Seme seme={seme} className="mx-auto h-6 w-6" />
              <span className={`block text-[11px] font-bold leading-tight ${INCHIOSTRO_SEME[seme].text}`}>
                {seme}
              </span>
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
                <span className="text-[11px] font-bold leading-tight text-inchiostro-900">{riga[0].valore}</span>
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
