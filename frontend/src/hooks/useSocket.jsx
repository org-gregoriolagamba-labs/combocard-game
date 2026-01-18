/**
 * useSocket Hook
 * 
 * Manages Socket.IO connection and event handling for the game.
 */

import { useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import socketService from "../services/socketService";
import { gameService } from "../services";
import {
  setGame,
  setCurrentPlayer,
  setUltimaCartaEstratta,
  setJollyMode,
  updatePlayerCards,
  updatePlayerGettoni,
  clearGame,
} from "../store/slices/gameSlice";
import { setScreen, addToast } from "../store/slices/uiSlice";
import { updateCredits } from "../store/slices/playerSlice";

/**
 * Hook to manage socket connections and game events
 */
export function useSocket() {
  const dispatch = useDispatch();
  const { currentGameId, game } = useSelector((state) => state.game);
  const { id: playerId } = useSelector((state) => state.player);

  // Refresh game state from server
  const refreshGameState = useCallback(async () => {
    if (!currentGameId) return;
    
    try {
      const gameData = await gameService.getGame(currentGameId);
      dispatch(setGame(gameData));
      
      if (playerId) {
        const currentPlayer = gameData.players?.find((p) => p.id === playerId);
        if (currentPlayer) {
          dispatch(setCurrentPlayer(currentPlayer));
        }
      }
    } catch (error) {
      console.error("Error refreshing game state:", error);
    }
  }, [currentGameId, playerId, dispatch]);

  // Initialize socket connection
  useEffect(() => {
    const socket = socketService.connect();

    // Connection events
    socket.on("connect", () => {
      if (currentGameId) {
        socketService.joinGame(currentGameId);
      }
    });

    return () => {
      // Don't disconnect on unmount, just cleanup listeners
    };
  }, [currentGameId]);

  // Join game room when gameId changes
  useEffect(() => {
    if (currentGameId) {
      socketService.joinGame(currentGameId);
    }
  }, [currentGameId]);

  // Game event handlers
  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    // Player joined
    const handlePlayerJoined = ({ player }) => {
      dispatch(addToast({ message: `${player.name} si è unito alla partita` }));
      refreshGameState();
    };

    // Player left
    const handlePlayerLeft = ({ playerName }) => {
      dispatch(addToast({ message: `${playerName} ha lasciato la partita` }));
      dispatch(setGame({
        ...game,
        players: game?.players?.filter((p) => p.name !== playerName) || [],
      }));
    };

    // Game started
    const handleGameStarted = ({ game: srvGame }) => {
      if (srvGame) {
        dispatch(setGame(srvGame));
        const cp = srvGame.players.find((p) => p.id === playerId);
        if (cp) {
          dispatch(setCurrentPlayer(cp));
        }
        dispatch(setScreen("game"));
        dispatch(addToast({ message: "Partita iniziata", type: "success" }));
      }
    };

    // Card drawn
    const handleCardDrawn = ({ carta }) => {
      if (!carta) return;
      dispatch(setUltimaCartaEstratta(carta));
    };

    // Card covered
    const handleCardCovered = ({ playerId: coveredPlayerId, row, col }) => {
      if (coveredPlayerId === playerId) {
        dispatch(updatePlayerCards({ row, col, covered: true }));
      }
      refreshGameState();
    };

    // Collection won
    const handleCollezioneVinta = ({ tipo, vincitore, vincitori, ammontare, divided }) => {
      const winnerNames = vincitori.map((v) => v.name).join(", ");
      const message = divided
        ? `🎉 ${tipo.toUpperCase().replace("_", " ")} vinta da ${winnerNames}! Premio diviso: ${ammontare} gettoni ciascuno!`
        : `🎉 ${vincitore.name} ha vinto ${tipo.toUpperCase().replace("_", " ")}! Premio: ${ammontare} gettoni!`;
      
      dispatch(addToast({ message, type: "success", duration: 5000 }));
      refreshGameState();
    };

    // Tokens updated
    const handleGettoniAggiornati = ({ playerId: updatedPlayerId, gettoni }) => {
      if (updatedPlayerId === playerId) {
        dispatch(updatePlayerGettoni(gettoni));
        dispatch(updateCredits(gettoni));
      }
    };

    // Remaining prizes distributed
    const handlePremiRimanentiDivisi = ({ ammontare, collezioniNonVinte }) => {
      dispatch(addToast({
        message: `💰 Premi rimanenti divisi: ${ammontare} gettoni! (${collezioniNonVinte.join(", ")})`,
        type: "info",
        duration: 5000,
      }));
    };

    // Jolly used
    const handleJollyUsato = ({ playerId: jollyPlayerId, row, col, newCard, tipo }) => {
      if (jollyPlayerId !== playerId) {
        dispatch(addToast({
          message: `🃏 Un giocatore ha usato il Jolly per ${tipo.toUpperCase().replace("_", " ")}`,
        }));
      }
      refreshGameState();
    };

    // Game finished
    const handleGameFinished = ({ vincitore, vincitori }) => {
      let message;
      if (vincitori && vincitori.length > 0) {
        const names = vincitori.map((v) => v.name).join(", ");
        message = `🏆 PARTITA TERMINATA! Vincitore/i: ${names}`;
      } else {
        message = "🏆 PARTITA TERMINATA!";
      }
      
      dispatch(addToast({ message, type: "success", duration: 10000 }));
      refreshGameState();
    };

    // Register event listeners
    socket.on("playerJoined", handlePlayerJoined);
    socket.on("playerLeft", handlePlayerLeft);
    socket.on("gameStarted", handleGameStarted);
    socket.on("cardDrawn", handleCardDrawn);
    socket.on("cardCovered", handleCardCovered);
    socket.on("collezioneVinta", handleCollezioneVinta);
    socket.on("gettoniAggiornati", handleGettoniAggiornati);
    socket.on("premiRimanentiDivisi", handlePremiRimanentiDivisi);
    socket.on("jollyUsato", handleJollyUsato);
    socket.on("gameFinished", handleGameFinished);

    // Cleanup
    return () => {
      socket.off("playerJoined", handlePlayerJoined);
      socket.off("playerLeft", handlePlayerLeft);
      socket.off("gameStarted", handleGameStarted);
      socket.off("cardDrawn", handleCardDrawn);
      socket.off("cardCovered", handleCardCovered);
      socket.off("collezioneVinta", handleCollezioneVinta);
      socket.off("gettoniAggiornati", handleGettoniAggiornati);
      socket.off("premiRimanentiDivisi", handlePremiRimanentiDivisi);
      socket.off("jollyUsato", handleJollyUsato);
      socket.off("gameFinished", handleGameFinished);
    };
  }, [currentGameId, playerId, game, dispatch, refreshGameState]);

  return {
    refreshGameState,
    joinGame: socketService.joinGame.bind(socketService),
    leaveGame: socketService.leaveGame.bind(socketService),
  };
}

export default useSocket;
