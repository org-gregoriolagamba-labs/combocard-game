/**
 * GameScreen Component
 * 
 * Main game interface where the actual card game is played.
 *
 * On a phone the screen is one column: a header that stays on top with the
 * last drawn card, the prize pool and the credits; the player's sheet laid out
 * like a tombola sheet; the collections; the players. The main action lives in
 * a bar fixed at the bottom, within thumb reach. On wide screens the sheet sits
 * on the left and the collections and players on the right.
 *
 * The jolly is used in two steps, both in the bar: the player taps a card of
 * the sheet (only the cards it can turn are active), then confirms it by name.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Coins, DoorOpen } from "lucide-react";
import {
  drawCard,
  playJolly,
  leaveGame,
  setJollyMode,
  decrementDrawCooldown,
  clearGame,
} from "../../store/slices/gameSlice";
import { setScreen, addToast, clearVittoriaRecente } from "../../store/slices/uiSlice";
import { fetchPlayer } from "../../store/slices/playerSlice";
import Cartella from "./Cartella";
import CartaNapoletana from "./CartaNapoletana";
import CollezioniPanel from "./CollezioniPanel";
import PlayersList from "./PlayersList";
import BarraAzione from "./BarraAzione";
import { Modal, Button } from "../common";
import { carteConJolly, celleVincenti } from "../../utils";

const TIPI = ["tris", "sequenza", "scopa", "napola", "combocard_reale"];
const SECONDI_LUCI = 6000;

function GameScreen() {
  const dispatch = useDispatch();
  const gridRef = useRef(null);
  const [jollyCarta, setJollyCarta] = useState(null);
  const [confermaUscita, setConfermaUscita] = useState(false);
  const { id: playerId } = useSelector((state) => state.player);
  const vittoriaRecente = useSelector((state) => state.ui.vittoriaRecente);
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

  // The places of a collection the player has just won stay lit for a few seconds
  useEffect(() => {
    if (!vittoriaRecente) return undefined;
    const timer = setTimeout(() => dispatch(clearVittoriaRecente()), SECONDI_LUCI);
    return () => clearTimeout(timer);
  }, [vittoriaRecente, dispatch]);

  // What the jolly could do now: how many cards for each collection, and which ones for the chosen one
  const jollyAttivabile = Boolean(currentPlayer) && !currentPlayer.jollyUsato && game?.status === "playing";
  const jollyPossibili = useMemo(() => {
    if (!jollyAttivabile) return null;
    return Object.fromEntries(
      TIPI.map((tipo) => [tipo, carteConJolly(currentPlayer.cartella, currentPlayer.coperte, tipo).length])
    );
  }, [jollyAttivabile, currentPlayer]);
  const carteJolly = useMemo(
    () => (jollyAttivabile && jollyMode ? carteConJolly(currentPlayer.cartella, currentPlayer.coperte, jollyMode) : []),
    [jollyAttivabile, jollyMode, currentPlayer]
  );

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
        message: `Jolly usato: ora hai ${result.convertedTo.valore} di ${result.convertedTo.seme}`,
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
      <div className="flex min-h-screen items-center justify-center bg-notte-900">
        <div className="titolo text-xl text-cartone-100">Caricamento...</div>
      </div>
    );
  }

  const cartaScelta = jollyMode && jollyCarta ? currentPlayer.cartella[jollyCarta.row]?.[jollyCarta.col] : null;
  const conversione = jollyCarta
    ? carteJolly.find((x) => x.row === jollyCarta.row && x.col === jollyCarta.col)?.conversione ?? null
    : null;
  const luci = vittoriaRecente ? celleVincenti(currentPlayer.cartella, currentPlayer.coperte, vittoriaRecente.tipo) : [];

  const azione = (variant) => (
    <BarraAzione
      variant={variant}
      isCreator={isCreator}
      creatorName={creatorName}
      status={game?.status}
      drawCooldown={drawCooldown}
      jollyMode={isGameFinished ? null : jollyMode}
      jollyPending={cartaScelta ? { valore: cartaScelta.valore, seme: cartaScelta.seme } : null}
      jollyConversione={conversione}
      jollyScelte={carteJolly.length}
      onDraw={handleEstraiCarta}
      onCancelJolly={esciDaJolly}
      onConfirmJolly={handleConfermaJolly}
      onChangeJollyCard={() => setJollyCarta(null)}
      onLeave={handleTornaAllaHall}
    />
  );

  return (
    <div className="min-h-[100dvh] bg-notte-900 pb-32 lg:pb-6">
      {/* The header stays on top: the last card, the prize pool, the credits, the way out */}
      <header className="sticky top-0 z-30 border-b-4 border-inchiostro-900 bg-cartone-100 shadow-lg">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-3 py-1.5">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            {ultimaCartaEstratta ? (
              <CartaNapoletana
                key={`${ultimaCartaEstratta.seme}-${ultimaCartaEstratta.valore}`}
                valore={ultimaCartaEstratta.valore}
                seme={ultimaCartaEstratta.seme}
                className="h-[52px] w-auto shrink-0 animate-estrai rounded-[3px] border border-inchiostro-900 shadow-md"
              />
            ) : (
              <span
                aria-hidden="true"
                className="flex h-[52px] w-[29px] shrink-0 items-center justify-center rounded-[3px] border-2 border-dashed border-inchiostro-500"
              />
            )}
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase leading-tight tracking-wide text-inchiostro-700">
                Ultima carta
              </p>
              {ultimaCartaEstratta ? (
                <p className="titolo truncate text-xl leading-tight text-inchiostro-900" aria-live="polite">
                  {ultimaCartaEstratta.valore}
                  <span className="block truncate font-sans text-sm font-bold text-inchiostro-700">
                    di {ultimaCartaEstratta.seme}
                  </span>
                </p>
              ) : (
                <p className="text-sm font-bold text-inchiostro-700">Nessuna carta estratta</p>
              )}
            </div>
          </div>

          <dl className="shrink-0 text-right">
            <div>
              <dt className="text-[11px] leading-none text-inchiostro-700">Montepremi</dt>
              <dd className="titolo flex items-center justify-end gap-1 text-base leading-tight text-denari">
                <Coins size={16} aria-hidden="true" />
                {montepremi}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] leading-none text-inchiostro-700">I tuoi crediti</dt>
              <dd
                key={currentPlayer.gettoni}
                className="titolo flex animate-conta items-center justify-end gap-1 text-base leading-tight text-bastoni"
              >
                <Coins size={16} aria-hidden="true" />
                {currentPlayer.gettoni}
              </dd>
            </div>
          </dl>

          <button
            type="button"
            onClick={handleTornaAllaHall}
            aria-label="Lascia la partita"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border-2 border-inchiostro-900 bg-cartone-50 text-inchiostro-900 transition hover:bg-white"
          >
            <DoorOpen size={22} aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 p-3 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:p-6">
        {/* The player's sheet, laid out like a tombola sheet */}
        <section ref={gridRef} className="foglio scroll-mt-20 p-2.5 lg:row-span-3">
          <div className="mb-1 flex items-baseline justify-between gap-2 px-1">
            <h2 className="titolo text-lg text-inchiostro-900">La tua cartella</h2>
            <p className="text-[11px] font-bold tabular-nums text-inchiostro-700">{game?.carteRimaste ?? 0} carte rimaste</p>
          </div>

          <Cartella
            cartella={currentPlayer.cartella}
            coperte={currentPlayer.coperte}
            estratte={game?.carteEstratte ?? []}
            jollyPos={currentPlayer.jollyPos}
            jollyMode={isGameFinished ? null : jollyMode}
            jollyUsato={currentPlayer.jollyUsato}
            selected={jollyCarta}
            possibili={jollyMode ? carteJolly : null}
            destinazione={conversione}
            evidenziate={luci}
            onCardClick={handleSceglieCartaJolly}
          />

          <p className="mt-2 px-1 text-[11px] leading-snug text-inchiostro-700">
            Quando esce una carta, la tua si copre da sola con un fagiolo. Il posto vuoto è una carta che non hai.
            Il puntino è una carta uscita.
          </p>

          <div className="mt-3 hidden lg:block">{azione("panel")}</div>
        </section>

        <div className="lg:col-start-2">
          <CollezioniPanel
            game={game}
            currentPlayer={currentPlayer}
            jollyPossibili={jollyPossibili}
            onJollyMode={isGameFinished ? () => {} : handleAttivaModalitaJolly}
            isGameFinished={isGameFinished}
          />
        </div>

        <div className="lg:col-start-2">
          <PlayersList game={game} currentPlayerId={playerId} />
        </div>
      </div>

      <Modal
        isOpen={confermaUscita}
        title="Uscire dalla partita?"
        onClose={() => setConfermaUscita(false)}
      >
        <p className="text-inchiostro-900">
          La partita è ancora in corso. Se esci ora perdi i crediti spesi per partecipare e non potrai rientrare.
        </p>
        <p className="mt-2 text-inchiostro-700">I crediti che hai adesso vengono salvati.</p>
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
      <div
        data-testid="barra-azione"
        className="fixed inset-x-0 bottom-0 z-40 border-t-4 border-inchiostro-900 bg-cartone-100 px-3 py-3 shadow-[0_-6px_16px_rgba(5,8,30,0.45)] lg:hidden"
      >
        <div className="mx-auto max-w-md">{azione("bar")}</div>
      </div>
    </div>
  );
}

export default GameScreen;
