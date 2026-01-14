import { SEMI_COLORS } from "../config";

export default function Cartella({
  cartella,
  coperte,
  jollyPos,
  jollyMode,
  jollyUsato,
  onCardClick,
}) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {cartella.map((row, r) =>
        row.map((carta, c) => {
          const coperta = coperte[r][c];
          const isJolly = jollyPos && jollyPos.row === r && jollyPos.col === c;
          const wasJolly = carta.wasJolly;
          const gradientClass = SEMI_COLORS[carta.seme];
          const isClickable = jollyMode && !coperta && !jollyUsato;

          return (
            <div
              key={`${r}-${c}`}
              onClick={() => isClickable && onCardClick(r, c)}
              className={`aspect-square rounded-xl relative flex flex-col items-center justify-center text-center p-2 transition-all duration-300 bg-gradient-to-br ${gradientClass} border-2 border-amber-200 shadow-md ${
                isClickable
                  ? "cursor-pointer hover:scale-105 ring-4 ring-yellow-400"
                  : ""
              }`}
            >
              <div className="text-3xl mb-1 select-none" aria-hidden="true">
                {carta.emoji}
              </div>
              <div className="text-xs font-bold text-white">{carta.valore}</div>

              {isJolly && (
                <div className="absolute top-2 right-2 bg-yellow-300 text-yellow-900 text-xs px-2 py-1 rounded-full font-bold">
                  {wasJolly ? "USATO" : "JOLLY"}
                </div>
              )}

              {coperta && (
                <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center rounded-xl pointer-events-none">
                  <div className="bg-white bg-opacity-20 text-white px-3 py-1 rounded-full font-bold">
                    Estratta ✓
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}