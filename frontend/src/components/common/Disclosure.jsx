/**
 * Disclosure Component
 *
 * Section that opens and closes from a button. On wide screens it can start
 * open, so the same content is always visible there and collapsed on a phone.
 */

import React, { useId, useState } from "react";
import PropTypes from "prop-types";
import { ChevronDown } from "lucide-react";

const DESKTOP_QUERY = "(min-width: 1024px)";

const isDesktop = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia(DESKTOP_QUERY)?.matches === true;

function Disclosure({
  title,
  defaultOpen = false,
  openOnDesktop = false,
  className = "",
  children,
}) {
  const [open, setOpen] = useState(() => defaultOpen || (openOnDesktop && isDesktop()));
  const panelId = useId();

  return (
    <div className={className}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-[44px] w-full items-center justify-between gap-2 rounded-lg text-left font-bold text-green-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700"
      >
        <span className="flex items-center gap-2">{title}</span>
        <ChevronDown
          size={20}
          aria-hidden="true"
          className={`shrink-0 transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
        />
      </button>
      <div id={panelId} hidden={!open}>
        {children}
      </div>
    </div>
  );
}

Disclosure.propTypes = {
  title: PropTypes.node.isRequired,
  defaultOpen: PropTypes.bool,
  openOnDesktop: PropTypes.bool,
  className: PropTypes.string,
  children: PropTypes.node,
};

export default Disclosure;
