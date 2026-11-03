/**
 * RivelazioneCarta Component
 *
 * The draw as a scene shared by every player: the card turns over in the middle of
 * the screen, lit by a halo in the ink of its suit, holds for a moment and flies
 * up to the header. It never blocks a tap and it is skipped when the player asks
 * for less movement. It does not appear for the card that was already drawn when
 * the screen opened.
 */

import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import CartaNapoletana from "./CartaNapoletana";

const DURATA = 1700;

const ALONE = {
  Denari: "rgba(255, 207, 74, 0.55)",
  Coppe: "rgba(255, 106, 85, 0.55)",
  Spade: "rgba(111, 151, 255, 0.55)",
  Bastoni: "rgba(61, 220, 151, 0.5)",
};

const menoMovimento = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)")?.matches === true;

function RivelazioneCarta({ carta }) {
  const chiave = carta ? `${carta.seme}|${carta.valore}` : null;
  const [vista, setVista] = useState(chiave);
  const [mostra, setMostra] = useState(null);

  // A new card starts the scene (the card already drawn when the screen opens does not)
  if (chiave && chiave !== vista) {
    setVista(chiave);
    if (!menoMovimento()) setMostra({ chiave, carta });
  }

  useEffect(() => {
    if (!mostra) return undefined;
    const timer = setTimeout(() => setMostra(null), DURATA);
    return () => clearTimeout(timer);
  }, [mostra]);

  if (!mostra) return null;

  return (
    <div
      key={mostra.chiave}
      aria-hidden="true"
      data-testid="rivelazione-carta"
      className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center"
    >
      <div className="absolute inset-0 animate-velo bg-notte-950/60" />
      <div
        className="relative animate-rivela rounded-xl"
        style={{ "--alone": ALONE[mostra.carta.seme], boxShadow: `0 0 80px 10px ${ALONE[mostra.carta.seme]}` }}
      >
        <CartaNapoletana
          valore={mostra.carta.valore}
          seme={mostra.carta.seme}
          className="h-[46vh] max-h-[420px] w-auto rounded-xl border border-white/30"
        />
      </div>
    </div>
  );
}

RivelazioneCarta.propTypes = {
  carta: PropTypes.shape({ valore: PropTypes.string, seme: PropTypes.string }),
};

export default RivelazioneCarta;
