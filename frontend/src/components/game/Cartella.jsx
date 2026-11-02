/**
 * Cartella Component
 * 
 * Displays the player's 5x5 card grid. Every card is a button named by its
 * value and suit; it can be activated only while choosing the card for the jolly.
 */

import React from "react";
import PropTypes from "prop-types";
import { Check } from "lucide-react";
import Seme from "./Seme";

const nomeCarta = (carta, coperta) =>
  `${carta.valore} di ${carta.seme}${coperta ? ", coperta" : ""}`;

function Cartella({
  cartella,
  coperte,
  jollyPos = null,
  jollyMode = null,
  jollyUsato = false,
  selected = null,
  onCardClick = () => {},
}) {
  const choosing = Boolean(jollyMode) && !jollyUsato;

  return (
    <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
      {cartella.map((row, r) =>
        row.map((carta, c) => {
          const coperta = coperte[r][c];
          const isJolly = jollyPos && jollyPos.row === r && jollyPos.col === c;
          const isClickable = choosing && !coperta;
          const isSelected = Boolean(selected) && selected.row === r && selected.col === c;

          return (
            <button
              key={`${r}-${c}`}
              type="button"
              onClick={() => isClickable && onCardClick(r, c)}
              disabled={!isClickable}
              aria-label={nomeCarta(carta, coperta)}
              aria-pressed={choosing ? isSelected : undefined}
              className={`relative flex aspect-square min-w-0 flex-col items-center justify-between overflow-hidden rounded-lg border-2 bg-white px-0.5 pb-0.5 pt-1 text-center shadow-sm transition motion-reduce:transition-none disabled:cursor-default ${
                isSelected
                  ? "z-10 scale-105 border-green-700 ring-4 ring-green-700"
                  : isClickable
                  ? "cursor-pointer border-yellow-500 ring-2 ring-yellow-400 hover:scale-105"
                  : "border-amber-300"
              }`}
            >
              <span
                className={`flex min-h-0 w-full flex-1 items-center justify-center ${
                  coperta ? "opacity-40 saturate-50" : ""
                }`}
              >
                <Seme seme={carta.seme} fallback={carta.emoji} className="h-full w-full" />
              </span>
              <span
                className={`block max-w-full text-[11px] font-bold leading-tight tracking-tight text-green-900 min-[380px]:text-xs ${
                  coperta ? "opacity-60" : ""
                }`}
              >
                {carta.valore}
              </span>

              {isJolly && (
                <span className="absolute left-0.5 top-0.5 rounded-full bg-yellow-300 px-1.5 text-[10px] font-bold leading-4 text-yellow-900">
                  {carta.wasJolly ? "USATO" : "JOLLY"}
                </span>
              )}

              {coperta && (
                <span
                  aria-hidden="true"
                  className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-green-700 text-white shadow"
                >
                  <Check size={14} strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })
      )}
    </div>
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
  onCardClick: PropTypes.func,
};

export default Cartella;
