/**
 * CollezioniPanel Component
 *
 * The five collections as information: the shape each one draws on the sheet,
 * how close the player is, the prize, and who won it. The server awards a
 * collection by itself as soon as it is complete, so there is nothing to
 * claim: the only action is the jolly, offered only where it can work.
 */

import React from "react";
import PropTypes from "prop-types";
import { Sparkles } from "lucide-react";
import { calcolaProgresso } from "../../utils";
import { Disclosure } from "../common";
import FiguraCollezione from "./FiguraCollezione";
import RegoleGioco from "./RegoleGioco";

const COLLEZIONI = [
  { tipo: "tris", label: "TRIS", regola: "Tre carte con lo stesso valore" },
  { tipo: "sequenza", label: "SEQUENZA", regola: "Quattro valori di fila, semi qualsiasi" },
  { tipo: "scopa", label: "SCOPA", regola: "Cinque carte dello stesso seme" },
  { tipo: "napola", label: "NAPOLA", regola: "Tre carte con lo stesso valore e due con un altro" },
  { tipo: "combocard_reale", label: "COMBOCARD REALE", regola: "Quattro valori di fila dello stesso seme: vinci tutto" },
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
  jollyPossibili = null,
  jollyBloccatoDa = null,
  onJollyMode,
  isGameFinished = false,
}) {
  return (
    <div className="superficie p-4 lg:p-6">
      <div className="mb-2 flex items-center justify-between gap-2 lg:mb-4">
        <h3 className="titolo text-lg text-testo lg:text-xl">Collezioni</h3>
        {currentPlayer?.jollyUsato && (
          <p className="flex items-center gap-1 text-xs font-bold text-testo-2">
            <Sparkles size={14} aria-hidden="true" />
            Jolly usato
          </p>
        )}
      </div>

      <ul>
        {COLLEZIONI.map(({ tipo, label, regola }) => {
          const collezione = game?.collezioni[tipo];
          const ammontare = game?.collezioniDistribuzione[tipo];
          const vinta = Boolean(collezione?.vinto);
          const progresso = calcolaProgresso(currentPlayer, tipo);
          const vicina = progresso.total - progresso.count === 1;
          const nonSubito = jollyPossibili ? !(jollyPossibili[tipo] > 0) : false;
          const canJolly = !currentPlayer?.jollyUsato && !vinta && !isGameFinished;

          return (
            <li
              key={tipo}
              data-testid={`collezione-${tipo}`}
              className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 border-t-2 border-linea py-3 first:border-t-0 first:pt-0"
            >
              <FiguraCollezione tipo={tipo} className="h-14 w-11" />

              <div className="min-w-0">
                <p className="flex flex-wrap items-baseline gap-x-2 text-sm font-bold text-testo">
                  {label}
                  <span className="text-xs font-bold tabular-nums text-testo-2">
                    Premio {ammontare}
                  </span>
                </p>
                <p className="text-xs text-testo-2 [text-wrap:pretty]">{regola}</p>

                {vinta ? (
                  <p className="mt-1 break-words text-xs font-bold text-bastoni">
                    Vinta da {nomiVincitori(game, collezione)}
                  </p>
                ) : (
                  <div className="mt-1 flex items-center gap-2">
                    <div className="flex items-center gap-0.5" aria-hidden="true">
                      {Array.from({ length: progresso.total }).map((_, i) => (
                        <div
                          key={i}
                          className={`h-2 w-4 rounded-sm border border-linea-forte ${
                            i < progresso.count ? "bg-oro" : "bg-notte-950"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs font-bold tabular-nums text-testo">
                      {progresso.count}/{progresso.total}
                      {vicina && " · ne manca 1"}
                    </span>
                  </div>
                )}
              </div>

              {canJolly &&
                (jollyBloccatoDa ? (
                  <button
                    type="button"
                    disabled
                    aria-label={`Jolly per ${label}: aspetta, ${jollyBloccatoDa} sta scegliendo il Jolly`}
                    className="min-h-[44px] min-w-[64px] rounded-lg border-2 border-dashed border-linea px-3 text-sm font-bold text-testo-3"
                  >
                    Jolly
                  </button>
                ) : nonSubito ? (
                  <button
                    type="button"
                    disabled
                    aria-label={`Jolly per ${label}: non ancora possibile, ti manca più di una carta`}
                    className="min-h-[44px] min-w-[64px] rounded-lg border-2 border-dashed border-linea px-3 text-sm font-bold text-testo-3"
                  >
                    Jolly
                  </button>
                ) : (
                  <button
                    type="button"
                    aria-label={`Usa il Jolly per ${label}`}
                    onClick={() => onJollyMode(tipo)}
                    className="min-h-[44px] min-w-[64px] rounded-lg bg-oro px-3 text-sm font-bold text-inchiostro-900 transition hover:bg-oro-dark"
                  >
                    Jolly
                  </button>
                ))}
            </li>
          );
        })}
      </ul>

      <Disclosure
        title="Come si gioca"
        className="mt-1 border-t-2 border-linea lg:mt-2"
      >
        <RegoleGioco game={game} />
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
  jollyPossibili: PropTypes.object,
  jollyBloccatoDa: PropTypes.string,
  onJollyMode: PropTypes.func.isRequired,
  isGameFinished: PropTypes.bool,
};

export default CollezioniPanel;
