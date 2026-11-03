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
 * Declaring the jolly pauses the draws for everybody (the server holds them for
 * at most 30 seconds): the others see who is choosing and for how long, and a
 * player who gives up, runs out of time or uses the jolly lets the draws go on.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { DoorOpen } from "lucide-react";
import {
  drawCard,
  playJolly,
  declareJolly,
  releaseJolly,
  leaveGame,
  setJollyMode,
  clearJollyInCorso,
  decrementDrawCooldown,
  clearGame,
} from "../../store/slices/gameSlice";
import { setScreen, addToast, clearVittoriaRecente } from "../../store/slices/uiSlice";
import { fetchPlayer } from "../../store/slices/playerSlice";
import Cartella from "./Cartella";
import CartaNapoletana from "./CartaNapoletana";
import CollezioniPanel from "./CollezioniPanel";
import PlayersList from "./PlayersList";
import GuidaPrimaPartita from "./GuidaPrimaPartita";
import Credito from "./Credito";
import RivelazioneCarta from "./RivelazioneCarta";
import StoricoCarte from "./StoricoCarte";
import Coriandoli from "./Coriandoli";
import BarraAzione from "./BarraAzione";
import { Modal, Button } from "../common";
import { carteConJolly, celleVincenti } from "../../utils";
import { SECONDI_PAUSA_JOLLY } from "./ConteggioJolly";

const TIPI = ["tris", "sequenza", "scopa", "napola", "combocard_reale"];
const SECONDI_LUCI = 6000;

// The glow of the table takes the colour of the suit of the last card
const TINTE = {
  Denari: "rgba(255, 207, 74, 0.22)",
  Coppe: "rgba(255, 106, 85, 0.24)",
  Spade: "rgba(111, 151, 255, 0.26)",
  Bastoni: "rgba(61, 220, 151, 0.2)",
};
const CHIAVE_GUIDA = "combocard.guida-letta";

// The device remembers that the guide was read; storage can be blocked, so it is only a convenience
const guidaLetta = () => {
  try {
    return window.localStorage.getItem(CHIAVE_GUIDA) === "1";
  } catch {
    return false;
  }
};

