/**
 * HallScreen Component
 * 
 * Main hall where players can view lobbies, buy credits, and create/join games.
 */

import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Coins, Plus, Users, DollarSign } from "lucide-react";
import { buyCredits, logout } from "../../store/slices/playerSlice";
import { fetchLobby, createGame, joinGame, setGame, clearGame } from "../../store/slices/gameSlice";
import { setScreen, addToast } from "../../store/slices/uiSlice";
import { gameService } from "../../services";
import { Modal, Button, Input } from "../common";
import Seme from "./Seme";

function HallScreen() {
  const dispatch = useDispatch();
  const { id: playerId, name: playerName, credits: playerCredits } = useSelector((state) => state.player);
  const { lobbies } = useSelector((state) => state.game);
  
  // Local state
  const [showCassa, setShowCassa] = useState(false);
  const [creditiDaAcquistare, setCreditiDaAcquistare] = useState(0);
  const [showCreaPartita, setShowCreaPartita] = useState(false);
  const [creditiRichiesti, setCreditiRichiesti] = useState(100);
  const [isPrivate, setIsPrivate] = useState(false);
  const [maxPlayers, setMaxPlayers] = useState(10);
  const [showJoinPrivate, setShowJoinPrivate] = useState(false);
  const [privateGameCode, setPrivateGameCode] = useState("");
  const [createErrors, setCreateErrors] = useState({});
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
    setCreditiDaAcquistare(0);
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

    if (creditiRichiesti < 10) {
      errors.creditiRichiesti = "Almeno 10 crediti";
    } else if (playerCredits < creditiRichiesti) {
      errors.creditiRichiesti = `Hai ${playerCredits} crediti: aggiungine dalla Cassa o chiedi meno crediti`;
    }

    if (maxPlayers < 2 || maxPlayers > 10) {
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
      })).unwrap();

      setShowCreaPartita(false);
      setIsPrivate(false);
      setMaxPlayers(10);

      // Automatically join the created game
      await handleUniscitiPartita(result.gameId);
    } catch (error) {
      dispatch(addToast({ message: error || "Non sono riuscito a creare la partita", type: "error" }));
    } finally {
      inFlight.current = false;
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

    try {
      await dispatch(joinGame({ gameId: targetGameId })).unwrap();
      const gameData = await gameService.getGame(targetGameId);
      dispatch(setGame(gameData));
      dispatch(setScreen("lobby"));
    } catch (error) {
      dispatch(addToast({ message: error || "Errore nell'unirsi alla partita", type: "error" }));
    }
  };

  const handleUniscitiPrivata = async () => {
    if (!privateGameCode) {
      dispatch(addToast({ message: "Inserisci il codice partita", type: "error" }));
      return;
    }
    
    setShowJoinPrivate(false);
    await handleUniscitiPartita(privateGameCode);
    setPrivateGameCode("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-900 via-amber-800 to-orange-800 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-amber-50 rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-6 mb-4 sm:mb-6 border-2 sm:border-4 border-amber-700">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-green-900 flex items-center gap-2">
                <Seme seme="Denari" className="h-8 w-8 shrink-0" />
                Hall COMBOCARD
              </h1>
              <p className="text-green-700 break-words">Benvenuto, {playerName}!</p>
            </div>
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <div className="sm:text-right">
                <p className="text-sm text-green-800">I tuoi crediti</p>
                <p className="text-2xl sm:text-3xl font-bold tabular-nums text-green-700 flex items-center gap-2">
                  <Coins size={28} aria-hidden="true" />
                  {playerCredits}
                </p>
              </div>
              <button
                onClick={handleEsci}
                className="bg-gray-200 text-gray-800 px-4 py-3 min-h-[44px] rounded-xl font-bold hover:bg-gray-300 transition"
              >
                Esci
              </button>
              <button
                onClick={handleApriCassa}
                className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-950 px-5 sm:px-6 py-3 min-h-[44px] rounded-xl font-bold hover:from-yellow-500 hover:to-yellow-600 transition shadow-lg flex items-center gap-2"
              >
                <DollarSign size={20} />
                Cassa
              </button>
            </div>
          </div>
        </div>

        {/* Create/Join buttons */}
        <div className="bg-amber-50 rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-6 mb-4 sm:mb-6 border-2 sm:border-4 border-amber-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              onClick={() => setShowCreaPartita(true)}
              className="bg-gradient-to-r from-green-700 to-green-900 text-white px-6 py-4 rounded-xl font-bold hover:from-green-800 hover:to-green-900 transition shadow-lg flex items-center justify-center gap-2"
            >
              <Plus size={24} />
              Crea Nuova Partita
            </button>
            <button
              onClick={() => setShowJoinPrivate(true)}
              className="bg-gradient-to-r from-blue-600 to-blue-800 text-white px-6 py-4 rounded-xl font-bold hover:from-blue-700 hover:to-blue-900 transition shadow-lg flex items-center justify-center gap-2"
            >
              Unisciti a Partita Privata
            </button>
          </div>
        </div>

        {/* Lobbies */}
        <div className="bg-amber-50 rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-6 border-2 sm:border-4 border-amber-700">
          <h2 className="text-xl sm:text-2xl font-bold text-green-900 mb-4 flex items-center gap-2">
            <Users size={28} />
            Partite in Attesa
          </h2>
          
          {lobbies.length === 0 ? (
            <p className="text-center text-green-800 py-8 [text-wrap:pretty]">
              Nessuna partita in attesa. Creane una nuova!
            </p>
          ) : (
            <div className="space-y-3">
              {lobbies.map((lobby) => (
                <div
                  key={lobby.id}
                  className="bg-white rounded-xl p-3 sm:p-4 shadow flex justify-between items-center gap-3"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-green-900">
                      Partita di {lobby.creatorName}
                    </p>
                    <p className="text-sm text-green-700">
                      {lobby.playerCount}/{lobby.maxPlayers} giocatori • {lobby.requiredCredits} crediti
                    </p>
                  </div>
                  <button
                    onClick={() => handleUniscitiPartita(lobby.id)}
                    className="bg-gradient-to-r from-green-700 to-green-900 text-white px-4 py-2 min-h-[44px] shrink-0 rounded-lg font-bold hover:from-green-800 hover:to-green-900 transition"
                  >
                    Unisciti
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cash Register Modal */}
      <Modal
        isOpen={showCassa}
        onClose={() => setShowCassa(false)}
        title="Cassa: aggiungi crediti"
      >
        <div className="space-y-4">
          <p className="text-sm text-green-900">
            Sono crediti di gioco: non hanno valore reale e non serve nessun pagamento.
          </p>
          <Input
            label="Importo da aggiungere"
            type="number"
            inputMode="numeric"
            value={creditiDaAcquistare}
            onChange={(e) => setCreditiDaAcquistare(Math.min(10000, parseInt(e.target.value) || 0))}
            min="0"
            max="10000"
          />
          <div className="grid grid-cols-4 gap-2">
            {[5, 10, 25, 50, 100, 500, 1000].map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => setCreditiDaAcquistare(prev => Math.min(10000, prev + amount))}
                className="min-h-[44px] bg-green-100 text-green-900 py-2 rounded-lg font-bold hover:bg-green-200 transition text-sm"
              >
                +{amount}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setCreditiDaAcquistare(0)}
            className="min-h-[44px] w-full bg-red-100 text-red-900 py-2 rounded-lg font-bold hover:bg-red-200 transition"
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
            value={creditiRichiesti}
            onChange={(e) => {
              setCreditiRichiesti(parseInt(e.target.value) || 0);
              setCreateErrors((errors) => ({ ...errors, creditiRichiesti: undefined }));
            }}
            error={createErrors.creditiRichiesti}
            min="10"
          />
          <Input
            label="Numero massimo giocatori"
            type="number"
            inputMode="numeric"
            value={maxPlayers}
            onChange={(e) => {
              setMaxPlayers(parseInt(e.target.value) || 0);
              setCreateErrors((errors) => ({ ...errors, maxPlayers: undefined }));
            }}
            error={createErrors.maxPlayers}
            min="2"
            max="10"
          />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPrivate"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="w-5 h-5"
            />
            <label htmlFor="isPrivate" className="text-green-900">
              Partita Privata
            </label>
          </div>
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
            onChange={(e) => setPrivateGameCode(e.target.value)}
            placeholder="Inserisci il codice"
          />
          <Button onClick={handleUniscitiPrivata} className="w-full">
            Unisciti
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export default HallScreen;
