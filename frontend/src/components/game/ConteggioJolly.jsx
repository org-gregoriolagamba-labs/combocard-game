/**
 * ConteggioJolly Component
 *
 * The seconds left while a player chooses the card for the jolly and the draws
 * are paused. It is only a picture of the time: the screen decides what happens
 * when the time is over. It is hidden from screen readers so it does not read
 * a number every second; the sentence around it says what is going on.
 *
 * The server sends the moment the pause ends. The count never shows more than
 * the length of a pause, so a clock that is off cannot show an absurd time.
 */

import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";

export const SECONDI_PAUSA_JOLLY = 30;

function ConteggioJolly({ scadenza, className = "" }) {
  // Start from the real time of the first paint: place a `key` on the moment so a new pause starts again
  const [ora, setOra] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setOra(Date.now()), 500);
    return () => clearInterval(timer);
  }, []);

  const secondi = Math.min(SECONDI_PAUSA_JOLLY, Math.max(0, Math.ceil((scadenza - ora) / 1000)));

  return (
    <span aria-hidden="true" className={`tabular-nums ${className}`}>
      {secondi} s
    </span>
  );
}

ConteggioJolly.propTypes = {
  scadenza: PropTypes.number.isRequired,
  className: PropTypes.string,
};

export default ConteggioJolly;
