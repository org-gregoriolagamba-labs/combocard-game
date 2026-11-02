/**
 * Credito Component
 *
 * The token of the game credits, drawn as a lentil (an oval, not a round coin):
 * the tombola counted with lentils and beans, and these credits are play money.
 * It is never confused with the Denari suit.
 */

import React from "react";
import PropTypes from "prop-types";

function Credito({ className = "h-4 w-4" }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className={className}>
      <ellipse cx="10" cy="10" rx="8.6" ry="5.6" transform="rotate(-28 10 10)" fill="#f2b632" stroke="#2a1a0f" strokeWidth="1.6" />
      <path d="M6.6 11.2 Q10.4 7.4 13.8 9" fill="none" stroke="#2a1a0f" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

Credito.propTypes = { className: PropTypes.string };

export default Credito;
