/**
 * PulsanteSuoni Component
 *
 * The button on the sheet of the game that turns the sounds off for the player and back on.
 * The choice is the player's own and stays in this browser; the creator's choice of a game with
 * no sounds at all is made when the game is created, and then there is no button. The browser
 * keeps the audio locked until the player touches the page, so the first touch unlocks it.
 */

import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Volume2, VolumeX } from "lucide-react";
import { isMuto, setMuto, sbloccaAudio } from "../../services/soundService";

function PulsanteSuoni({ className = "" }) {
  const [muto, setMutoStato] = useState(isMuto);

  useEffect(() => {
    const sblocca = () => sbloccaAudio();
    window.addEventListener("pointerdown", sblocca, { once: true });
    window.addEventListener("keydown", sblocca, { once: true });
    return () => {
      window.removeEventListener("pointerdown", sblocca);
      window.removeEventListener("keydown", sblocca);
    };
  }, []);

  const alterna = () => {
    setMuto(!muto);
    setMutoStato(!muto);
    sbloccaAudio();
  };
  const Icona = muto ? VolumeX : Volume2;

  return (
    <button
      type="button"
      onClick={alterna}
      aria-label={muto ? "Attiva i suoni" : "Disattiva i suoni"}
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-linea-forte bg-notte-700 text-testo transition hover:bg-notte-600 ${className}`}
    >
      <Icona size={22} aria-hidden="true" />
    </button>
  );
}

PulsanteSuoni.propTypes = { className: PropTypes.string };

export default PulsanteSuoni;
