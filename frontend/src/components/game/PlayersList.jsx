/**
 * PlayersList Component
 *
 * Displays the list of players in the current game.
 * On a phone it starts collapsed: the players matter less than the grid.
 */

import React from "react";
import PropTypes from "prop-types";
import { Users, Coins } from "lucide-react";
import { Disclosure } from "../common";

const COLLEZIONI_ICONS = {
  tris: "🎯",
  sequenza: "📊",
  scopa: "🎴",
  napola: "💎",
  combocard_reale: "👑",
};

function PlayersList({ game = null, currentPlayerId = null }) {
  return (
    <div className="bg-amber-50 rounded-2xl shadow-2xl px-3 py-1 lg:px-6 lg:py-3 border-2 lg:border-4 border-amber-600">
      <Disclosure
        openOnDesktop
        title={
          <span className="flex items-center gap-2 text-base lg:text-lg">
            <Users size={24} aria-hidden="true" />
            Giocatori ({game?.players?.length || 0})
          </span>
        }
      >
      <div className="space-y-2 pb-3">
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
                    {COLLEZIONI_ICONS[col]} {col.toUpperCase().replace("_", " ")}
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
