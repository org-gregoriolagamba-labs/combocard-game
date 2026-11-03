/**
 * FiguraCollezione Component
 *
 * The shape a collection draws on the tombola sheet, as a tiny map of it
 * (four suit columns, six value rows): a tris is three places of a row, a
 * sequenza is four neighbouring rows, a scopa is five places of a column, a
 * napola is three in one row and two in another, a combocard reale is four
 * neighbouring rows of one column.
 */

import React from "react";
import PropTypes from "prop-types";

const COLONNE = 4;
const RIGHE = 6;
const LATO = 7;
const PASSO = 9;

// [row, column] of the places that are filled
const FIGURE = {
  tris: [[2, 0], [2, 1], [2, 3]],
  sequenza: [[1, 2], [2, 0], [3, 3], [4, 1]],
  scopa: [[0, 1], [1, 1], [3, 1], [4, 1], [5, 1]],
  napola: [[1, 0], [1, 1], [1, 3], [4, 1], [4, 2]],
  combocard_reale: [[1, 2], [2, 2], [3, 2], [4, 2]],
};

const NOMI = {
  tris: "tre carte dello stesso valore, in una riga",
  sequenza: "quattro valori di fila",
  scopa: "cinque carte di un seme, in una colonna",
  napola: "tre carte di un valore e due di un altro",
  combocard_reale: "quattro valori di fila di un seme",
};

function FiguraCollezione({ tipo, className = "" }) {
  const pieni = FIGURE[tipo] ?? [];
  const larghezza = COLONNE * PASSO + 1;
  const altezza = RIGHE * PASSO + 1;
  const reale = tipo === "combocard_reale";

  return (
    <svg
      role="img"
      aria-label={`Figura: ${NOMI[tipo] ?? tipo}`}
      viewBox={`0 0 ${larghezza} ${altezza}`}
      className={className}
    >
      {Array.from({ length: RIGHE }).flatMap((_, r) =>
        Array.from({ length: COLONNE }).map((__, c) => {
          const pieno = pieni.some(([pr, pc]) => pr === r && pc === c);
          return (
            <rect
              key={`${r}-${c}`}
              x={c * PASSO + 1}
              y={r * PASSO + 1}
              width={LATO}
              height={LATO}
              rx="1.5"
              fill={pieno ? (reale ? "#ffcf4a" : "#f4f1ea") : "none"}
              stroke="#8b94bb"
              strokeOpacity={pieno ? 0 : 0.7}
              strokeWidth="1"
              strokeDasharray={pieno ? undefined : "1.5 1.5"}
            />
          );
        })
      )}
    </svg>
  );
}

FiguraCollezione.propTypes = {
  tipo: PropTypes.string.isRequired,
  className: PropTypes.string,
};

export default FiguraCollezione;
