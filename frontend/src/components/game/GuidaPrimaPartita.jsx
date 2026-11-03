/**
 * GuidaPrimaPartita Component
 *
 * Three lines for whoever plays a first game: what happens by itself and what
 * the player decides. It shows until the player has won a collection or taps
 * "Ho capito", and is remembered on the device.
 */

import React from "react";
import PropTypes from "prop-types";

function GuidaPrimaPartita({ onClose }) {
  return (
    <section
      aria-label="Come si gioca"
      className="rounded-xl border-2 border-linea-forte bg-notte-700 p-3 text-testo"
    >
      <p className="titolo text-base">Come si gioca</p>
      <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm [text-wrap:pretty]">
        <li>Quando esce una carta, la tua cartella si copre da sola con un fagiolo.</li>
        <li>Completa una figura, per esempio una riga o una colonna: la collezione si vince da sola.</li>
        <li>Il Jolly serve quando a una collezione manca una sola carta.</li>
      </ol>
      <button
        type="button"
        onClick={onClose}
        className="mt-2 min-h-[44px] rounded-lg border-2 border-linea-forte bg-notte-700 px-4 text-sm font-bold transition hover:bg-white"
      >
        Ho capito
      </button>
    </section>
  );
}

GuidaPrimaPartita.propTypes = {
  onClose: PropTypes.func.isRequired,
};

export default GuidaPrimaPartita;
