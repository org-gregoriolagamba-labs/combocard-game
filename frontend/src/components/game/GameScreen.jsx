/**
 * GameScreen Component
 *
 * Main game interface where the actual card game is played.
 *
 * On a phone the screen is one column in reading order: header, last drawn
 * card, the player's grid, collections, players. The main action lives in a
 * bar fixed at the bottom, within thumb reach. On wide screens the grid sits
 * on the left and the last card with its action, the collections and the
 * players on the right.
 */

import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Coins, ArrowLeft } from "lucide-react";
import {
  drawCard,
  claimCollection,
  playJolly,
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
import BarraAzione from "./BarraAzione";

// Card colors for different suits
const SEMI_COLORS = {
  Spade: "from-gray-700 to-gray-900",
  Coppe: "from-red-600 to-red-800",
  Denari: "from-yellow-500 to-yellow-700",
  Bastoni: "from-amber-700 to-amber-900",
};

// Panels: thin border and tight padding on a phone, the full frame on wide screens
const PANEL = "bg-amber-50 rounded-2xl shadow-2xl p-3 lg:p-6 border-2 lg:border-4 border-amber-600";

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
  const creatorName = game?.players?.[0]?.name || "";
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
      await dispatch(drawCard({ gameId })).unwrap();
    } catch (error) {
      dispatch(addToast({ message: error || "Errore estrazione carta", type: "error" }));
    }
  };

  const handleRivendicaCollezione = async (tipo) => {
    try {
      const result = await dispatch(claimCollection({ gameId, tipo })).unwrap();
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
      const result = await dispatch(playJolly({ gameId, row, col, tipo: jollyMode })).unwrap();
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
      await dispatch(leaveGame({ gameId })).unwrap();
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

  const azione = (variant) => (
    <BarraAzione
      variant={variant}
      isCreator={isCreator}
      creatorName={creatorName}
      status={game?.status}
      drawCooldown={drawCooldown}
      jollyMode={isGameFinished ? null : jollyMode}
      onDraw={handleEstraiCarta}
      onCancelJolly={() => dispatch(setJollyMode(null))}
      onLeave={handleTornaAllaHall}
    />
  );

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-green-900 via-green-800 to-green-700 p-3 pb-28 lg:p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className={`${PANEL} mb-3 lg:mb-4 lg:p-4`}>
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <div className="order-1 min-w-0 flex-1">
              <h2 className="truncate text-lg lg:text-2xl font-bold text-green-900">
                🎴 COMBOCARD - {playerName}
              </h2>
              <p className="text-xs lg:text-sm text-green-700">Codice: {gameId}</p>
            </div>

            <button
              onClick={handleTornaAllaHall}
              className="order-2 lg:order-3 min-h-[44px] bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-bold hover:bg-gray-400 transition flex items-center gap-2"
            >
              <ArrowLeft size={18} aria-hidden="true" />
              Hall
            </button>

            <div className="order-3 lg:order-2 flex w-full items-center gap-5 lg:w-auto lg:gap-4">
              <div className="flex items-center gap-1.5 lg:block">
                <p className="text-xs lg:text-sm text-green-700">Montepremi</p>
                <p className="text-lg lg:text-2xl font-bold text-amber-600 flex items-center gap-1">
                  <Coins size={20} aria-hidden="true" />
                  {montepremi}
                </p>
              </div>

              <div className="flex items-center gap-1.5 lg:block">
                <p className="text-xs lg:text-sm text-green-700">Tuoi Gettoni</p>
                <p className="text-lg lg:text-2xl font-bold text-green-600 flex items-center gap-1">
                  <Coins size={20} aria-hidden="true" />
                  {currentPlayer.gettoni}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Main game area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-4">
          {/* Last drawn card: leads on a phone, top of the sidebar on wide screens */}
          <section className={`${PANEL} lg:col-start-3`}>
            <div className="mb-2 lg:mb-4 flex items-baseline justify-between gap-2">
              <h3 className="text-base lg:text-lg font-bold text-green-900">🎴 Ultima Carta</h3>
              <p className="text-xs lg:text-sm text-green-800">
                Carte rimaste: {game?.carteRimaste ?? 0}/40
              </p>
            </div>

            {ultimaCartaEstratta ? (
              <div
                className={`bg-gradient-to-br ${SEMI_COLORS[ultimaCartaEstratta.seme]} border-2 lg:border-4 border-white rounded-xl lg:rounded-2xl p-2 lg:p-8 shadow-xl flex items-center gap-3 lg:block lg:text-center`}
              >
                <div className="text-3xl lg:text-7xl lg:mb-3" aria-hidden="true">{ultimaCartaEstratta.emoji}</div>
                <div>
                  <span className="text-2xl lg:block lg:text-3xl font-bold text-white lg:mb-1">{ultimaCartaEstratta.valore}</span>{" "}
                  <span className="text-sm lg:block text-white opacity-90">di {ultimaCartaEstratta.seme}</span>
                </div>
              </div>
            ) : (
              <div className="bg-green-100 rounded-xl lg:rounded-2xl p-3 lg:p-8 text-center text-green-700 border-2 border-green-300">
                Nessuna carta estratta
              </div>
            )}

            {/* On wide screens the action sits under the card; a phone has the bar below */}
            <div className="hidden lg:block mt-4">{azione("panel")}</div>
          </section>

          {/* Player's card grid */}
          <section className={`${PANEL} lg:col-start-1 lg:col-span-2 lg:row-start-1 lg:row-span-3`}>
            <h3 className="text-base lg:text-xl font-bold mb-2 lg:mb-4 text-green-900">🎴 La Tua Cartella</h3>

            <div className="mx-auto w-full max-w-sm lg:max-w-none">
              <Cartella
                cartella={currentPlayer.cartella}
                coperte={currentPlayer.coperte}
                jollyPos={currentPlayer.jollyPos}
                jollyMode={jollyMode}
                jollyUsato={currentPlayer.jollyUsato}
                onCardClick={isGameFinished ? () => {} : handleUsaJolly}
              />
            </div>

            {!currentPlayer.jollyUsato && !jollyMode && !isGameFinished && (
              <p className="text-xs text-green-700 mt-3 text-center">
                💡 Seleziona una collezione e poi clicca &quot;Usa Jolly&quot; per attivare la modalità Jolly
              </p>
            )}
          </section>

          {/* Collections panel */}
          <div className="lg:col-start-3">
            <CollezioniPanel
              game={game}
              currentPlayer={currentPlayer}
              onClaim={isGameFinished ? () => {} : handleRivendicaCollezione}
              onJollyMode={isGameFinished ? () => {} : handleAttivaModalitaJolly}
              isGameFinished={isGameFinished}
            />
          </div>

          {/* Players list */}
          <div className="lg:col-start-3">
            <PlayersList game={game} currentPlayerId={playerId} />
          </div>
        </div>
      </div>

      {/* Main action, fixed at the bottom of a phone screen */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t-4 border-amber-600 bg-amber-50 px-3 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.25)] lg:hidden">
        <div className="mx-auto max-w-md">{azione("bar")}</div>
      </div>
    </div>
  );
}

export default GameScreen;
