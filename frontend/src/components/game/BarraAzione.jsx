/**
 * BarraAzione Component
 *
 * The main action of the game screen. The creator draws, the other players
 * see who draws, the jolly mode shows its instruction or asks for the
 * confirmation (saying which card becomes which), and a finished game offers
 * the way back to the hall. GameScreen puts it in a bar fixed at the bottom
 * of a phone screen and inside the side panel on wide screens.
 */

import React from "react";
import PropTypes from "prop-types";
import { Clock, Dices, Sparkles } from "lucide-react";

const COOLDOWN_SECONDS = 8;

const PULSANTE =
  "min-h-[52px] w-full rounded-xl px-4 font-bold transition focus-visible:outline-offset-2";

function BarraAzione({
  isCreator,
  creatorName = "",
  status,
  drawCooldown = 0,
  jollyMode = null,
  jollyPending = null,
  jollyConversione = null,
  jollyScelte = null,
  variant = "bar",
  onDraw,
  onCancelJolly,
  onConfirmJolly,
  onChangeJollyCard,
  onLeave,
}) {
  if (status === "finished") {
    return (
      <div className="flex flex-col gap-2">
        <div>
          <p className="titolo text-lg text-testo">Partita terminata</p>
          <p className="text-sm text-testo-2">Torna alla Hall per iniziare una nuova partita</p>
        </div>
        <button
          type="button"
          onClick={onLeave}
          className={`${PULSANTE} bg-oro text-inchiostro-900 shadow-md hover:bg-oro-dark`}
        >
          Torna alla Hall
        </button>
      </div>
    );
  }

  const canDraw = status === "playing" && drawCooldown === 0;
  const tipo = jollyMode ? jollyMode.toUpperCase().replace("_", " ") : "";

  // Esc takes one step back: from the question to the choice, from the choice out of the mode
  const handleKeyDown = (event) => {
    if (event.key !== "Escape") return;
    event.stopPropagation();
    (jollyPending ? onChangeJollyCard : onCancelJolly)();
  };

  return (
    <div className="flex flex-col gap-2">
      {jollyMode && (
        <div
          role="group"
          aria-label={jollyPending ? "Conferma Jolly" : "Modalità Jolly"}
          onKeyDown={handleKeyDown}
          className="rounded-xl bg-oro px-3 py-2 text-inchiostro-900"
        >
          {jollyPending ? (
            <>
              <p aria-live="polite" className="text-sm font-bold [text-wrap:balance]">
                Per {tipo}, il Jolly cambia {jollyPending.valore} di {jollyPending.seme}
                {jollyConversione
                  ? ` in ${jollyConversione.valore} di ${jollyConversione.seme}`
                  : ""}
                . Usarlo?
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  autoFocus
                  onClick={onConfirmJolly}
                  className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-lg bg-inchiostro-900 px-3 text-sm font-bold text-testo transition hover:bg-notte-600"
                >
                  <Sparkles size={16} aria-hidden="true" />
                  Usa Jolly
                </button>
                <button
                  type="button"
                  onClick={onChangeJollyCard}
                  className="min-h-[44px] flex-1 rounded-lg border-2 border-linea-forte bg-notte-700 px-3 text-sm font-bold text-testo transition hover:bg-notte-600"
                >
                  Cambia carta
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <p aria-live="polite" className="min-w-0 text-sm font-bold [text-wrap:balance]">
                Jolly per {tipo}: tocca una carta evidenziata
                {typeof jollyScelte === "number" ? ` (${jollyScelte})` : ""}
              </p>
              <button
                type="button"
                autoFocus
                onClick={onCancelJolly}
                className="min-h-[44px] shrink-0 rounded-lg border-2 border-linea-forte bg-notte-700 px-4 text-sm font-bold text-testo transition hover:bg-notte-600"
              >
                Annulla
              </button>
            </div>
          )}
        </div>
      )}

      {isCreator ? (
        <button
          type="button"
          onClick={onDraw}
          disabled={!canDraw}
          className={`${PULSANTE} relative overflow-hidden bg-oro text-inchiostro-900 shadow-md hover:bg-oro-dark disabled:cursor-not-allowed disabled:bg-notte-600`}
        >
          {drawCooldown > 0 && (
            <span
              aria-hidden="true"
              className="absolute inset-y-0 left-0 bg-black/25 transition-all duration-1000 ease-linear motion-reduce:transition-none"
              style={{ width: `${(drawCooldown / COOLDOWN_SECONDS) * 100}%` }}
            />
          )}
          <span className="relative flex items-center justify-center gap-2 tabular-nums">
            {drawCooldown > 0 ? (
              <>
                <Clock size={20} aria-hidden="true" />
                Attendi {drawCooldown}s
              </>
            ) : (
              <>
                <Dices size={20} aria-hidden="true" />
                Estrai Carta
              </>
            )}
          </span>
        </button>
      ) : (
        <p
          role="status"
          className="flex min-h-[52px] items-center justify-center gap-2 rounded-xl border-2 border-linea-forte bg-notte-700 px-4 font-bold text-testo"
        >
          <Clock size={20} aria-hidden="true" />
          Estrae {creatorName}
        </p>
      )}

      {variant === "panel" && drawCooldown > 0 && (
        <p className="text-center text-xs font-bold text-testo-2">
          Usa questo tempo per valutare il Jolly
        </p>
      )}
    </div>
  );
}

BarraAzione.propTypes = {
  isCreator: PropTypes.bool.isRequired,
  creatorName: PropTypes.string,
  status: PropTypes.string,
  drawCooldown: PropTypes.number,
  jollyMode: PropTypes.string,
  jollyPending: PropTypes.shape({
    valore: PropTypes.string,
    seme: PropTypes.string,
  }),
  jollyConversione: PropTypes.shape({
    valore: PropTypes.string,
    seme: PropTypes.string,
  }),
  jollyScelte: PropTypes.number,
  variant: PropTypes.oneOf(["bar", "panel"]),
  onDraw: PropTypes.func.isRequired,
  onCancelJolly: PropTypes.func.isRequired,
  onConfirmJolly: PropTypes.func.isRequired,
  onChangeJollyCard: PropTypes.func.isRequired,
  onLeave: PropTypes.func.isRequired,
};

export default BarraAzione;
