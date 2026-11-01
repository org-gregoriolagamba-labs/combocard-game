/**
 * CollezioniPanel Component
 *
 * Panel displaying all collection types and their progress.
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

function CollezioniPanel({
  game = null,
  currentPlayer = null,
  onClaim,
  onJollyMode,
  isGameFinished = false,
}) {
  return (
    <div className="bg-amber-50 rounded-2xl shadow-2xl p-3 lg:p-6 border-2 lg:border-4 border-amber-600">
      <h3 className="text-base lg:text-lg font-bold mb-2 lg:mb-4 flex items-center gap-2 text-green-900">
        <Trophy size={24} aria-hidden="true" />
        Collezioni
      </h3>

      <div className="space-y-2 lg:space-y-3">
        {COLLEZIONI.map(({ tipo, label, icon }) => {
          const collezione = game?.collezioni[tipo];
          const ammontare = game?.collezioniDistribuzione[tipo];
          const isReale = tipo === "combocard_reale";
          const progresso = calcolaProgresso(currentPlayer, tipo);
          const colorDot =
            progresso.status === "near"
              ? "bg-green-500"
              : progresso.status === "mid"
              ? "bg-yellow-400"
              : "bg-gray-300";

          return (
            <div
              key={tipo}
              className="border-2 border-green-200 rounded-xl p-2 lg:p-3 bg-white"
            >
              <div className="flex items-center justify-between gap-2 mb-1.5 lg:mb-2">
                <button
                  onClick={() => onClaim(tipo)}
                  disabled={isGameFinished || collezione?.vinto || game?.status !== "playing"}
                  className={`flex-1 min-h-[44px] text-left py-2 px-3 rounded-lg font-bold transition text-sm ${
                    collezione?.vinto || isGameFinished
                      ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                      : isReale
                      ? "bg-gradient-to-r from-yellow-500 to-orange-600 text-white hover:from-yellow-600 hover:to-orange-700 shadow-lg"
                      : "bg-gradient-to-r from-green-600 to-green-800 text-white hover:from-green-700 hover:to-green-900"
                  }`}
                >
                  {icon} {label}
                </button>

                {!currentPlayer.jollyUsato && !collezione?.vinto && !isGameFinished && (
                  <button
                    onClick={() => onJollyMode(tipo)}
                    className="min-h-[44px] bg-yellow-400 text-yellow-900 px-3 py-2 rounded-lg font-bold text-xs hover:bg-yellow-500 transition"
                  >
                    Usa Jolly
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: progresso.total }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-6 h-2 rounded ${
                          i < progresso.count
                            ? progresso.status === "near"
                              ? "bg-green-500"
                              : progresso.status === "mid"
                              ? "bg-yellow-400"
                              : "bg-gray-400"
                            : "bg-gray-200"
                        }`}
                      />
                    ))}
                  </div>
                  <div className="text-xs text-green-700 font-bold">
                    {progresso.count}/{progresso.total}
                  </div>
                  <div
                    className={`w-3 h-3 rounded-full ${colorDot}`}
                    title={
                      progresso.status === "near"
                        ? "Quasi completo"
                        : progresso.status === "mid"
                        ? "A metà strada"
                        : "Lontano"
                    }
                  />
                </div>

                <div className="flex items-baseline gap-1.5 lg:block lg:text-right">
                  <p className="text-xs text-green-700">Premio</p>
                  <p className="font-bold text-green-600 text-sm">
                    {ammontare}
                    {isReale && " 🏆"}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Disclosure
        openOnDesktop
        title="📖 Come si gioca"
        className="mt-3 lg:mt-4 rounded-xl border-2 border-green-600 bg-green-100 px-3"
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
  }),
  currentPlayer: PropTypes.shape({
    jollyUsato: PropTypes.bool,
    coperte: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.bool)),
    cartella: PropTypes.array,
  }),
  onClaim: PropTypes.func.isRequired,
  onJollyMode: PropTypes.func.isRequired,
  isGameFinished: PropTypes.bool,
};

export default CollezioniPanel;
