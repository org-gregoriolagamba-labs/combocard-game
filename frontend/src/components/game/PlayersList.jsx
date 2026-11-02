/**
 * PlayersList Component
 *
 * Displays the list of players in the current game.
 * On a phone it starts collapsed: the players matter less than the sheet.
 */

import React from "react";
import PropTypes from "prop-types";
import { Coins, Sparkles } from "lucide-react";
import { Disclosure } from "../common";

const NOME_COLLEZIONE = (col) => col.toUpperCase().replace("_", " ");

function PlayersList({ game = null, currentPlayerId = null }) {
  return (
    <div className="foglio px-4 py-1 lg:px-6 lg:py-3">
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
              className={`rounded-xl p-3 ${player.id === currentPlayerId ? "bg-cartone-200" : ""}`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 break-words font-bold text-inchiostro-900">
                  {player.name}
                  {player.id === currentPlayerId && " (Tu)"}
                </p>
                <p className="flex items-center gap-1 text-sm font-bold tabular-nums text-inchiostro-900">
                  <Coins size={16} aria-hidden="true" />
                  {player.gettoni}
                </p>
              </div>

              {player.collezioni && player.collezioni.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {player.collezioni.map((col) => (
                    <span
                      key={col}
                      className="rounded-full border border-inchiostro-900 bg-ocra px-2 py-0.5 text-xs font-bold text-inchiostro-900"
                    >
                      {NOME_COLLEZIONE(col)}
                    </span>
                  ))}
                </div>
              )}

              {player.jollyUsato && (
                <p className="mt-1 flex items-center gap-1 text-xs font-bold text-inchiostro-700">
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
      })
    ),
  }),
  currentPlayerId: PropTypes.string,
};

export default PlayersList;
