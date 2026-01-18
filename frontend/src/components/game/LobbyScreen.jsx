/**
 * LobbyScreen Component
 * 
 * Waiting room for a game, shows players and allows starting the game.
 */

import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Users, PlayCircle, ArrowLeft } from "lucide-react";
import { setGame, setCurrentPlayer, startGame, leaveGame } from "../../store/slices/gameSlice";
import { setScreen, addToast } from "../../store/slices/uiSlice";
import { fetchPlayer } from "../../store/slices/playerSlice";
import { gameService } from "../../services";
import { Button } from "../common";

function LobbyScreen() {
  const dispatch = useDispatch();
  const { id: playerId, name: playerName } = useSelector((state) => state.player);
  const { currentGameId: gameId, game } = useSelector((state) => state.game);

  // Polling to update lobby state
  useEffect(() => {
    const fetchGameState = async () => {
      if (!gameId) return;
      
      try {
        const gameData = await gameService.getGame(gameId);
        dispatch(setGame(gameData));
        
        // Check if game started while we were polling
        if (gameData.status === "playing") {
          const cp = gameData.players.find((p) => p.id === playerId);
          if (cp) {
            dispatch(setCurrentPlayer(cp));
          }
          dispatch(setScreen("game"));
        }
      } catch (error) {
        console.error("Error updating lobby:", error);
      }
    };

    fetchGameState();
    const interval = setInterval(fetchGameState, 2000);
    return () => clearInterval(interval);
  }, [gameId, playerId, dispatch]);

  const handleIniziaPartita = async () => {
    try {
      const result = await dispatch(startGame({ gameId, playerId })).unwrap();
      dispatch(setGame(result.game));
      
      const cp = result.game.players.find((p) => p.id === playerId);
      if (cp) {
        dispatch(setCurrentPlayer(cp));
      }
      dispatch(setScreen("game"));
    } catch (error) {
      dispatch(addToast({ message: error || "Errore avvio partita", type: "error" }));
    }
  };

  const handleTornaAllaHall = async () => {
    try {
      await dispatch(leaveGame({ gameId, playerId })).unwrap();
      await dispatch(fetchPlayer(playerId));
      dispatch(setScreen("hall"));
    } catch (error) {
      dispatch(addToast({ message: error || "Errore uscita partita", type: "error" }));
    }
  };

  // Check if current user is the creator
  const isCreator = game?.players?.length > 0 && game.players[0].id === playerId;
  const canStart = isCreator && game?.players?.length >= 2;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-900 via-amber-800 to-orange-800 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-amber-50 rounded-3xl shadow-2xl p-6 mb-6 border-4 border-amber-700">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-3xl font-bold text-green-900">🎴 Lobby COMBOCARD</h2>
              <p className="text-green-700 mt-1">Benvenuto, {playerName}!</p>
            </div>
            <button
              onClick={handleTornaAllaHall}
              className="bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-bold hover:bg-gray-400 transition flex items-center gap-2"
            >
              <ArrowLeft size={18} />
              Esci
            </button>
          </div>

          <div className="bg-green-100 p-4 rounded-xl mb-4 border-2 border-green-600">
            <p className="font-bold text-green-900">
              Codice Partita:{" "}
              <span className="text-2xl font-mono text-green-700">{gameId}</span>
            </p>
            <p className="text-sm text-green-700 mt-2">
              Costo partecipazione: {game?.requiredCredits} crediti
            </p>
            <p className="text-sm text-green-700">
              {game?.isPrivate ? "🔒 Partita Privata" : "🌐 Partita Pubblica"}
            </p>
          </div>

          {/* Players list */}
          <div className="mb-6">
            <h3 className="text-xl font-bold text-green-900 mb-3 flex items-center gap-2">
              <Users size={24} />
              Giocatori ({game?.players?.length || 0}/{game?.maxPlayers || 10})
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {game?.players?.map((player, index) => (
                <div
                  key={player.id}
                  className={`p-3 rounded-xl ${
                    player.id === playerId
                      ? "bg-green-200 border-2 border-green-600"
                      : "bg-white border-2 border-gray-200"
                  }`}
                >
                  <p className="font-bold text-green-900">
                    {index === 0 && "👑 "}{player.name}
                  </p>
                  {player.id === playerId && (
                    <p className="text-xs text-green-600">Tu</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Start button - only for creator */}
          {isCreator && (
            <div className="text-center">
              {canStart ? (
                <Button
                  onClick={handleIniziaPartita}
                  size="lg"
                  className="flex items-center gap-2 mx-auto"
                >
                  <PlayCircle size={24} />
                  Inizia Partita
                </Button>
              ) : (
                <div className="bg-yellow-100 p-4 rounded-xl border-2 border-yellow-500">
                  <p className="text-yellow-800 font-medium">
                    ⏳ In attesa di altri giocatori...
                  </p>
                  <p className="text-sm text-yellow-700">
                    Servono almeno 2 giocatori per iniziare
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Waiting message for non-creators */}
          {!isCreator && (
            <div className="text-center">
              <div className="bg-blue-100 p-4 rounded-xl border-2 border-blue-500">
                <p className="text-blue-800 font-medium">
                  ⏳ In attesa che il creatore avvii la partita...
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default LobbyScreen;
