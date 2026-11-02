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
 *
 * The jolly is used in two steps, both in the bar: the player taps a card of
 * the grid, then confirms it by name.
 */

import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Coins, ArrowLeft } from "lucide-react";
import {
  drawCard,
  playJolly,
  leaveGame,
  setJollyMode,
  decrementDrawCooldown,
  clearGame,
} from "../../store/slices/gameSlice";
import { setScreen, addToast } from "../../store/slices/uiSlice";
import { fetchPlayer } from "../../store/slices/playerSlice";
import Cartella from "./Cartella";
import CartaNapoletana from "./CartaNapoletana";
import CollezioniPanel from "./CollezioniPanel";
import PlayersList from "./PlayersList";
import BarraAzione from "./BarraAzione";
import { Modal, Button } from "../common";

// Panels: thin border and tight padding on a phone, the full frame on wide screens
const PANEL = "bg-amber-50 rounded-2xl shadow-2xl p-3 lg:p-6 border-2 lg:border-4 border-amber-600";

function GameScreen() {
  const dispatch = useDispatch();
  const gridRef = useRef(null);
  const [jollyCarta, setJollyCarta] = useState(null);
  const [confermaUscita, setConfermaUscita] = useState(false);
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

  // Leaving the mode forgets the card that was chosen
  const esciDaJolly = () => {
    dispatch(setJollyMode(null));
    setJollyCarta(null);
  };

  const scrollToGrid = () => {
    const reduceMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)")?.matches;
    gridRef.current?.scrollIntoView?.({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  };

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
    setJollyCarta(null);
    scrollToGrid();
  };

  // Step one: the player taps a card, the bar asks for the confirmation
  const handleSceglieCartaJolly = (row, col) => {
    if (currentPlayer?.jollyUsato) {
      dispatch(addToast({ message: "Jolly già usato!", type: "warning" }));
      return;
    }

    if (!jollyMode) {
      dispatch(addToast({ message: "Seleziona prima per quale collezione vuoi usare il Jolly!", type: "warning" }));
      return;
    }

    setJollyCarta({ row, col });
  };

  // Step two: the player confirms, the jolly is used
  const handleConfermaJolly = async () => {
    if (!jollyCarta) {
      return;
    }

    const { row, col } = jollyCarta;
    try {
      const result = await dispatch(playJolly({ gameId, row, col, tipo: jollyMode })).unwrap();
      dispatch(addToast({
        message: `✨ Jolly attivato! Carta convertita in ${result.convertedTo.valore} di ${result.convertedTo.seme}`,
        type: "success",
      }));
      esciDaJolly();
    } catch (error) {
      // The mode stays on: the player can try with another card
      dispatch(addToast({ message: error || "Errore uso jolly", type: "error", duration: 6000 }));
      setJollyCarta(null);
    }
  };

  // Leaving a game in progress costs the entry fee: it is asked in a dialog that names it
  const handleTornaAllaHall = () => {
    if (game && game.status === "playing") {
      setConfermaUscita(true);
      return;
    }

    esciDallaPartita();
  };

  const esciDallaPartita = async () => {
    setConfermaUscita(false);

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

  const cartaScelta = jollyMode && jollyCarta ? currentPlayer.cartella[jollyCarta.row]?.[jollyCarta.col] : null;

  const azione = (variant) => (
    <BarraAzione
      variant={variant}
      isCreator={isCreator}
      creatorName={creatorName}
      status={game?.status}
      drawCooldown={drawCooldown}
      jollyMode={isGameFinished ? null : jollyMode}
      jollyPending={cartaScelta ? { valore: cartaScelta.valore, seme: cartaScelta.seme } : null}
      onDraw={handleEstraiCarta}
      onCancelJolly={esciDaJolly}
      onConfirmJolly={handleConfermaJolly}
      onChangeJollyCard={() => setJollyCarta(null)}
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
              <h2 title={playerName} className="truncate text-lg lg:text-2xl font-bold text-green-900">
                🎴 COMBOCARD - {playerName}
              </h2>
              <p className="text-xs lg:text-sm text-green-800">Codice: {gameId}</p>
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
                <p className="text-xs lg:text-sm text-green-800">Montepremi</p>
                <p className="text-lg lg:text-2xl font-bold tabular-nums text-amber-700 flex items-center gap-1">
                  <Coins size={20} aria-hidden="true" />
                  {montepremi}
                </p>
              </div>

              <div className="flex items-center gap-1.5 lg:block">
                <p className="text-xs lg:text-sm text-green-800">I tuoi crediti</p>
                <p className="text-lg lg:text-2xl font-bold tabular-nums text-green-700 flex items-center gap-1">
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
          <section
            className={`${PANEL} grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-1 lg:col-start-3 lg:grid-cols-[1fr_auto] lg:items-baseline lg:gap-y-4`}
          >
            <h3 className="col-start-2 row-start-1 self-end text-xs font-bold text-green-800 lg:col-start-1 lg:text-lg lg:text-green-900">
              🎴 Ultima Carta
            </h3>
            <p className="col-start-3 row-start-1 self-end text-xs text-green-800 tabular-nums lg:col-start-2 lg:text-sm">
              Carte rimaste: {game?.carteRimaste ?? 0}/40
            </p>

            {ultimaCartaEstratta ? (
              <>
                <CartaNapoletana
                  valore={ultimaCartaEstratta.valore}
                  seme={ultimaCartaEstratta.seme}
                  className="col-start-1 row-span-2 row-start-1 h-[88px] w-auto rounded-md shadow-md lg:col-span-2 lg:row-span-1 lg:row-start-2 lg:mx-auto lg:h-60"
                />
                <p className="col-span-2 col-start-2 row-start-2 self-start lg:col-span-2 lg:col-start-1 lg:row-start-3 lg:text-center">
                  <span className="text-2xl font-bold text-green-900 lg:block lg:text-3xl">{ultimaCartaEstratta.valore}</span>{" "}
                  <span className="text-sm text-green-800 lg:block">di {ultimaCartaEstratta.seme}</span>
                </p>
              </>
            ) : (
              <p className="col-span-2 col-start-1 row-start-2 rounded-xl border-2 border-green-300 bg-green-100 p-3 text-center text-green-800 lg:col-span-2 lg:row-start-2 lg:p-8">
                Nessuna carta estratta
              </p>
            )}

            {/* On wide screens the action sits under the card; a phone has the bar below */}
            <div className="hidden lg:col-span-2 lg:row-start-4 lg:block">{azione("panel")}</div>
          </section>

          {/* Player's card grid */}
          <section
            ref={gridRef}
            className={`${PANEL} scroll-mt-3 lg:col-start-1 lg:col-span-2 lg:row-start-1 lg:row-span-3`}
          >
            <h3 className="text-base lg:text-xl font-bold mb-2 lg:mb-4 text-green-900">🎴 La Tua Cartella</h3>

            <div className="mx-auto w-full max-w-sm lg:max-w-none">
              <Cartella
                cartella={currentPlayer.cartella}
                coperte={currentPlayer.coperte}
                jollyPos={currentPlayer.jollyPos}
                jollyMode={isGameFinished ? null : jollyMode}
                jollyUsato={currentPlayer.jollyUsato}
                selected={jollyCarta}
                onCardClick={handleSceglieCartaJolly}
              />
            </div>

            {!currentPlayer.jollyUsato && !jollyMode && !isGameFinished && (
              <p className="text-xs text-green-800 mt-3 text-center">
                💡 Il Jolly si usa una sola volta: tocca &quot;Jolly&quot; sulla collezione che vuoi completare, poi scegli la carta
              </p>
            )}
          </section>

          {/* Collections panel */}
          <div className="lg:col-start-3">
            <CollezioniPanel
              game={game}
              currentPlayer={currentPlayer}
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

      <Modal
        isOpen={confermaUscita}
        title="Uscire dalla partita?"
        onClose={() => setConfermaUscita(false)}
      >
        <p className="text-green-900">
          La partita è ancora in corso. Se esci ora perdi i crediti spesi per partecipare e non potrai rientrare.
        </p>
        <p className="mt-2 text-green-800">I crediti che hai adesso vengono salvati.</p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row-reverse">
          <Button variant="danger" onClick={esciDallaPartita} className="flex-1">
            Esci dalla partita
          </Button>
          <Button variant="outline" onClick={() => setConfermaUscita(false)} className="flex-1">
            Resta in partita
          </Button>
        </div>
      </Modal>

      {/* Main action, fixed at the bottom of a phone screen */}
      <div data-testid="barra-azione" className="fixed inset-x-0 bottom-0 z-40 border-t-4 border-amber-600 bg-amber-50 px-3 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.25)] lg:hidden">
        <div className="mx-auto max-w-md">{azione("bar")}</div>
      </div>
    </div>
  );
}

export default GameScreen;
