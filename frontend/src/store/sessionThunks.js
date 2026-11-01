/**
 * Session Thunks
 *
 * What to show once the player is known.
 */

import { gameService } from "../services";
import { resumeGame, setUltimaCartaEstratta } from "./slices/gameSlice";
import { setScreen } from "./slices/uiSlice";

/**
 * Go back to the game in progress, if there is one, otherwise to the hall
 * @param {Object} player - Player of the session
 */
export const enterGameOrHall = (player) => async (dispatch) => {
  if (player.currentGameId) {
    try {
      const game = await gameService.getGame(player.currentGameId);
      const currentPlayer = game.players.find((p) => p.id === player.id);

      if (currentPlayer && game.status !== "finished") {
        dispatch(resumeGame({ game, currentPlayer }));
        dispatch(setUltimaCartaEstratta(game.carteEstratte.at(-1) ?? null));
        dispatch(setScreen(game.status === "playing" ? "game" : "lobby"));
        return;
      }
    } catch (error) {
      console.error("Error resuming game:", error);
    }
  }

  dispatch(setScreen("hall"));
};
