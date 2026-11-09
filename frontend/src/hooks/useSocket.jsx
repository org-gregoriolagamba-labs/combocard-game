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
  setJollyInCorso,
  clearJollyInCorso,
  updatePlayerCards,
  updatePlayerGettoni,
  clearGame,
} from "../store/slices/gameSlice";
import { setScreen, addToast, setVittoriaRecente } from "../store/slices/uiSlice";
import { updateCredits, clearPlayer } from "../store/slices/playerSlice";
import { setAccessToken } from "../services/api";
import { suona, setPartitaConSuoni } from "../services/soundService";

/**
 * Hook to manage socket connections and game events
 */
export function useSocket() {
  const dispatch = useDispatch();
  const { currentGameId, game } = useSelector((state) => state.game);
  const { id: playerId, mustChangePassword } = useSelector((state) => state.player);

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

  // The game the player is in has sounds or not (the creator's choice); a game with no such field has them
  const soundsEnabled = game?.soundsEnabled;
  useEffect(() => {
    setPartitaConSuoni(soundsEnabled);
  }, [soundsEnabled]);

  // The server accepts only authenticated connections: connect after the login,
  // disconnect after the logout. Not with a temporary password: the server refuses it, and every
  // refusal would renew the session behind the back of the change of the password
  useEffect(() => {
    if (!playerId || mustChangePassword) {
      socketService.disconnect();
      return undefined;
    }

    const socket = socketService.connect();

    const handleConnect = () => {
      if (currentGameId) {
        socketService.joinGame(currentGameId);
      }
    };
    socket.on("connect", handleConnect);

    return () => {
      socket.off("connect", handleConnect);
    };
  }, [playerId, mustChangePassword, currentGameId]);

  // Join game room when gameId changes
  useEffect(() => {
    if (currentGameId) {
      socketService.joinGame(currentGameId);
    }
  }, [currentGameId]);

  // Game event handlers
  useEffect(() => {
    if (!playerId || mustChangePassword) return undefined;

    const socket = socketService.getSocket();

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
      suona("estratta", { seme: carta.seme });
      // The card is in the own sheet: a second chime, just after the tone of the draw
      const mioFoglio = game?.players?.find((p) => p.id === playerId)?.cartella ?? [];
      if (mioFoglio.some((riga) => riga.some((c) => c.valore === carta.valore && c.seme === carta.seme))) {
        suona("miaCarta", { ritardo: 0.2 });
      }
      refreshGameState();
    };

    // Card covered: the server notifies only the owner of the grid
    const handleCardCovered = ({ row, col }) => {
      dispatch(updatePlayerCards({ row, col, covered: true }));
    };

    // Collection won
    const handleCollezioneVinta = ({ tipo, vincitore, vincitori, ammontare, divided }) => {
      const nome = tipo.toUpperCase().replace("_", " ");
      const winnerNames = vincitori.map((v) => v.name).join(", ");
      const iHaveWon = vincitori.some((v) => v.id === playerId);

      let message;
      if (iHaveWon) {
        message = divided
          ? `Hai vinto ${nome} insieme ad altri: +${ammontare} crediti`
          : `Hai vinto ${nome}: +${ammontare} crediti`;
      } else {
        message = divided
          ? `${nome} vinta da ${winnerNames}: ${ammontare} crediti ciascuno`
          : `${vincitore.name} ha vinto ${nome}: ${ammontare} crediti`;
      }

      // The combocard reale ends the game, and the sound of the end says it
      if (tipo !== "combocard_reale") {
        suona(iHaveWon ? "collezioneMia" : "collezioneAltrui");
      }
      dispatch(addToast({ message, type: iHaveWon ? "win" : "success", duration: iHaveWon ? 6000 : 4000 }));
      if (iHaveWon) {
        dispatch(setVittoriaRecente({ tipo }));
      }
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
        message: `Premi rimanenti divisi: ${ammontare} crediti (${collezioniNonVinte.join(", ")})`,
        type: "info",
        duration: 5000,
      }));
    };

    // A player declares the jolly: the draws are paused until the card is chosen
    const handleJollyInCorso = (hold) => {
      if (hold?.scadenza) {
        suona("jollyDichiarato");
        dispatch(setJollyInCorso(hold));
      }
    };

    // The player gave the jolly up (or left): the draws can go on
    const handleJollyAnnullato = ({ playerId: jollyPlayerId }) => {
      dispatch(clearJollyInCorso(jollyPlayerId));
      if (jollyPlayerId !== playerId) {
        dispatch(addToast({ message: "Il Jolly è stato lasciato: si può estrarre di nuovo" }));
      }
    };

    // Jolly used
    const handleJollyUsato = ({ playerId: jollyPlayerId, tipo }) => {
      suona("jollyUsato");
      dispatch(clearJollyInCorso(jollyPlayerId));
      if (jollyPlayerId !== playerId) {
        dispatch(addToast({
          message: `Un giocatore ha usato il Jolly per ${tipo.toUpperCase().replace("_", " ")}`,
        }));
      }
      refreshGameState();
    };

    // Game finished
    const handleGameFinished = ({ _vincitore, vincitori }) => {
      let message;
      if (vincitori && vincitori.length > 0) {
        const names = vincitori.map((v) => v.name).join(", ");
        message = `Partita terminata. Vincitore/i: ${names}`;
      } else {
        message = "Partita terminata";
      }
      
      suona("fine");
      dispatch(addToast({ message, type: "success", duration: 10000 }));
      refreshGameState();
    };

    // An admin cancelled the game: back to the hall, with the balance the server says
    const handleGameCancelled = ({ gameId, gettoni, refund }) => {
      if (typeof gettoni === "number") {
        dispatch(updateCredits(gettoni));
      }
      if (gameId !== currentGameId) {
        return;
      }
      dispatch(clearGame());
      dispatch(setScreen("hall"));
      dispatch(addToast({
        message: refund > 0
          ? `La partita è stata annullata dall'amministrazione: ti sono stati restituiti ${refund} crediti`
          : "La partita è stata annullata dall'amministrazione",
        type: "warning",
        duration: 8000,
      }));
    };

    // An admin suspended the account or closed its sessions: the server drops the connection and the
    // tokens no longer work, so the player goes back to the start
    const handleSessionEnded = ({ reason }) => {
      setAccessToken(null);
      dispatch(clearPlayer());
      dispatch(clearGame());
      dispatch(setScreen("home"));
      dispatch(addToast({
        message: {
          suspended: "Il tuo account è stato sospeso",
          deleted: "Il tuo account è stato eliminato",
        }[reason] ?? "L'amministrazione ha chiuso la tua sessione: accedi di nuovo",
        type: "warning",
        duration: 8000,
      }));
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
    socket.on("jollyInCorso", handleJollyInCorso);
    socket.on("jollyAnnullato", handleJollyAnnullato);
    socket.on("jollyUsato", handleJollyUsato);
    socket.on("gameFinished", handleGameFinished);
    socket.on("gameCancelled", handleGameCancelled);
    socket.on("sessionEnded", handleSessionEnded);

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
      socket.off("jollyInCorso", handleJollyInCorso);
      socket.off("jollyAnnullato", handleJollyAnnullato);
      socket.off("jollyUsato", handleJollyUsato);
      socket.off("gameFinished", handleGameFinished);
      socket.off("gameCancelled", handleGameCancelled);
      socket.off("sessionEnded", handleSessionEnded);
    };
  }, [currentGameId, playerId, mustChangePassword, game, dispatch, refreshGameState]);

  return {
    refreshGameState,
    joinGame: socketService.joinGame.bind(socketService),
    leaveGame: socketService.leaveGame.bind(socketService),
  };
}

export default useSocket;
