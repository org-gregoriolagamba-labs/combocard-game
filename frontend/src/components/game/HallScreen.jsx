/**
 * HallScreen Component
 * 
 * Main hall where players can view lobbies, buy credits, and create/join games.
 */

import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Coins, Plus, Users, DollarSign } from "lucide-react";
import { buyCredits, fetchPlayer } from "../../store/slices/playerSlice";
import { fetchLobby, createGame, joinGame, setGame } from "../../store/slices/gameSlice";
import { setScreen, addToast } from "../../store/slices/uiSlice";
import { gameService } from "../../services";
import { Modal, Button, Input } from "../common";

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

  // Load lobbies on mount and periodically
  useEffect(() => {
    dispatch(fetchLobby());
    const interval = setInterval(() => {
      dispatch(fetchLobby());
    }, 3000);
    return () => clearInterval(interval);
  }, [dispatch]);

  // Reset amount when opening cash register
  useEffect(() => {
    if (showCassa) {
      setCreditiDaAcquistare(0);
    }
  }, [showCassa]);

  const handleAcquistaCrediti = async () => {
    if (creditiDaAcquistare <= 0) {
      dispatch(addToast({ message: "Inserisci un importo valido", type: "error" }));
      return;
    }

    if (creditiDaAcquistare > 10000) {
      dispatch(addToast({ message: "L'importo massimo acquistabile è 10000 crediti", type: "error" }));
      return;
    }

    try {
      await dispatch(buyCredits({ playerId, amount: creditiDaAcquistare })).unwrap();
      dispatch(addToast({ message: `✅ Acquistati ${creditiDaAcquistare} crediti!`, type: "success" }));
      setShowCassa(false);
    } catch (error) {
      dispatch(addToast({ message: error || "Errore nell'acquisto dei crediti", type: "error" }));
    }
  };

  const handleCreaPartita = async () => {
    if (playerCredits < creditiRichiesti) {
      dispatch(addToast({ message: "Crediti insufficienti!", type: "error" }));
      return;
    }

    try {
      const result = await dispatch(createGame({
        playerId,
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
      dispatch(addToast({ message: error || "Errore nella creazione della partita", type: "error" }));
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
      await dispatch(joinGame({ gameId: targetGameId, playerId })).unwrap();
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
        <div className="bg-amber-50 rounded-3xl shadow-2xl p-6 mb-6 border-4 border-amber-700">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-green-900">🎴 Hall COMBOCARD</h1>
              <p className="text-green-700">Benvenuto, {playerName}!</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-green-700">I Tuoi Crediti</p>
                <p className="text-3xl font-bold text-green-600 flex items-center gap-2">
                  <Coins size={32} />
                  {playerCredits}
                </p>
              </div>
              <button
                onClick={() => setShowCassa(true)}
                className="bg-gradient-to-r from-yellow-500 to-yellow-700 text-white px-6 py-3 rounded-xl font-bold hover:from-yellow-600 hover:to-yellow-800 transition shadow-lg flex items-center gap-2"
              >
                <DollarSign size={20} />
                Cassa
              </button>
            </div>
          </div>
        </div>

        {/* Create/Join buttons */}
        <div className="bg-amber-50 rounded-3xl shadow-2xl p-6 mb-6 border-4 border-amber-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              onClick={() => setShowCreaPartita(true)}
              className="bg-gradient-to-r from-green-600 to-green-800 text-white px-6 py-4 rounded-xl font-bold hover:from-green-700 hover:to-green-900 transition shadow-lg flex items-center justify-center gap-2"
            >
              <Plus size={24} />
              Crea Nuova Partita
            </button>
            <button
              onClick={() => setShowJoinPrivate(true)}
              className="bg-gradient-to-r from-blue-600 to-blue-800 text-white px-6 py-4 rounded-xl font-bold hover:from-blue-700 hover:to-blue-900 transition shadow-lg flex items-center justify-center gap-2"
            >
              🔒 Unisciti a Partita Privata
            </button>
          </div>
        </div>

        {/* Lobbies */}
        <div className="bg-amber-50 rounded-3xl shadow-2xl p-6 border-4 border-amber-700">
          <h2 className="text-2xl font-bold text-green-900 mb-4 flex items-center gap-2">
            <Users size={28} />
            Partite in Attesa
          </h2>
          
          {lobbies.length === 0 ? (
            <p className="text-center text-green-700 py-8">
              Nessuna partita in attesa. Creane una nuova!
            </p>
          ) : (
            <div className="space-y-3">
              {lobbies.map((lobby) => (
                <div
                  key={lobby.id}
                  className="bg-white rounded-xl p-4 shadow flex justify-between items-center"
                >
                  <div>
                    <p className="font-bold text-green-900">
                      Partita di {lobby.creatorName}
                    </p>
                    <p className="text-sm text-green-700">
                      {lobby.playerCount}/{lobby.maxPlayers} giocatori • {lobby.requiredCredits} crediti
                    </p>
                  </div>
                  <button
                    onClick={() => handleUniscitiPartita(lobby.id)}
                    className="bg-gradient-to-r from-green-500 to-green-700 text-white px-4 py-2 rounded-lg font-bold hover:from-green-600 hover:to-green-800 transition"
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
        title="💰 Cassa - Acquista Crediti"
      >
        <div className="space-y-4">
          <Input
            label="Importo da acquistare"
            type="number"
            value={creditiDaAcquistare}
            onChange={(e) => setCreditiDaAcquistare(parseInt(e.target.value) || 0)}
            min="0"
            max="10000"
          />
          <div className="grid grid-cols-3 gap-2">
            {[100, 500, 1000].map((amount) => (
              <button
                key={amount}
                onClick={() => setCreditiDaAcquistare(amount)}
                className="bg-green-100 text-green-800 py-2 rounded-lg font-bold hover:bg-green-200 transition"
              >
                {amount}
              </button>
            ))}
          </div>
          <Button onClick={handleAcquistaCrediti} className="w-full">
            💳 Acquista {creditiDaAcquistare} Crediti
          </Button>
        </div>
      </Modal>

      {/* Create Game Modal */}
      <Modal
        isOpen={showCreaPartita}
        onClose={() => setShowCreaPartita(false)}
        title="🎮 Crea Nuova Partita"
      >
        <div className="space-y-4">
          <Input
            label="Crediti richiesti per partecipare"
            type="number"
            value={creditiRichiesti}
            onChange={(e) => setCreditiRichiesti(parseInt(e.target.value) || 0)}
            min="10"
          />
          <Input
            label="Numero massimo giocatori"
            type="number"
            value={maxPlayers}
            onChange={(e) => setMaxPlayers(parseInt(e.target.value) || 2)}
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
              🔒 Partita Privata
            </label>
          </div>
          <Button onClick={handleCreaPartita} className="w-full">
            ✨ Crea Partita
          </Button>
        </div>
      </Modal>

      {/* Join Private Game Modal */}
      <Modal
        isOpen={showJoinPrivate}
        onClose={() => setShowJoinPrivate(false)}
        title="🔒 Unisciti a Partita Privata"
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
            🚀 Unisciti
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export default HallScreen;
