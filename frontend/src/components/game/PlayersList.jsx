/**
 * PlayersList Component
 *
 * Displays the list of players in the current game.
 * On a phone it starts collapsed: the players matter less than the sheet.
 */

import React from "react";
import PropTypes from "prop-types";
import { Sparkles } from "lucide-react";
import { Disclosure } from "../common";
import Credito from "./Credito";

const NOME_COLLEZIONE = (col) => col.toUpperCase().replace("_", " ");

function PlayersList({ game = null, currentPlayerId = null }) {
  return (
    <div className="superficie px-4 py-1 lg:px-6 lg:py-3">
      <Disclosure
        openOnDesktop
        title={
          <span className="titolo text-lg">
            Giocatori ({game?.players?.length || 0})
          </span>
        }
      >
        <ul className="space-y-1 pb-3">
          {game?.players?.map((player) => (
            <li
              key={player.id}
              className={`rounded-xl p-3 ${player.id === currentPlayerId ? "bg-notte-700" : ""}`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 break-words font-bold text-testo">
                  {player.name}
                  {player.id === currentPlayerId && " (Tu)"}
                  {game?.turno?.playerId === player.id && (
                    <span className="ml-2 rounded-full bg-notte-600 px-2 py-0.5 align-middle text-xs font-bold text-testo">
                      Estrae
                    </span>
                  )}
                </p>
                <p className="flex items-center gap-1 text-sm font-bold tabular-nums text-testo">
                  <Credito />
                  {player.gettoni}
                </p>
              </div>

              {player.collezioni && player.collezioni.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {player.collezioni.map((col) => (
                    <span
                      key={col}
                      className="rounded-full bg-oro px-2 py-0.5 text-xs font-bold text-inchiostro-900"
                    >
                      {NOME_COLLEZIONE(col)}
                    </span>
                  ))}
                </div>
              )}

              {(player.espulso || player.ammonizioni > 0) && (
                <p className="mt-1 flex items-center gap-1.5 text-xs font-bold text-testo-2">
                  <span
                    aria-hidden="true"
                    className={`h-4 w-3 shrink-0 rounded-[2px] ${player.espulso ? "bg-coppe" : "bg-denari"}`}
                  />
                  {player.espulso ? "Cartellino rosso: non estrae più" : "Cartellino giallo"}
                </p>
              )}

              {player.jollyUsato && (
                <p className="mt-1 flex items-center gap-1 text-xs font-bold text-testo-2">
                  <Sparkles size={12} aria-hidden="true" />
                  Jolly usato
                </p>
              )}
            </li>
          ))}
        </ul>
      </Disclosure>
    </div>
  );
}

PlayersList.propTypes = {
  game: PropTypes.shape({
    players: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string,
        name: PropTypes.string,
        gettoni: PropTypes.number,
        collezioni: PropTypes.arrayOf(PropTypes.string),
        jollyUsato: PropTypes.bool,
        ammonizioni: PropTypes.number,
        espulso: PropTypes.bool,
      })
    ),
    turno: PropTypes.shape({ playerId: PropTypes.string }),
  }),
  currentPlayerId: PropTypes.string,
};

export default PlayersList;
