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
import ZoomCarta from "./ZoomCarta";

const CARTE_NEL_MAZZO = 40;

function Miniatura({ carta, onApri }) {
  const [mancante, setMancante] = useState(false);
  const nome = `${carta.valore} di ${carta.seme}`;

  return (
    <li className="flex">
      <button
        type="button"
        onClick={(event) => onApri(event.currentTarget)}
        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md hover:bg-notte-700"
      >
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
      </button>
    </li>
  );
}

Miniatura.propTypes = {
  carta: PropTypes.shape({ valore: PropTypes.string, seme: PropTypes.string }).isRequired,
  onApri: PropTypes.func.isRequired,
};

function StoricoCarte({ estratte = [] }) {
  const piuRecentiPrima = [...estratte].reverse();
  // The card shown big, by its place in the list (the latest first)
  const [aperta, setAperta] = useState(null);
  const visibile = aperta !== null ? piuRecentiPrima[aperta.indice] : null;

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
              <Miniatura key={`${carta.seme}-${carta.valore}`} carta={carta} onApri={() => setAperta({ indice: piuRecentiPrima.indexOf(carta) })} />
            ))}
          </ul>
        )}
      </div>
      {visibile && (
        <ZoomCarta
          carta={visibile}
          posizione={`${aperta.indice + 1} di ${piuRecentiPrima.length}`}
          onClose={() => setAperta(null)}
          onPiuRecente={aperta.indice > 0 ? () => setAperta({ indice: aperta.indice - 1 }) : null}
          onMenoRecente={aperta.indice < piuRecentiPrima.length - 1 ? () => setAperta({ indice: aperta.indice + 1 }) : null}
        />
      )}
    </Disclosure>
  );
}

StoricoCarte.propTypes = {
  estratte: PropTypes.arrayOf(PropTypes.shape({ valore: PropTypes.string, seme: PropTypes.string })),
};

export default StoricoCarte;
