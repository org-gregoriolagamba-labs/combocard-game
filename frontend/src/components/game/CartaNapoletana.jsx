/**
 * CartaNapoletana Component
 *
 * A card of the Neapolitan deck printed in Naples in 1875 by Luigi Pignalosa
 * (credits in public/carte/CREDITI.md). The files are loaded one at a time,
 * when a card is drawn.
 */

import React, { useState } from "react";
import PropTypes from "prop-types";

const WIDTH = 198;
const HEIGHT = 360;

function CartaNapoletana({ valore, seme, className = "" }) {
  const src = `${process.env.PUBLIC_URL || ""}/carte/${seme.toLowerCase()}-${valore.toLowerCase()}.webp`;
  const [failedSrc, setFailedSrc] = useState(null);
  const nome = `${valore} di ${seme}`;

  if (failedSrc === src) {
    return <span className={className}>{nome}</span>;
  }

  return (
    <img
      src={src}
      alt={nome}
      width={WIDTH}
      height={HEIGHT}
      decoding="async"
      draggable={false}
      onError={() => setFailedSrc(src)}
      className={`block select-none ${className}`}
    />
  );
}

CartaNapoletana.propTypes = {
  valore: PropTypes.string.isRequired,
  seme: PropTypes.string.isRequired,
  className: PropTypes.string,
};

export default CartaNapoletana;
