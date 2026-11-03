/**
 * LobbyScreen Component
 * 
 * Waiting room for a game, shows players and allows starting the game.
 */

import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Users, PlayCircle, ArrowLeft, Copy } from "lucide-react";
import { setGame, setCurrentPlayer, startGame, leaveGame } from "../../store/slices/gameSlice";
import { setScreen, addToast } from "../../store/slices/uiSlice";
import { fetchPlayer } from "../../store/slices/playerSlice";
import { gameService } from "../../services";
import { Button } from "../common";
import { copyText } from "../../utils";

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
      const result = await dispatch(startGame({ gameId })).unwrap();
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
      await dispatch(leaveGame({ gameId })).unwrap();
      await dispatch(fetchPlayer(playerId));
      dispatch(setScreen("hall"));
    } catch (error) {
      dispatch(addToast({ message: error || "Errore uscita partita", type: "error" }));
    }
  };

  const handleCopiaCodice = async () => {
    const copied = await copyText(String(gameId));
    dispatch(
      addToast(
        copied
          ? { message: "Codice copiato: mandalo agli amici", type: "success" }
          : { message: "Non riesco a copiare: tieni premuto sul codice e scegli Copia", type: "error" }
      )
    );
  };

  // Check if current user is the creator
  const isCreator = game?.players?.length > 0 && game.players[0].id === playerId;
  const canStart = isCreator && game?.players?.length >= 2;

  return (
    <div className="min-h-[100dvh] tavolo p-4">
      <div className="mx-auto max-w-3xl">
        <section className="superficie p-4 sm:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1 className="titolo flex items-center gap-2 text-xl text-testo sm:text-3xl">
                Lobby
              </h1>
              <p className="mt-1 break-words text-testo-2">Benvenuto, {playerName}!</p>
            </div>
            <button
              onClick={handleTornaAllaHall}
              className="flex min-h-[44px] shrink-0 items-center gap-2 self-start rounded-lg border-2 border-linea-forte bg-notte-700 px-4 py-2 font-bold text-testo transition hover:bg-white"
            >
              <ArrowLeft size={18} aria-hidden="true" />
              Lascia la partita
            </button>
          </div>

          <div className="mb-4 border-y-2 border-linea py-4">
            <p className="text-sm font-bold text-testo-2">Codice partita</p>
            <p className="titolo select-all break-all text-3xl text-testo">{gameId}</p>
            <button
              type="button"
              onClick={handleCopiaCodice}
              aria-label="Copia il codice della partita"
              className="mt-2 inline-flex min-h-[44px] items-center gap-2 rounded-lg border-2 border-linea-forte bg-notte-700 px-4 font-bold text-testo hover:bg-white"
            >
              <Copy size={18} aria-hidden="true" />
              Copia codice
            </button>
            <p className="mt-3 text-sm text-testo">
              Costa {game?.requiredCredits} crediti a testa. {game?.isPrivate ? "Partita privata" : "Partita pubblica"}.
            </p>
            {game?.isPrivate && (
              <p className="mt-1 text-sm text-testo-2 [text-wrap:pretty]">
                Gli amici entrano dalla Hall con «Unisciti a Partita Privata» e questo codice.
              </p>
            )}
          </div>

          <h2 className="titolo mb-3 flex items-center gap-2 text-xl text-testo">
            <Users size={22} aria-hidden="true" />
            Giocatori ({game?.players?.length || 0}/{game?.maxPlayers || 10})
          </h2>
          <ul className="mb-6 grid grid-cols-2 gap-x-4 md:grid-cols-3">
            {game?.players?.map((player, index) => (
              <li
                key={player.id}
                className={`border-t-2 border-linea py-2 ${
                  player.id === playerId ? "rounded-md bg-notte-700 px-2" : "px-2"
                }`}
              >
                <p className="break-words font-bold text-testo">{player.name}</p>
                <p className="text-xs text-testo-2">
                  {[player.id === playerId && "Tu", index === 0 && "Creatore"].filter(Boolean).join(" · ") || "\u00a0"}
                </p>
              </li>
            ))}
          </ul>

          {isCreator && (
            <div>
              {canStart ? (
                <Button
                  onClick={handleIniziaPartita}
                  size="lg"
                  className="mx-auto flex items-center gap-2"
                >
                  <PlayCircle size={24} aria-hidden="true" />
                  Inizia Partita
                </Button>
              ) : (
                <div className="rounded-xl border-2 border-dashed border-linea p-4 text-center">
                  <p className="font-bold text-testo [text-wrap:balance]">In attesa di altri giocatori...</p>
                  <p className="text-sm text-testo-2">Servono almeno 2 giocatori per iniziare</p>
                </div>
              )}
            </div>
          )}

          {!isCreator && (
            <div className="rounded-xl border-2 border-dashed border-linea p-4 text-center">
              <p className="font-bold text-testo [text-wrap:balance]">
                In attesa che il creatore avvii la partita...
              </p>
              <p className="text-sm text-testo-2">Quando parte, la cartella ti arriva da sola.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default LobbyScreen;
