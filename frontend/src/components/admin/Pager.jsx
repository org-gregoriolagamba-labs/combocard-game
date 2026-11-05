/**
 * Pager Component
 *
 * Previous and next page, with "Pagina X di Y". Nothing is shown when everything fits in one page.
 */

import React from "react";
import PropTypes from "prop-types";

function Pager({ page, total, limit, onPage, disabled = false }) {
  const pages = Math.max(1, Math.ceil(total / limit));
  if (pages <= 1) {
    return null;
  }

  const button =
    "min-h-[44px] rounded-xl border-2 border-linea-forte bg-notte-700 px-4 font-bold text-testo transition hover:bg-notte-600 disabled:cursor-not-allowed disabled:border-transparent disabled:bg-notte-600 disabled:text-testo-3";

  return (
    <nav aria-label="Pagine" className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t-2 border-linea pt-3">
      <button
        type="button"
        aria-label="Pagina precedente"
        className={button}
        disabled={disabled || page <= 1}
        onClick={() => onPage(page - 1)}
      >
        Precedente
      </button>
      <p className="text-sm font-bold tabular-nums text-testo-2">{`Pagina ${page} di ${pages}`}</p>
      <button
        type="button"
        aria-label="Pagina successiva"
        className={button}
        disabled={disabled || page >= pages}
        onClick={() => onPage(page + 1)}
      >
        Successiva
      </button>
    </nav>
  );
}

Pager.propTypes = {
  page: PropTypes.number.isRequired,
  total: PropTypes.number.isRequired,
  limit: PropTypes.number.isRequired,
  onPage: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

export default Pager;
