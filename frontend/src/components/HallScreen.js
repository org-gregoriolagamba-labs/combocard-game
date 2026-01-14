import { useState, useEffect } from "react";
import { Coins, Plus, Users, DollarSign } from "lucide-react";
import { API_URL } from "../config";

export default function HallScreen({
  playerId,
  playerName,
  playerCredits,
  setPlayerCredits,
  setGameId,
  setGame,
  setScreen,
  addToast,
}) {
  const [lobbies, setLobbies] = useState([]);
  const [showCassa, setShowCassa] = useState(false);
  const [creditiDaAcquistare, setCreditiDaAcquistare] = useState(100);
  const [showCreaPartita, setShowCreaPartita] = useState(false);
  const [creditiRichiesti, setCreditiRichiesti] = useState(100);

  useEffect(() => {
    caricaLobbies();
    const interval = setInterval(caricaLobbies, 3000);
    return () => clearInterval(interval);
  }, []);

  const caricaLobbies = async () => {
    try {
      const response = await fetch(`${API_URL}/games/lobby`);
      if (response.ok) {
        const data = await response.json();
        setLobbies(data);
      }
    } catch (error) {
      console.error("Errore caricamento lobbies:", error);
    }
  };

  const acquistaCrediti = async () => {
    if (creditiDaAcquistare <= 0) {
      alert("Inserisci un importo valido");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/player/${playerId}/buy-credits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: creditiDaAcquistare }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error);
        return;
      }

      const data = await response.json();
      setPlayerCredits(data.credits);
      addToast(`✅ Acquistati ${creditiDaAcquistare} crediti!`);
      setShowCassa(false);
      setCreditiDaAcquistare(100);
    } catch (error) {
      console.error("Errore acquisto crediti:", error);
      alert("Errore nell'acquisto dei crediti");
    }
  };

  const creaPartita = async () => {
    if (playerCredits < creditiRichiesti) {
      alert("Crediti insufficienti!");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/game/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, requiredCredits: creditiRichiesti }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error);
        return;
      }

      const data = await response.json();
      const createdGameId = data.gameId;
      setGameId(createdGameId);
      setShowCreaPartita(false);
      
      // Unisciti automaticamente alla partita creata
      await uniscitiPartita(createdGameId);
    } catch (error) {
      console.error("Errore creazione partita:", error);
      alert("Errore nella creazione della partita");
    }
  };

  const uniscitiPartita = async (targetGameId) => {
    const lobby = lobbies.find((l) => l.id === targetGameId);
    
    if (lobby && playerCredits < lobby.requiredCredits) {
      alert(`Servono ${lobby.requiredCredits} crediti per unirsi a questa partita!`);
      return;
    }

    try {
      const joinResponse = await fetch(`${API_URL}/game/${targetGameId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
      });

      if (!joinResponse.ok) {
        const error = await joinResponse.json();
        alert(error.error);
        return;
      }

      const gameResponse = await fetch(`${API_URL}/game/${targetGameId}`);
      const gameData = await gameResponse.json();
      
      setGameId(targetGameId);
      setGame(gameData);
      setScreen("lobby");
    } catch (error) {
      console.error("Errore unione partita:", error);
      alert("Errore nell'unirsi alla partita");
    }
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

        {/* Crea Partita */}
        <div className="bg-amber-50 rounded-3xl shadow-2xl p-6 mb-6 border-4 border-amber-700">
          <button
            onClick={() => setShowCreaPartita(true)}
            className="w-full bg-gradient-to-r from-green-600 to-green-800 text-white py-4 rounded-xl font-bold hover:from-green-700 hover:to-green-900 transition shadow-lg flex items-center justify-center gap-2 text-lg"
          >
            <Plus size={28} />
            Crea Nuova Partita
          </button>
        </div>

        {/* Lista Lobbies */}
        <div className="bg-amber-50 rounded-3xl shadow-2xl p-6 border-4 border-amber-700">
          <h2 className="text-2xl font-bold mb-4 text-green-900 flex items-center gap-2">
            <Users size={28} />
            Partite Disponibili ({lobbies.length})
          </h2>

          {lobbies.length === 0 ? (
            <p className="text-center text-green-700 py-8">
              Nessuna partita disponibile. Crea la prima!
            </p>
          ) : (
            <div className="space-y-3">
              {lobbies.map((lobby) => (
                <div
                  key={lobby.id}
                  className="bg-white p-4 rounded-xl border-2 border-green-200 flex justify-between items-center hover:border-green-400 transition"
                >
                  <div>
                    <p className="font-bold text-green-900">
                      Partita di {lobby.creatorName}
                    </p>
                    <p className="text-sm text-green-700">
                      Giocatori: {lobby.playerCount}/{lobby.maxPlayers}
                    </p>
                  </div>
                  <div className="text-right flex items-center gap-4">
                    <div>
                      <p className="text-xs text-green-700">Costo</p>
                      <p className="font-bold text-green-600 flex items-center gap-1">
                        <Coins size={18} />
                        {lobby.requiredCredits}
                      </p>
                    </div>
                    <button
                      onClick={() => uniscitiPartita(lobby.id)}
                      disabled={playerCredits < lobby.requiredCredits}
                      className="bg-gradient-to-r from-green-600 to-green-800 text-white px-6 py-2 rounded-lg font-bold hover:from-green-700 hover:to-green-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Unisciti
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Cassa */}
      {showCassa && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-amber-50 rounded-3xl shadow-2xl p-8 max-w-md w-full border-4 border-yellow-600">
            <h2 className="text-2xl font-bold mb-6 text-center text-green-900">
              💰 Cassa - Acquista Crediti
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-green-900 mb-2">
                  Importo Crediti
                </label>
                <input
                  type="number"
                  value={creditiDaAcquistare}
                  onChange={(e) => setCreditiDaAcquistare(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-3 border-2 border-green-600 rounded-xl focus:border-green-800 focus:outline-none bg-white"
                  min="10"
                  step="10"
                />
              </div>
              <div className="flex gap-2">
                {[100, 500, 1000].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setCreditiDaAcquistare(amount)}
                    className="flex-1 bg-green-100 text-green-800 px-3 py-2 rounded-lg font-bold hover:bg-green-200 transition text-sm"
                  >
                    +{amount}
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={acquistaCrediti}
                  className="flex-1 bg-gradient-to-r from-green-600 to-green-800 text-white py-3 rounded-xl font-bold hover:from-green-700 hover:to-green-900 transition"
                >
                  ✅ Acquista
                </button>
                <button
                  onClick={() => setShowCassa(false)}
                  className="flex-1 bg-gray-300 text-gray-800 py-3 rounded-xl font-bold hover:bg-gray-400 transition"
                >
                  Annulla
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Crea Partita */}
      {showCreaPartita && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-amber-50 rounded-3xl shadow-2xl p-8 max-w-md w-full border-4 border-green-600">
            <h2 className="text-2xl font-bold mb-6 text-center text-green-900">
              ✨ Crea Nuova Partita
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-green-900 mb-2">
                  💰 Crediti Richiesti per Partecipare
                </label>
                <input
                  type="number"
                  value={creditiRichiesti}
                  onChange={(e) => setCreditiRichiesti(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-3 border-2 border-green-600 rounded-xl focus:border-green-800 focus:outline-none bg-white"
                  min="10"
                  step="10"
                />
              </div>
              <div className="bg-green-100 p-3 rounded-xl text-sm text-green-800">
                <p>I tuoi crediti: <strong>{playerCredits}</strong></p>
                <p className="mt-1">
                  {playerCredits >= creditiRichiesti
                    ? "✅ Hai crediti sufficienti"
                    : "❌ Crediti insufficienti"}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={creaPartita}
                  disabled={playerCredits < creditiRichiesti}
                  className="flex-1 bg-gradient-to-r from-green-600 to-green-800 text-white py-3 rounded-xl font-bold hover:from-green-700 hover:to-green-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ✅ Crea
                </button>
                <button
                  onClick={() => setShowCreaPartita(false)}
                  className="flex-1 bg-gray-300 text-gray-800 py-3 rounded-xl font-bold hover:bg-gray-400 transition"
                >
                  Annulla
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}