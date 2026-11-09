/**
 * HallScreen Component
 * 
 * Main hall where players can view lobbies, buy credits, and create/join games.
 */

import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Plus, ShieldCheck } from "lucide-react";
import { buyCredits, logout } from "../../store/slices/playerSlice";
import { fetchLobby, createGame, joinGame, setGame, clearGame } from "../../store/slices/gameSlice";
import { setScreen, addToast } from "../../store/slices/uiSlice";
import { gameService } from "../../services";
import { Modal, Button, Input, Footer } from "../common";
import Credito from "./Credito";
import DeleteAccountDialog from "./DeleteAccountDialog";

// The number typed in a field, NaN when it is empty or is not a whole number
const numero = (testo) => (/^\d+$/.test(testo) ? parseInt(testo, 10) : NaN);

function HallScreen() {
  const dispatch = useDispatch();
  const { id: playerId, name: playerName, credits: playerCredits, role } = useSelector((state) => state.player);
  const { lobbies } = useSelector((state) => state.game);
  
  // Local state
  const [showCassa, setShowCassa] = useState(false);
  // The three numeric fields keep the text as typed: a number made of it would turn an empty field
  // into 0, and the field could never be cleared to type a new value
  const [creditiTesto, setCreditiTesto] = useState("");
  const creditiDaAcquistare = numero(creditiTesto) || 0;
  const [showCreaPartita, setShowCreaPartita] = useState(false);
  // Ask what the player can afford, up to the usual 100
  const [creditiRichiestiTesto, setCreditiRichiestiTesto] = useState(
    String(Math.max(10, Math.min(100, playerCredits)) || 100)
  );
  const creditiRichiesti = numero(creditiRichiestiTesto);
  const [isPrivate, setIsPrivate] = useState(false);
  const [soundsEnabled, setSoundsEnabled] = useState(true);
  const [maxPlayersTesto, setMaxPlayersTesto] = useState("6");
  const maxPlayers = numero(maxPlayersTesto);
  const [showJoinPrivate, setShowJoinPrivate] = useState(false);
  const [privateGameCode, setPrivateGameCode] = useState("");
  const [createErrors, setCreateErrors] = useState({});
  const [privateError, setPrivateError] = useState(null);
  const [showDelete, setShowDelete] = useState(false);
  const inFlight = useRef(false);

  // Load lobbies on mount and periodically
  useEffect(() => {
    dispatch(fetchLobby());
    const interval = setInterval(() => {
      dispatch(fetchLobby());
    }, 3000);
    return () => clearInterval(interval);
  }, [dispatch]);

  const handleEsci = async () => {
    await dispatch(logout());
    dispatch(clearGame());
    dispatch(setScreen("home"));
  };

  const handleApriCassa = () => {
    setCreditiTesto("");
    setShowCassa(true);
  };

  // A double tap must not add the credits twice: the ref answers at once, the state would not
  const handleAcquistaCrediti = async () => {
    if (creditiDaAcquistare <= 0 || creditiDaAcquistare > 10000 || inFlight.current) {
      return;
    }

    inFlight.current = true;
    try {
      await dispatch(buyCredits({ playerId, amount: creditiDaAcquistare })).unwrap();
      dispatch(addToast({ message: `Aggiunti ${creditiDaAcquistare} crediti!`, type: "success" }));
      setShowCassa(false);
    } catch (error) {
      dispatch(addToast({ message: error || "Non sono riuscito ad aggiungere i crediti", type: "error" }));
    } finally {
      inFlight.current = false;
    }
  };

  // Each problem is shown in its field, once
  const validaCreaPartita = () => {
    const errors = {};

    if (Number.isNaN(creditiRichiesti)) {
      errors.creditiRichiesti = "Scrivi quanti crediti servono per entrare";
    } else if (creditiRichiesti < 10) {
      errors.creditiRichiesti = "Almeno 10 crediti";
    } else if (playerCredits < creditiRichiesti) {
      errors.creditiRichiesti = `Hai ${playerCredits} crediti: aggiungine con «Prendi crediti» o chiedi meno crediti`;
    }

    if (Number.isNaN(maxPlayers) || maxPlayers < 2 || maxPlayers > 10) {
      errors.maxPlayers = "Da 2 a 10 giocatori";
    }

    return errors;
  };

  const handleCreaPartita = async () => {
    const errors = validaCreaPartita();
    setCreateErrors(errors);
    if (Object.keys(errors).length > 0 || inFlight.current) {
      return;
    }

    inFlight.current = true;
    try {
      const result = await dispatch(createGame({
        requiredCredits: creditiRichiesti,
        isPrivate,
        maxPlayers,
        soundsEnabled,
      })).unwrap();

      setShowCreaPartita(false);
      setIsPrivate(false);
      setSoundsEnabled(true);
      setMaxPlayersTesto("6");

      // Automatically join the created game
      await handleUniscitiPartita(result.gameId);
    } catch (error) {
      dispatch(addToast({ message: error || "Non sono riuscito a creare la partita", type: "error" }));
    } finally {
      inFlight.current = false;
    }
  };

  // Joins a game and opens its lobby; resolves to an error message, or null when it worked
  const entraInPartita = async (targetGameId) => {
    try {
      await dispatch(joinGame({ gameId: targetGameId })).unwrap();
      const gameData = await gameService.getGame(targetGameId);
      dispatch(setGame(gameData));
      dispatch(setScreen("lobby"));
      return null;
    } catch (error) {
      return String(error?.message ?? error ?? "Errore nell'unirsi alla partita");
    }
  };

  const handleUniscitiPartita = async (targetGameId) => {
    const lobby = lobbies.find((l) => l.id === targetGameId);

    if (lobby && playerCredits < lobby.requiredCredits) {
      dispatch(addToast({
        message: `Servono ${lobby.requiredCredits} crediti per unirsi a questa partita!`,
        type: "error"
      }));
      return;
    }

    const errore = await entraInPartita(targetGameId);
    if (errore) {
      dispatch(addToast({ message: errore, type: "error" }));
    }
  };

  // A wrong code stays in the dialog, in its field, with what was typed
  const handleUniscitiPrivata = async () => {
    const codice = privateGameCode.trim();
    if (!codice) {
      setPrivateError("Inserisci il codice della partita");
      return;
    }

    const errore = await entraInPartita(codice);
    if (errore) {
      setPrivateError(errore);
      return;
    }

    setShowJoinPrivate(false);
    setPrivateGameCode("");
  };

  return (
    <div className="min-h-[100dvh] tavolo p-4">
      <div className="mx-auto max-w-3xl space-y-4">
        {/* Header and the two ways into a game */}
        <section className="superficie p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="titolo flex items-center gap-2 text-2xl text-testo sm:text-3xl">
                Hall
              </h1>
              <p className="break-words text-testo-2">Benvenuto, {playerName}!</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="sm:text-right">
                <p className="text-sm text-testo-2">I tuoi crediti</p>
                <p className="titolo flex items-center gap-2 text-2xl text-testo sm:text-3xl">
                  <Credito className="h-6 w-6" />
                  {playerCredits}
                </p>
              </div>
              <button
                onClick={handleApriCassa}
                className="flex min-h-[44px] max-w-full items-center gap-2 rounded-xl border border-oro bg-transparent px-5 py-3 max-[259px]:px-3 font-bold text-oro transition hover:bg-oro/10"
              >
                <Credito className="h-6 w-6" />
                Prendi crediti
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 border-t-2 border-linea pt-4 sm:grid-cols-2">
            <button
              onClick={() => setShowCreaPartita(true)}
              className="flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-oro px-6 py-3 font-bold text-inchiostro-900 shadow-md transition hover:bg-oro-dark"
            >
              <Plus size={22} aria-hidden="true" />
              Crea Nuova Partita
            </button>
            <button
              onClick={() => {
                setPrivateError(null);
                setShowJoinPrivate(true);
              }}
              className="min-h-[52px] rounded-xl border-2 border-linea-forte bg-notte-700 px-6 py-3 font-bold text-testo transition hover:bg-notte-600"
            >
              Unisciti a Partita Privata
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            {/* Only an admin sees the way in: the server refuses everybody else anyway */}
            {role === "admin" ? (
              <button
                onClick={() => dispatch(setScreen("admin"))}
                className="flex min-h-[44px] max-w-full items-center gap-2 rounded-lg px-3 text-sm font-bold text-oro underline decoration-2 underline-offset-4 hover:text-oro-dark"
              >
                <ShieldCheck size={18} aria-hidden="true" />
                Amministrazione
              </button>
            ) : (
              <span />
            )}
            <button
              onClick={handleEsci}
              className="min-h-[44px] [overflow-wrap:anywhere] rounded-lg px-3 text-sm font-bold text-testo-2 underline decoration-2 underline-offset-4 hover:text-testo"
            >
              Esci dall&apos;account
            </button>
          </div>
          <div className="mt-1 text-right">
            <button
              type="button"
              onClick={() => setShowDelete(true)}
              className="min-h-[44px] [overflow-wrap:anywhere] rounded-lg px-3 text-sm font-bold text-testo-3 underline decoration-2 underline-offset-4 hover:text-coppe"
            >
              Elimina il mio account
            </button>
          </div>
        </section>

        {/* Games waiting for players */}
        <section className="superficie p-4 sm:p-6">
          <h2 className="titolo mb-3 text-xl text-testo sm:text-2xl">Partite in attesa</h2>

          {lobbies.length === 0 ? (
            <p className="py-6 text-center text-testo-2 [text-wrap:pretty]">
              Nessuna partita in attesa. Creane una nuova!
            </p>
          ) : (
            <ul>
              {lobbies.map((lobby) => {
                const mancano = lobby.requiredCredits - playerCredits;
                return (
                  <li
                    key={lobby.id}
                    className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t-2 border-linea py-3 first:border-t-0 first:pt-0"
                  >
                    <div className="min-w-0">
                      <p className="[overflow-wrap:anywhere] font-bold text-testo">Partita di {lobby.creatorName}</p>
                      <p className="text-sm text-testo-2">
                        {lobby.playerCount}/{lobby.maxPlayers} giocatori · costa {lobby.requiredCredits} crediti
                        {mancano <= 0 && ` · te ne restano ${playerCredits - lobby.requiredCredits}`}
                      </p>
                      {mancano > 0 && (
                        <p className="text-sm font-bold text-coppe">Ti mancano {mancano} crediti</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleUniscitiPartita(lobby.id)}
                      disabled={mancano > 0}
                      className="min-h-[44px] shrink-0 rounded-lg bg-oro px-4 py-2 max-[259px]:px-2 font-bold text-inchiostro-900 transition hover:bg-oro-dark disabled:cursor-not-allowed disabled:text-testo-3 disabled:bg-notte-600"
                    >
                      Unisciti
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <Footer />
      </div>

      {/* Cash Register Modal */}
      <Modal
        isOpen={showCassa}
        onClose={() => setShowCassa(false)}
        title="Prendi crediti di gioco"
      >
        <div className="space-y-4">
          <p className="text-sm text-testo">
            Sono crediti di gioco: non hanno valore reale e non serve nessun pagamento.
          </p>
          <Input
            label="Quanti crediti vuoi?"
            type="number"
            inputMode="numeric"
            value={creditiTesto}
            onChange={(e) => setCreditiTesto(numero(e.target.value) > 10000 ? "10000" : e.target.value)}
            min="0"
            max="10000"
          />
          <div className="grid grid-cols-4 gap-2" role="group" aria-label="Importi rapidi">
            {[10, 50, 100, 500].map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => setCreditiTesto(String(Math.min(10000, creditiDaAcquistare + amount)))}
                className="min-h-[44px] rounded-lg border-2 border-linea-forte bg-notte-700 py-2 text-sm font-bold text-testo transition hover:bg-notte-600"
              >
                +{amount}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setCreditiTesto("")}
            className="min-h-[44px] w-full rounded-lg py-2 text-sm font-bold text-testo-2 underline decoration-2 underline-offset-4 transition hover:text-testo"
          >
            Azzera
          </button>
          <Button
            onClick={handleAcquistaCrediti}
            disabled={creditiDaAcquistare <= 0}
            className="w-full"
          >
            {creditiDaAcquistare > 0 ? `Aggiungi ${creditiDaAcquistare} crediti` : "Scegli un importo"}
          </Button>
        </div>
      </Modal>

      {/* Create Game Modal */}
      <Modal
        isOpen={showCreaPartita}
        onClose={() => setShowCreaPartita(false)}
        title="Crea nuova partita"
      >
        <div className="space-y-4">
          <Input
            label="Crediti richiesti per partecipare"
            type="number"
            inputMode="numeric"
            value={creditiRichiestiTesto}
            onChange={(e) => {
              setCreditiRichiestiTesto(e.target.value);
              setCreateErrors((errors) => ({ ...errors, creditiRichiesti: undefined }));
            }}
            error={createErrors.creditiRichiesti}
            hint="Ogni giocatore li paga per entrare e vanno nel montepremi."
            min="10"
          />
          <Input
            label="Numero massimo giocatori"
            type="number"
            inputMode="numeric"
            value={maxPlayersTesto}
            onChange={(e) => {
              setMaxPlayersTesto(e.target.value);
              setCreateErrors((errors) => ({ ...errors, maxPlayers: undefined }));
            }}
            error={createErrors.maxPlayers}
            hint="Da 2 a 10. Se la partita si riempie, parte da sola."
            min="2"
            max="10"
          />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPrivate"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="h-5 w-5"
            />
            <label htmlFor="isPrivate" className="text-testo">
              Partita Privata
            </label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="soundsEnabled"
              checked={soundsEnabled}
              onChange={(e) => setSoundsEnabled(e.target.checked)}
              aria-describedby="soundsEnabled-hint"
              className="h-5 w-5"
            />
            <label htmlFor="soundsEnabled" className="text-testo">
              Suoni di gioco
            </label>
          </div>
          <p id="soundsEnabled-hint" className="-mt-2 text-xs text-testo-2">
            Un suono a ogni carta, collezione e Jolly. Ognuno può comunque silenziarli per sé.
          </p>
          <Button onClick={handleCreaPartita} className="w-full">
            Crea Partita
          </Button>
        </div>
      </Modal>

      {/* Join Private Game Modal */}
      <Modal
        isOpen={showJoinPrivate}
        onClose={() => setShowJoinPrivate(false)}
        title="Unisciti a una partita privata"
      >
        <div className="space-y-4">
          <Input
            label="Codice Partita"
            type="text"
            value={privateGameCode}
            onChange={(e) => {
              setPrivateGameCode(e.target.value);
              setPrivateError(null);
            }}
            error={privateError ?? undefined}
            placeholder="Inserisci il codice"
          />
          <Button onClick={handleUniscitiPrivata} className="w-full">
            Unisciti
          </Button>
        </div>
      </Modal>

      {showDelete && <DeleteAccountDialog onClose={() => setShowDelete(false)} />}
    </div>
  );
}

export default HallScreen;
