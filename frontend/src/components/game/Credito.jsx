/**
 * Credito Component
 *
 * The token of the game credits, drawn as a lentil: the tombola counted with
 * lentils and beans, and these credits are play money. It is not a coin, so it
 * is never confused with the Denari suit.
 */

import React from "react";
import PropTypes from "prop-types";

function Credito({ className = "h-4 w-4" }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className={className}>
      <circle cx="10" cy="10" r="8.5" fill="#f2b632" stroke="#2a1a0f" strokeWidth="1.6" />
      <path d="M6 10.5 Q10 5.5 14 10.5" fill="none" stroke="#2a1a0f" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

Credito.propTypes = { className: PropTypes.string };

export default Credito;
