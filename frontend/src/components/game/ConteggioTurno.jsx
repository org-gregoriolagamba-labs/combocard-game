/**
 * ConteggioTurno Component
 *
 * The time left to the player on turn, in minutes and seconds, seen by everybody. When it runs out
 * the server draws the card and warns the player. It is only a picture of the time: the server decides
 * what happens at the end. It is hidden from screen readers so it does not read a number every second;
 * the sentence around it says who is drawing. While a player chooses the card for the jolly the turn
 * is stopped and so is the count. Red in the last ten seconds, with the number as well as the colour.
 */

import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";

const SECONDI_URGENTI = 10;

export const formattaTempo = (ms) => {
  const secondi = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(secondi / 60)}:${String(secondi % 60).padStart(2, "0")}`;
};

function ConteggioTurno({ scadenza, sospeso = false, restanteMs = 0, className = "" }) {
  const [ora, setOra] = useState(() => Date.now());

  useEffect(() => {
    if (sospeso) return undefined;
    const timer = setInterval(() => setOra(Date.now()), 500);
    return () => clearInterval(timer);
  }, [sospeso]);

  const restante = sospeso ? restanteMs : Math.max(0, scadenza - ora);
  const urgente = restante <= SECONDI_URGENTI * 1000;

  return (
    <span
      data-testid="conto-turno"
      data-urgente={urgente ? "true" : "false"}
      aria-hidden="true"
      className={`tabular-nums font-bold ${urgente ? "text-errore" : ""} ${className}`}
    >
      {formattaTempo(restante)}
    </span>
  );
}

ConteggioTurno.propTypes = {
  scadenza: PropTypes.number.isRequired,
  sospeso: PropTypes.bool,
  restanteMs: PropTypes.number,
  className: PropTypes.string,
};

export default ConteggioTurno;
