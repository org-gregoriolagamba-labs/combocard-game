import { Users, Trophy, Coins } from "lucide-react";

export default function PlayersList({ game, currentPlayerId }) {
  const collezioniIcons = {
    tris: "🎯",
    sequenza: "📊",
    scopa: "🎴",
    napola: "💎",
    combocard_reale: "👑"
  };

  return (
    <div className="bg-amber-50 rounded-2xl shadow-2xl p-6 border-4 border-amber-600">
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-green-900">
        <Users size={24} />
        Giocatori ({game?.players?.length || 0})
      </h3>

      <div className="space-y-2">
        {game?.players?.map((player) => (
          <div
            key={player.id}
            className={`p-3 rounded-xl border-2 ${
              player.id === currentPlayerId
                ? "bg-green-100 border-green-400"
                : "bg-white border-green-200"
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <div className="font-bold text-green-900">
                {player.name}
                {player.id === currentPlayerId && " (Tu)"}
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-sm font-bold text-green-600">
                  <Coins size={16} />
                  {player.gettoni}
                </div>
              </div>
            </div>

            {player.collezioni && player.collezioni.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {player.collezioni.map((col) => (
                  <span
                    key={col}
                    className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full font-bold"
                  >
                    {collezioniIcons[col]} {col.toUpperCase().replace("_", " ")}
                  </span>
                ))}
              </div>
            )}

            {player.jollyUsato && (
              <div className="mt-1 text-xs text-purple-600 font-bold">
                ✨ Jolly usato
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}