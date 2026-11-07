/**
 * Session Thunks
 *
 * What to show once the player is known.
 */

import { authService, gameService } from "../services";
import { clearGame, resumeGame, setUltimaCartaEstratta } from "./slices/gameSlice";
import { clearPlayer } from "./slices/playerSlice";
import { addToast, setScreen } from "./slices/uiSlice";

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

/**
 * Delete the own account with the password. When it is done the player is out and back at the start.
 * The server also tells every device with "sessionEnded", and that may arrive first: then the player is
 * already out and the notice has already been shown, so nothing is done twice.
 * @param {string} password - Current password
 * @throws The error of the server, to be shown to whoever asked
 */
export const deleteOwnAccount = (password) => async (dispatch, getState) => {
  await authService.deleteAccount(password);

  if (getState().player.id !== null) {
    dispatch(clearPlayer());
    dispatch(clearGame());
    dispatch(setScreen("home"));
    dispatch(addToast({ message: "Il tuo account è stato eliminato", type: "warning", duration: 8000 }));
  }
};
