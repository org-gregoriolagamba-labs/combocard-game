/**
 * GameScreen Component
 * 
 * Main game interface where the actual card game is played.
 */

import React, { useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Coins, ArrowLeft } from "lucide-react";
import {
  drawCard,
  claimCollection,
  useJolly,
  leaveGame,
  setJollyMode,
  decrementDrawCooldown,
  clearGame,
} from "../../store/slices/gameSlice";
import { setScreen, addToast } from "../../store/slices/uiSlice";
import { fetchPlayer } from "../../store/slices/playerSlice";
import Cartella from "./Cartella";
import CollezioniPanel from "./CollezioniPanel";
import PlayersList from "./PlayersList";

// Card colors for different suits
const SEMI_COLORS = {
  Spade: "from-gray-700 to-gray-900",
  Coppe: "from-red-600 to-red-800",
  Denari: "from-yellow-500 to-yellow-700",
  Bastoni: "from-amber-700 to-amber-900",
};

function GameScreen() {
  const dispatch = useDispatch();
  const { id: playerId, name: playerName } = useSelector((state) => state.player);
  const {
    currentGameId: gameId,
    game,
    currentPlayer,
    ultimaCartaEstratta,
    jollyMode,
    drawCooldown,
  } = useSelector((state) => state.game);

  const montepremi = game?.montepremi || 0;
  const isCreator = game?.players?.[0]?.id === playerId;
  const isGameFinished = game?.status === "finished";

  // Handle draw cooldown timer
  useEffect(() => {
    if (drawCooldown > 0) {
      const timer = setTimeout(() => {
        dispatch(decrementDrawCooldown());
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [drawCooldown, dispatch]);

  const handleEstraiCarta = async () => {
    if (drawCooldown > 0) {
      dispatch(addToast({
        message: `Attendi ${drawCooldown} secondi prima di estrarre un'altra carta`,
        type: "warning",
      }));
      return;
    }

    try {
      await dispatch(drawCard({ gameId, playerId })).unwrap();
    } catch (error) {
      dispatch(addToast({ message: error || "Errore estrazione carta", type: "error" }));
    }
  };

  const handleRivendicaCollezione = async (tipo) => {
    try {
      const result = await dispatch(claimCollection({ gameId, playerId, tipo })).unwrap();
      dispatch(addToast({
        message: `🎉 Hai vinto ${tipo.toUpperCase().replace("_", " ")}!\nPremio: ${result.premio} gettoni!`,
        type: "success",
      }));

      if (tipo === "combocard_reale") {
        dispatch(addToast({
          message: "🏆 HAI VINTO CON COMBOCARD REALE! Partita terminata!",
          type: "success",
          duration: 10000,
        }));
      }
    } catch (error) {
      dispatch(addToast({ message: error || "Errore rivendicazione collezione", type: "error" }));
    }
  };

  const handleAttivaModalitaJolly = (tipo) => {
    if (currentPlayer?.jollyUsato) {
      dispatch(addToast({ message: "Jolly già usato!", type: "warning" }));
      return;
    }

    if (game?.collezioni[tipo]?.vinto) {
      dispatch(addToast({ message: "Questa collezione è già stata vinta!", type: "warning" }));
      return;
    }

    dispatch(setJollyMode(tipo));
    dispatch(addToast({
      message: `🎯 Modalità Jolly attivata per ${tipo.toUpperCase().replace("_", " ")}. Clicca su una carta non coperta.`,
      type: "info",
    }));
  };

  const handleUsaJolly = async (row, col) => {
    if (currentPlayer?.jollyUsato) {
      dispatch(addToast({ message: "Jolly già usato!", type: "warning" }));
      return;
    }

    if (!jollyMode) {
      dispatch(addToast({ message: "Seleziona prima per quale collezione vuoi usare il Jolly!", type: "warning" }));
      return;
    }

    if (!window.confirm(
      `Usare Jolly per ${jollyMode.toUpperCase().replace("_", " ")} sulla carta in posizione [${row + 1},${col + 1}]?`
    )) {
      return;
    }

    try {
      const result = await dispatch(useJolly({ gameId, playerId, row, col, tipo: jollyMode })).unwrap();
      dispatch(addToast({
        message: `✨ Jolly attivato! Carta convertita in ${result.convertedTo.valore} di ${result.convertedTo.seme}`,
        type: "success",
      }));
      dispatch(setJollyMode(null));
    } catch (error) {
      dispatch(addToast({ message: error || "Errore uso jolly", type: "error" }));
      dispatch(setJollyMode(null));
    }
  };

  const handleTornaAllaHall = async () => {
    if (game && game.status === "playing") {
      const confirmed = window.confirm(
        "⚠️ La partita è ancora in corso!\n\n" +
        "Se esci ora perderai i crediti spesi per partecipare e non potrai rientrare.\n" +
        "I tuoi gettoni attuali verranno salvati.\n\n" +
        "Sei sicuro di voler uscire?"
      );
      
      if (!confirmed) {
        return;
      }
    }

    try {
      await dispatch(leaveGame({ gameId, playerId })).unwrap();
      await dispatch(fetchPlayer(playerId));
      dispatch(clearGame());
      dispatch(setScreen("hall"));
    } catch (error) {
      console.error("Errore uscita partita:", error);
      dispatch(setScreen("hall"));
    }
  };

  if (!currentPlayer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-700 flex items-center justify-center">
        <div className="text-white text-xl">Caricamento...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-700 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Game finished banner */}
        {isGameFinished && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-yellow-400 text-yellow-900 px-6 py-3 rounded-xl shadow-2xl z-50 font-bold text-center">
            <p className="text-lg">🏆 PARTITA TERMINATA!</p>
            <p className="text-sm">Torna alla Hall per iniziare una nuova partita</p>
          </div>
        )}

        {/* Jolly mode banner */}
        {jollyMode && !isGameFinished && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-yellow-400 text-yellow-900 px-6 py-3 rounded-xl shadow-2xl z-50 font-bold text-center">
            <p>🎯 Modalità Jolly attivata per {jollyMode.toUpperCase().replace("_", " ")}</p>
            <p className="text-sm">Clicca su una carta non coperta</p>
            <button
              onClick={() => dispatch(setJollyMode(null))}
              className="mt-2 bg-red-500 text-white px-4 py-1 rounded-lg text-xs hover:bg-red-600"
            >
              Annulla
            </button>
          </div>
        )}

        {/* Header */}
        <div className="bg-amber-50 rounded-2xl shadow-2xl p-4 mb-4 border-4 border-amber-600">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h2 className="text-2xl font-bold text-green-900 flex items-center gap-2">
                🎴 COMBOCARD - {playerName}
              </h2>
              <p className="text-sm text-green-700">Codice: {gameId}</p>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-green-700">Montepremi</p>
                <p className="text-2xl font-bold text-amber-600 flex items-center gap-1">
                  <Coins size={24} />
                  {montepremi}
                </p>
              </div>

              <div className="text-right">
                <p className="text-sm text-green-700">Tuoi Gettoni</p>
                <p className="text-2xl font-bold text-green-600 flex items-center gap-1">
                  <Coins size={24} />
                  {currentPlayer.gettoni}
                </p>
              </div>

              <button
                onClick={handleTornaAllaHall}
                className="bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-bold hover:bg-gray-400 transition flex items-center gap-2"
              >
                <ArrowLeft size={18} />
                Hall
              </button>
            </div>
          </div>
        </div>

        {/* Main game area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Player's card grid */}
          <div className="lg:col-span-2 bg-amber-50 rounded-2xl shadow-2xl p-6 border-4 border-amber-600">
            <h3 className="text-xl font-bold mb-4 text-green-900">🎴 La Tua Cartella</h3>

            <Cartella
              cartella={currentPlayer.cartella}
              coperte={currentPlayer.coperte}
              jollyPos={currentPlayer.jollyPos}
              jollyMode={jollyMode}
              jollyUsato={currentPlayer.jollyUsato}
              onCardClick={isGameFinished ? () => {} : handleUsaJolly}
            />

            {!currentPlayer.jollyUsato && !jollyMode && !isGameFinished && (
              <p className="text-xs text-green-700 mt-3 text-center">
                💡 Seleziona una collezione e poi clicca "Usa Jolly" per attivare la modalità Jolly
              </p>
            )}
          </div>

          {/* Right sidebar */}
          <div className="space-y-4">
            {/* Last drawn card */}
            <div className="bg-amber-50 rounded-2xl shadow-2xl p-6 border-4 border-amber-600">
              <h3 className="text-lg font-bold mb-4 text-green-900">🎴 Ultima Carta</h3>

              {ultimaCartaEstratta ? (
                <div
                  className={`bg-gradient-to-br ${SEMI_COLORS[ultimaCartaEstratta.seme]} border-4 border-white rounded-2xl p-8 text-center shadow-2xl`}
                >
                  <div className="text-7xl mb-3">{ultimaCartaEstratta.emoji}</div>
                  <div className="text-3xl font-bold text-white mb-1">{ultimaCartaEstratta.valore}</div>
                  <div className="text-sm text-white opacity-90">di {ultimaCartaEstratta.seme}</div>
                </div>
              ) : (
                <div className="bg-green-100 rounded-2xl p-8 text-center text-green-700 border-2 border-green-300">
                  Nessuna carta estratta
                </div>
              )}

              <button
                onClick={handleEstraiCarta}
                disabled={isGameFinished || game?.status !== "playing" || !isCreator || drawCooldown > 0}
                className="w-full mt-4 bg-gradient-to-r from-green-600 to-green-800 text-white py-3 rounded-xl font-bold hover:from-green-700 hover:to-green-900 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGameFinished
                  ? "🏆 Partita Terminata"
                  : drawCooldown > 0
                  ? `⏱️ Attendi ${drawCooldown}s`
                  : "🎲 Estrai Carta"}
              </button>

              <p className="text-xs text-green-700 mt-2 text-center">
                Carte rimaste: {game?.mazzo?.length || 0}/40
              </p>

              {drawCooldown > 0 && !isGameFinished && (
                <div className="mt-2 bg-yellow-100 rounded-lg p-2 text-center">
                  <div className="text-xs text-yellow-800 font-bold">
                    💡 Usa questo tempo per valutare il Jolly
                  </div>
                  <div className="w-full bg-yellow-200 rounded-full h-2 mt-2 overflow-hidden">
                    <div
                      className="bg-yellow-600 h-full transition-all duration-1000"
                      style={{ width: `${(drawCooldown / 8) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Players list */}
            <PlayersList game={game} currentPlayerId={playerId} />

            {/* Collections panel */}
            <CollezioniPanel
              game={game}
              currentPlayer={currentPlayer}
              onClaim={isGameFinished ? () => {} : handleRivendicaCollezione}
              onJollyMode={isGameFinished ? () => {} : handleAttivaModalitaJolly}
              isGameFinished={isGameFinished}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default GameScreen;
