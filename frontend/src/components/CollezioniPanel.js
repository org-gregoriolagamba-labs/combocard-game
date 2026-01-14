import { Trophy } from "lucide-react";
import { calcolaProgresso } from "../utils/progressoUtils";

export default function CollezioniPanel({
  game,
  currentPlayer,
  onClaim,
  onJollyMode,
}) {
  const collezioni = [
    { tipo: "tris", label: "TRIS", icon: "🎯" },
    { tipo: "sequenza", label: "SEQUENZA", icon: "📊" },
    { tipo: "scopa", label: "SCOPA", icon: "🎴" },
    { tipo: "napola", label: "NAPOLA", icon: "💎" },
    { tipo: "combocard_reale", label: "COMBOCARD REALE", icon: "👑" },
  ];

  return (
    <div className="bg-amber-50 rounded-2xl shadow-2xl p-6 border-4 border-amber-600">
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-green-900">
        <Trophy size={24} />
        Collezioni
      </h3>

      <div className="space-y-3">
        {collezioni.map(({ tipo, label, icon }) => {
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
              className="border-2 border-green-200 rounded-xl p-3 bg-white"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <button
                  onClick={() => onClaim(tipo)}
                  disabled={collezione?.vinto || game?.status !== "playing"}
                  className={`flex-1 text-left py-2 px-3 rounded-lg font-bold transition text-sm ${
                    collezione?.vinto
                      ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                      : isReale
                      ? "bg-gradient-to-r from-yellow-500 to-orange-600 text-white hover:from-yellow-600 hover:to-orange-700 shadow-lg"
                      : "bg-gradient-to-r from-green-600 to-green-800 text-white hover:from-green-700 hover:to-green-900"
                  }`}
                >
                  {icon} {label}
                </button>

                {!currentPlayer.jollyUsato && !collezione?.vinto && (
                  <button
                    onClick={() => onJollyMode(tipo)}
                    className="bg-yellow-400 text-yellow-900 px-3 py-2 rounded-lg font-bold text-xs hover:bg-yellow-500 transition"
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

                <div className="text-right">
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

      <div className="bg-green-100 rounded-xl p-3 text-xs border-2 border-green-600 mt-4">
        <h4 className="font-bold mb-2 text-green-900">📖 Collezioni:</h4>
        <ul className="space-y-1 text-green-800">
          <li>• TRIS: 3 stesso valore</li>
          <li>• SEQUENZA: 4 in fila</li>
          <li>• SCOPA: 5 stesso seme</li>
          <li>• NAPOLA: Tris + Coppia</li>
          <li>• COMBOCARD REALE: 4 in fila stesso seme = VINCI! 👑</li>
        </ul>
      </div>
    </div>
  );
}