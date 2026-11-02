/**
 * Seme Component
 *
 * One suit of the Neapolitan deck, cut from a numbered card of the 1875 deck
 * by Luigi Pignalosa (credits in public/carte/CREDITI.md). It is decoration:
 * the card button carries the name.
 */

import React from "react";
import PropTypes from "prop-types";

const FILES = {
  Spade: "spade",
  Coppe: "coppe",
  Denari: "denari",
  Bastoni: "bastoni",
};

// Swords and clubs are drawn upright: tilt them to fill a square box
const TILTED = new Set(["Spade", "Bastoni"]);

function Seme({ seme, fallback = "", className = "" }) {
  const file = FILES[seme];

  if (!file) {
    return (
      <span aria-hidden="true" className={className}>
        {fallback}
      </span>
    );
  }

  return (
    <img
      src={`/semi/${file}.webp`}
      alt=""
      aria-hidden="true"
      draggable={false}
      decoding="async"
      className={`select-none object-contain ${TILTED.has(seme) ? "-rotate-[40deg] scale-125" : ""} ${className}`}
    />
  );
}

Seme.propTypes = {
  seme: PropTypes.string.isRequired,
  fallback: PropTypes.string,
  className: PropTypes.string,
};

export default Seme;