function GameScreen() {
  const dispatch = useDispatch();
  const gridRef = useRef(null);
  const [jollyCarta, setJollyCarta] = useState(null);
  const [confermaUscita, setConfermaUscita] = useState(false);
  const [guidaChiusa, setGuidaChiusa] = useState(guidaLetta);
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

  // The player who is choosing the jolly card now (the server holds the draws meanwhile)
  const pausa = game?.status === "playing" ? game.jollyInCorso ?? null : null;
  const pausaDi = pausa?.playerId;
  const pausaScadenza = pausa?.scadenza;
  const pausaTipo = pausa?.tipo;
  const pausaMia = Boolean(pausa) && pausaDi === playerId;

  // Handle draw cooldown timer
  useEffect(() => {
    if (drawCooldown > 0) {
      const timer = setTimeout(() => {
        dispatch(decrementDrawCooldown());
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [drawCooldown, dispatch]);

  // The pause ends by itself: the server lets the draws go on, and so does the screen
  useEffect(() => {
    if (!pausaScadenza) return undefined;
    const ms = Math.min(Math.max(pausaScadenza - Date.now(), 0), SECONDI_PAUSA_JOLLY * 1000);
    const timer = setTimeout(() => {
      // The pause first, then the mode: the mode is never restored from a pause that has ended
      dispatch(clearJollyInCorso(pausaDi));
      if (pausaDi === playerId) {
        dispatch(setJollyMode(null));
        setJollyCarta(null);
        dispatch(addToast({
          message: "Tempo scaduto: le estrazioni sono ripartite. Puoi dichiarare di nuovo il Jolly.",
          type: "warning",
          duration: 6000,
        }));
      }
    }, ms);
    return () => clearTimeout(timer);
  }, [pausaScadenza, pausaDi, playerId, dispatch]);

  // After a reload the player's own pause is still running: the mode comes back with it
  useEffect(() => {
    if (pausaMia && pausaTipo && !jollyMode) {
      dispatch(setJollyMode(pausaTipo));
    }
  }, [pausaMia, pausaTipo, jollyMode, dispatch]);

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

  const chiudiGuida = () => {
    setGuidaChiusa(true);
    try {
      window.localStorage.setItem(CHIAVE_GUIDA, "1");
    } catch {
      // The guide only stays closed until the page is reloaded
    }
  };

  // Leaving the mode forgets the card that was chosen
  const lasciaModalita = () => {
    dispatch(setJollyMode(null));
    setJollyCarta(null);
  };

  // Giving the jolly up also tells the server, so the draws can go on at once
  const esciDaJolly = () => {
    dispatch(clearJollyInCorso(playerId));
    lasciaModalita();
    // A failure changes nothing: the pause runs out by itself in a few seconds
    dispatch(releaseJolly({ gameId }));
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

    if (pausa && !pausaMia) {
      dispatch(addToast({ message: `${pausa.name} sta scegliendo il Jolly: aspetta qualche secondo`, type: "warning" }));
      return;
    }

    dispatch(setJollyMode(tipo));
    setJollyCarta(null);
    scrollToGrid();

    // The mode opens at once; the server pauses the draws, and if it refuses the mode closes
    if (!pausaMia) {
      dispatch(declareJolly({ gameId, tipo }))
        .unwrap()
        .catch((error) => {
          lasciaModalita();
          dispatch(addToast({ message: error || "Non riesco a dichiarare il Jolly", type: "error", duration: 6000 }));
        });
    }
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
      lasciaModalita();
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
      <div className="flex min-h-screen items-center justify-center tavolo">
        <div className="titolo text-xl text-testo">Caricamento...</div>
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
      pausa={pausa ? { nome: pausa.name, scadenza: pausa.scadenza, mia: pausaMia } : null}
      onDraw={handleEstraiCarta}
      onCancelJolly={esciDaJolly}
      onConfirmJolly={handleConfermaJolly}
      onChangeJollyCard={() => setJollyCarta(null)}
      onLeave={handleTornaAllaHall}
    />
  );

  return (
    <div
      className="min-h-[100dvh] tavolo pb-32 lg:pb-6"
      style={ultimaCartaEstratta ? { "--tinta": TINTE[ultimaCartaEstratta.seme] } : undefined}
    >
      <RivelazioneCarta carta={ultimaCartaEstratta} />
      {vittoriaRecente && <Coriandoli id={vittoriaRecente.tipo} />}
      {/* The header stays on top: the last card, the prize pool, the credits, the way out */}
      <header className="sticky top-0 z-30 border-b border-linea-forte bg-notte-800/95 shadow-lg">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-3 py-1.5">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            {ultimaCartaEstratta ? (
              <CartaNapoletana
                key={`${ultimaCartaEstratta.seme}-${ultimaCartaEstratta.valore}`}
                valore={ultimaCartaEstratta.valore}
                seme={ultimaCartaEstratta.seme}
                className="h-[52px] w-auto shrink-0 animate-estrai rounded-[3px] border border-linea-forte shadow-md"
              />
            ) : (
              <span
                aria-hidden="true"
                className="flex h-[52px] w-[29px] shrink-0 items-center justify-center rounded-[3px] border-2 border-dashed border-linea"
              />
            )}
            <div className="min-w-0">
              <p className="text-[13px] font-bold leading-tight tabular-nums text-testo-2">
                <span className="sr-only">Ultima carta. </span>
                {game?.carteRimaste ?? 0} carte rimaste
              </p>
              {ultimaCartaEstratta ? (
                <p className="titolo truncate text-xl leading-tight text-testo" aria-live="polite">
                  {ultimaCartaEstratta.valore}
                  <span className="block truncate font-sans text-sm font-bold text-testo-2">
                    di {ultimaCartaEstratta.seme}
                  </span>
                </p>
              ) : (
                <p className="text-sm font-bold text-testo-2">Nessuna carta estratta</p>
              )}
            </div>
          </div>

          <dl className="shrink-0 text-right">
            <div>
              <dt className="text-xs leading-none text-testo-2">Montepremi</dt>
              <dd className="titolo flex items-center justify-end gap-1 text-base leading-tight text-testo">
                <Credito />
                {montepremi}
              </dd>
            </div>
            <div>
              <dt className="text-xs leading-none text-testo-2">I tuoi crediti</dt>
              <dd
                key={currentPlayer.gettoni}
                className="titolo flex animate-conta items-center justify-end gap-1 text-base leading-tight text-testo"
              >
                <Credito />
                {currentPlayer.gettoni}
              </dd>
            </div>
          </dl>

          <button
            type="button"
            onClick={handleTornaAllaHall}
            aria-label="Lascia la partita"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-linea-forte bg-notte-700 text-testo transition hover:bg-notte-600"
          >
            <DoorOpen size={22} aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 p-3 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:p-6">
        {!guidaChiusa && game?.status === "playing" && !(currentPlayer.collezioni?.length > 0) && (
          <div className="lg:col-span-2">
            <GuidaPrimaPartita onClose={chiudiGuida} />
          </div>
        )}

        {/* The player's sheet, laid out like a tombola sheet */}
        <section ref={gridRef} className="superficie scroll-mt-20 p-2.5 lg:sticky lg:top-24 lg:row-span-3 lg:self-start">
          <div className="mb-1 flex items-baseline justify-between gap-2 px-1">
            <h2 className="titolo text-lg text-testo">La tua cartella</h2>
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
            vinte={Object.keys(game?.collezioni ?? {}).filter((tipo) => game.collezioni[tipo]?.vinto)}
            onCardClick={handleSceglieCartaJolly}
          />

          <p className="mt-2 px-1 text-[13px] leading-snug text-testo-2">
            Posto vuoto: carta che non hai. Puntino: carta già uscita.
          </p>

          <div className="mt-3 hidden lg:block">{azione("panel")}</div>
        </section>

        <div className="lg:col-start-2">
          <CollezioniPanel
            game={game}
            currentPlayer={currentPlayer}
            jollyPossibili={jollyPossibili}
            jollyBloccatoDa={pausa && !pausaMia ? pausa.name : null}
            onJollyMode={isGameFinished ? () => {} : handleAttivaModalitaJolly}
            isGameFinished={isGameFinished}
          />
        </div>

        <div className="lg:col-start-2">
          <StoricoCarte estratte={game?.carteEstratte ?? []} />
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
        <p className="text-testo">
          La partita è ancora in corso. Se esci ora perdi i crediti spesi per partecipare e non potrai rientrare.
        </p>
        <p className="mt-2 text-testo-2">I crediti che hai adesso vengono salvati.</p>
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
        className="fixed inset-x-0 bottom-0 z-40 border-t border-linea-forte bg-notte-800 px-3 py-3 shadow-[0_-6px_16px_rgba(5,8,30,0.45)] lg:hidden"
      >
        <div className="mx-auto max-w-md">{azione("bar")}</div>
      </div>
    </div>
  );
}

export default GameScreen;
