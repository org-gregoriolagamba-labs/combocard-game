/**
 * Coriandoli Component
 *
 * A burst of confetti when the player wins a collection. Made of a few
 * absolutely positioned pieces moved by one CSS animation: no library, no canvas.
 * It never blocks a tap and it does nothing when the player asks for less movement.
 */

import React from "react";
import PropTypes from "prop-types";

const COLORI = ["#ffcf4a", "#ff6a55", "#6f97ff", "#3ddc97", "#f4f1ea"];
const PEZZI = 28;

// Deterministic pseudo-random numbers, so the burst looks the same at every render
const seme = (i) => {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

function Coriandoli({ id }) {
  return (
    <div
      key={id}
      aria-hidden="true"
      data-testid="coriandoli"
      className="pointer-events-none fixed inset-x-0 top-[38%] z-50 flex justify-center motion-reduce:hidden"
    >
      {Array.from({ length: PEZZI }).map((_, i) => {
        const angolo = (i / PEZZI) * Math.PI * 2 + seme(i) * 0.6;
        const raggio = 120 + seme(i + 40) * 170;
        return (
          <span
            key={i}
            className="absolute h-2.5 w-1.5 animate-coriandolo rounded-[1px]"
            style={{
              backgroundColor: COLORI[i % COLORI.length],
              "--dx": `${Math.cos(angolo) * raggio}px`,
              "--dy": `${Math.sin(angolo) * raggio * 0.9 + 40}px`,
              "--rot": `${(seme(i + 80) - 0.5) * 900}deg`,
              animationDelay: `${seme(i + 120) * 120}ms`,
            }}
          />
        );
      })}
    </div>
  );
}

Coriandoli.propTypes = { id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]) };

export default Coriandoli;
