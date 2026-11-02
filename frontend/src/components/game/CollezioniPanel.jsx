/**
 * CollezioniPanel Component
 * 
 * The five collections as information: how close the player is, the prize,
 * and who won it. The server awards a collection by itself as soon as it is
 * complete, so there is nothing to claim: the only action is the jolly.
 */

import React from "react";
import PropTypes from "prop-types";
import { Trophy } from "lucide-react";
import { calcolaProgresso } from "../../utils";
import { Disclosure } from "../common";

const COLLEZIONI = [
  { tipo: "tris", label: "TRIS", icon: "🎯" },
  { tipo: "sequenza", label: "SEQUENZA", icon: "📊" },
  { tipo: "scopa", label: "SCOPA", icon: "🎴" },
  { tipo: "napola", label: "NAPOLA", icon: "💎" },
  { tipo: "combocard_reale", label: "COMBOCARD REALE", icon: "👑" },
];

// A collection can be won by one player or by several together
const nomiVincitori = (game, collezione) => {
  const nomi = []
    .concat(collezione.vincitore ?? [])
    .map((id) => game?.players?.find((p) => p.id === id)?.name)
    .filter(Boolean);

  return nomi.length > 0 ? nomi.join(", ") : "un giocatore";
};

function CollezioniPanel({
  game = null,
  currentPlayer = null,
  onJollyMode,
  isGameFinished = false,
}) {
  return (
    <div className="bg-amber-50 rounded-2xl shadow-2xl p-3 lg:p-6 border-2 lg:border-4 border-amber-600">
      <div className="mb-2 lg:mb-4 flex items-center justify-between gap-2">
        <h3 className="text-base lg:text-lg font-bold flex items-center gap-2 text-green-900">
          <Trophy size={24} aria-hidden="true" />
          Collezioni
        </h3>
        {currentPlayer?.jollyUsato && (
          <p className="text-xs font-bold text-green-800">✨ Jolly usato</p>
        )}
      </div>

      <ul>
        {COLLEZIONI.map(({ tipo, label, icon }) => {
          const collezione = game?.collezioni[tipo];
          const ammontare = game?.collezioniDistribuzione[tipo];
          const isReale = tipo === "combocard_reale";
          const vinta = Boolean(collezione?.vinto);
          const progresso = calcolaProgresso(currentPlayer, tipo);
          const canJolly = !currentPlayer?.jollyUsato && !vinta && !isGameFinished;

          return (
            <li
              key={tipo}
              data-testid={`collezione-${tipo}`}
              className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-3 border-t-2 border-green-200 py-2 first:border-t-0 first:pt-0 lg:py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-bold text-green-900">
                  {icon} {label}
                </p>

                {vinta ? (
                  <p className="text-xs font-bold text-green-800 break-words">
                    ✓ Vinta da {nomiVincitori(game, collezione)}
                  </p>
                ) : (
                  <div className="mt-1 flex items-center gap-2">
                    <div className="flex items-center space-x-1" aria-hidden="true">
                      {Array.from({ length: progresso.total }).map((_, i) => (
                        <div
                          key={i}
                          className={`w-5 h-2 rounded ${
                            i < progresso.count
                              ? progresso.status === "near"
                                ? "bg-green-600"
                                : progresso.status === "mid"
                                ? "bg-yellow-500"
                                : "bg-gray-500"
                              : "bg-gray-200"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs font-bold tabular-nums text-green-800">
                      {progresso.count}/{progresso.total}
                    </span>
                  </div>
                )}
              </div>

              <p className="text-right text-xs text-green-800">
                Premio{" "}
                <span className="text-sm font-bold tabular-nums text-green-700">
                  {ammontare}
                  {isReale && " 🏆"}
                </span>
              </p>

              {canJolly && (
                <button
                  type="button"
                  aria-label={`Usa il Jolly per ${label}`}
                  onClick={() => onJollyMode(tipo)}
                  className="min-h-[44px] min-w-[64px] rounded-lg bg-yellow-400 px-3 text-sm font-bold text-yellow-900 transition hover:bg-yellow-500"
                >
                  Jolly
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <Disclosure
        openOnDesktop
        title="📖 Come si gioca"
        className="mt-3 lg:mt-4 rounded-xl bg-green-100 px-3"
      >
        <ul className="space-y-1 pb-3 text-xs text-green-800">
          <li>• TRIS: 3 stesso valore</li>
          <li>• SEQUENZA: 4 in fila</li>
          <li>• SCOPA: 5 stesso seme</li>
          <li>• NAPOLA: Tris + Coppia</li>
          <li>• COMBOCARD REALE: 4 in fila stesso seme = VINCI! 👑</li>
        </ul>
      </Disclosure>
    </div>
  );
}

CollezioniPanel.propTypes = {
  game: PropTypes.shape({
    collezioni: PropTypes.object,
    collezioniDistribuzione: PropTypes.object,
    status: PropTypes.string,
    players: PropTypes.arrayOf(
      PropTypes.shape({ id: PropTypes.string, name: PropTypes.string })
    ),
  }),
  currentPlayer: PropTypes.shape({
    jollyUsato: PropTypes.bool,
    coperte: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.bool)),
    cartella: PropTypes.array,
  }),
  onJollyMode: PropTypes.func.isRequired,
  isGameFinished: PropTypes.bool,
};

export default CollezioniPanel;
