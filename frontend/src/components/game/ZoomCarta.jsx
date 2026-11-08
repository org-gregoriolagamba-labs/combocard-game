/**
 * ZoomCarta Component
 *
 * One card of the 1875 deck, big, in a dialog: opened on request from the sheet and
 * from the list of the cards drawn. It is the Modal of the app (focus kept inside, Esc
 * and a tap outside close it, the focus goes back to what opened it). When it is given
 * the neighbours it shows two arrows, and the arrow keys do the same. The big file is
 * loaded only now (CartaNapoletana prints the name if it is missing).
 */

import React, { useEffect } from "react";
import PropTypes from "prop-types";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Modal } from "../common";
import CartaNapoletana from "./CartaNapoletana";

const freccia =
  "flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-linea-forte bg-notte-700 text-testo hover:bg-notte-600";

function ZoomCarta({ carta, stato = null, posizione = null, onClose, onPiuRecente = null, onMenoRecente = null }) {
  const nome = `${carta.valore} di ${carta.seme}`;
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "ArrowLeft" && onPiuRecente) onPiuRecente();
      if (event.key === "ArrowRight" && onMenoRecente) onMenoRecente();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onPiuRecente, onMenoRecente]);

  return (
    <Modal isOpen onClose={onClose} title={nome} className="max-w-sm">
      <div className="flex flex-col items-center gap-3">
        <CartaNapoletana
          valore={carta.valore}
          seme={carta.seme}
          className="h-auto max-h-[58dvh] w-auto max-w-full rounded-xl shadow-carta"
        />
        {stato && <p className="text-sm font-bold text-testo-2">{stato}</p>}

        {(onPiuRecente || onMenoRecente) && (
          <div className="flex w-full items-center justify-between gap-3">
            {onPiuRecente ? (
              <button type="button" aria-label="Più recente" onClick={onPiuRecente} className={freccia}>
                <ChevronLeft aria-hidden="true" size={22} />
              </button>
            ) : (
              <span className="min-w-[44px]" />
            )}
            {posizione && <span className="text-sm tabular-nums text-testo-2">{posizione}</span>}
            {onMenoRecente ? (
              <button type="button" aria-label="Meno recente" onClick={onMenoRecente} className={freccia}>
                <ChevronRight aria-hidden="true" size={22} />
              </button>
            ) : (
              <span className="min-w-[44px]" />
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

ZoomCarta.propTypes = {
  carta: PropTypes.shape({ valore: PropTypes.string.isRequired, seme: PropTypes.string.isRequired }).isRequired,
  stato: PropTypes.string,
  posizione: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  onPiuRecente: PropTypes.func,
  onMenoRecente: PropTypes.func,
};

export default ZoomCarta;
