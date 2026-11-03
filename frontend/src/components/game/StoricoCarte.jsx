/**
 * StoricoCarte Component
 *
 * Every card drawn so far, the latest first, in a section that opens on request:
 * the header already shows the last card, so the list stays out of the way until
 * a player wants to check what has come out. Each card is a thumbnail of the
 * 1875 deck with its name for screen readers; if the picture is missing, the
 * name is printed instead.
 */

import React, { useState } from "react";
import PropTypes from "prop-types";
import { Disclosure } from "../common";
import { INCHIOSTRO_SEME } from "../../utils";

const CARTE_NEL_MAZZO = 40;

function Miniatura({ carta }) {
  const [mancante, setMancante] = useState(false);
  const nome = `${carta.valore} di ${carta.seme}`;

  return (
    <li className="flex">
      <span className="sr-only">{nome}</span>
      {mancante ? (
        <span
          aria-hidden="true"
          className={`flex h-12 items-center rounded-[3px] border border-linea-forte px-1.5 text-xs font-bold ${INCHIOSTRO_SEME[carta.seme]?.text ?? "text-testo"}`}
        >
          {nome}
        </span>
      ) : (
        <img
          src={`/carte-mini/${carta.seme.toLowerCase()}-${carta.valore.toLowerCase()}.webp`}
          alt=""
          aria-hidden="true"
          width={54}
          height={98}
          decoding="async"
          loading="lazy"
          draggable={false}
          onError={() => setMancante(true)}
          className="h-12 w-auto select-none rounded-[3px] border border-linea-forte"
        />
      )}
    </li>
  );
}

Miniatura.propTypes = {
  carta: PropTypes.shape({ valore: PropTypes.string, seme: PropTypes.string }).isRequired,
};

function StoricoCarte({ estratte = [] }) {
  const piuRecentiPrima = [...estratte].reverse();

  return (
    <Disclosure
      className="superficie px-3 py-1"
      title={
        <>
          Carte uscite
          <span className="text-sm font-normal tabular-nums text-testo-2">
            {estratte.length} su {CARTE_NEL_MAZZO}
          </span>
        </>
      }
    >
      <div className="pb-2 pt-1">
        {piuRecentiPrima.length === 0 ? (
          <p className="text-sm text-testo-2">Nessuna carta è ancora uscita.</p>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {piuRecentiPrima.map((carta) => (
              <Miniatura key={`${carta.seme}-${carta.valore}`} carta={carta} />
            ))}
          </ul>
        )}
      </div>
    </Disclosure>
  );
}

StoricoCarte.propTypes = {
  estratte: PropTypes.arrayOf(PropTypes.shape({ valore: PropTypes.string, seme: PropTypes.string })),
};

export default StoricoCarte;
