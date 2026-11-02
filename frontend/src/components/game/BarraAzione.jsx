/**
 * BarraAzione Component
 *
 * The main action of the game screen. The creator draws, the other players
 * see who draws, the jolly mode shows its instruction or asks for the
 * confirmation, and a finished game offers the way back to the hall.
 * GameScreen puts it in a bar fixed at the bottom of a phone screen and
 * inside the last-card panel on wide screens.
 */

import React from "react";
import PropTypes from "prop-types";

const COOLDOWN_SECONDS = 8;

function BarraAzione({
  isCreator,
  creatorName = "",
  status,
  drawCooldown = 0,
  jollyMode = null,
  jollyPending = null,
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
          <p className="font-bold text-green-900">🏆 PARTITA TERMINATA!</p>
          <p className="text-sm text-green-800">Torna alla Hall per iniziare una nuova partita</p>
        </div>
        <button
          type="button"
          onClick={onLeave}
          className="min-h-[52px] w-full rounded-xl bg-gradient-to-r from-green-700 to-green-900 px-4 font-bold text-white shadow-lg transition hover:from-green-800 hover:to-green-900"
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
          className="rounded-xl bg-yellow-300 px-3 py-2 text-yellow-900"
        >
          {jollyPending ? (
            <>
              <p aria-live="polite" className="text-sm font-bold [text-wrap:balance]">
                🎯 Usare il Jolly per {tipo} sulla carta {jollyPending.valore} di {jollyPending.seme}?
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  autoFocus
                  onClick={onConfirmJolly}
                  className="min-h-[44px] flex-1 rounded-lg bg-green-800 px-3 text-sm font-bold text-white transition hover:bg-green-900"
                >
                  Usa Jolly
                </button>
                <button
                  type="button"
                  onClick={onChangeJollyCard}
                  className="min-h-[44px] flex-1 rounded-lg bg-white px-3 text-sm font-bold text-yellow-950 ring-2 ring-yellow-700 transition hover:bg-yellow-50"
                >
                  Cambia carta
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <p aria-live="polite" className="min-w-0 text-sm font-bold">
                🎯 Jolly per {tipo}: tocca una carta non coperta
              </p>
              <button
                type="button"
                autoFocus
                onClick={onCancelJolly}
                className="min-h-[44px] shrink-0 rounded-lg bg-red-700 px-4 text-sm font-bold text-white transition hover:bg-red-800"
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
          className="relative min-h-[52px] w-full overflow-hidden rounded-xl bg-gradient-to-r from-green-700 to-green-900 px-4 font-bold text-white shadow-lg transition hover:from-green-800 hover:to-green-900 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {drawCooldown > 0 && (
            <span
              aria-hidden="true"
              className="absolute inset-y-0 left-0 bg-black/25 transition-all duration-1000 ease-linear motion-reduce:transition-none"
              style={{ width: `${(drawCooldown / COOLDOWN_SECONDS) * 100}%` }}
            />
          )}
          <span className="relative tabular-nums">
            {drawCooldown > 0 ? `⏱️ Attendi ${drawCooldown}s` : "🎲 Estrai Carta"}
          </span>
        </button>
      ) : (
        <p
          role="status"
          className="flex min-h-[52px] items-center justify-center rounded-xl bg-green-100 px-4 font-bold text-green-900"
        >
          ⏳ Estrae {creatorName}
        </p>
      )}

      {variant === "panel" && drawCooldown > 0 && (
        <p className="text-center text-xs font-bold text-yellow-900">
          💡 Usa questo tempo per valutare il Jolly
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
  variant: PropTypes.oneOf(["bar", "panel"]),
  onDraw: PropTypes.func.isRequired,
  onCancelJolly: PropTypes.func.isRequired,
  onConfirmJolly: PropTypes.func.isRequired,
  onChangeJollyCard: PropTypes.func.isRequired,
  onLeave: PropTypes.func.isRequired,
};

export default BarraAzione;
