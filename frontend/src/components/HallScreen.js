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
  const [creditiDaAcquistare, setCreditiDaAcquistare] = useState(0);
  const [showCreaPartita, setShowCreaPartita] = useState(false);
  const [creditiRichiesti, setCreditiRichiesti] = useState(100);
  const [isPrivate, setIsPrivate] = useState(false);
  const [maxPlayers, setMaxPlayers] = useState(10);
  const [showJoinPrivate, setShowJoinPrivate] = useState(false);
  const [privateGameCode, setPrivateGameCode] = useState("");

  useEffect(() => {
    caricaLobbies();
    const interval = setInterval(caricaLobbies, 3000);
    return () => clearInterval(interval);
  }, []);

  // Reset importo quando si apre la cassa
  useEffect(() => {
    if (showCassa) {
      setCreditiDaAcquistare(0);
    }
  }, [showCassa]);

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

    if (creditiDaAcquistare > 10000) {
      alert("L'importo massimo acquistabile è 10000 crediti");
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
        body: JSON.stringify({ 
          playerId, 
          requiredCredits: creditiRichiesti,
          isPrivate,
          maxPlayers
        }),
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
      
      // Reset form
      setIsPrivate(false);
      setMaxPlayers(10);
      
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

  const uniscitiPartitaPrivata = async () => {
    if (!privateGameCode) {
      alert("Inserisci il codice partita");
      return;
    }
    
    setShowJoinPrivate(false);
    await uniscitiPartita(privateGameCode);
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

        {/* Crea Partita */}
        <div className="bg-amber-50 rounded-3xl shadow-2xl p-6 mb-6 border-4 border-amber-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              onClick={() => setShowCreaPartita(true)}
              className="bg-gradient-to-r from-green-600 to-green-800 text-white py-4 rounded-xl font-bold hover:from-green-700 hover:to-green-900 transition shadow-lg flex items-center justify-center gap-2 text-lg"
            >
              <Plus size={28} />
              Crea Nuova Partita
            </button>
            <button
              onClick={() => setShowJoinPrivate(true)}
              className="bg-gradient-to-r from-purple-600 to-purple-800 text-white py-4 rounded-xl font-bold hover:from-purple-700 hover:to-purple-900 transition shadow-lg flex items-center justify-center gap-2 text-lg"
            >
              🔒 Unisciti con Codice
            </button>
          </div>
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
                  Importo Crediti (max 10000)
                </label>
                <input
                  type="number"
                  value={creditiDaAcquistare}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    setCreditiDaAcquistare(Math.min(10000, Math.max(0, val)));
                  }}
                  className="w-full px-4 py-3 border-2 border-green-600 rounded-xl focus:border-green-800 focus:outline-none bg-white"
                  min="0"
                  max="10000"
                  step="5"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {[5, 10, 25, 50, 100, 500, 1000].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setCreditiDaAcquistare(prev => Math.min(10000, prev + amount))}
                    className="flex-1 min-w-[60px] bg-green-100 text-green-800 px-3 py-2 rounded-lg font-bold hover:bg-green-200 transition text-sm"
                  >
                    +{amount}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setCreditiDaAcquistare(0)}
                className="w-full bg-red-100 text-red-800 px-4 py-2 rounded-lg font-bold hover:bg-red-200 transition text-sm"
              >
                🔄 Reset Importo
              </button>
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
              
              <div>
                <label className="block text-sm font-medium text-green-900 mb-2">
                  👥 Numero Massimo Giocatori
                </label>
                <input
                  type="number"
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(Math.min(10, Math.max(2, parseInt(e.target.value) || 2)))}
                  className="w-full px-4 py-3 border-2 border-green-600 rounded-xl focus:border-green-800 focus:outline-none bg-white"
                  min="2"
                  max="10"
                />
                <p className="text-xs text-green-700 mt-1">La partita inizierà automaticamente quando raggiunto</p>
              </div>
              
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isPrivate"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="w-5 h-5"
                />
                <label htmlFor="isPrivate" className="text-sm font-medium text-green-900">
                  🔒 Partita Privata (solo con codice)
                </label>
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

      {/* Modal Unisciti Partita Privata */}
      {showJoinPrivate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-amber-50 rounded-3xl shadow-2xl p-8 max-w-md w-full border-4 border-purple-600">
            <h2 className="text-2xl font-bold mb-6 text-center text-green-900">
              🔒 Unisciti a Partita Privata
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-green-900 mb-2">
                  Codice Partita
                </label>
                <input
                  type="text"
                  value={privateGameCode}
                  onChange={(e) => setPrivateGameCode(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-purple-600 rounded-xl focus:border-purple-800 focus:outline-none bg-white"
                  placeholder="Inserisci il codice"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={uniscitiPartitaPrivata}
                  disabled={!privateGameCode}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-purple-800 text-white py-3 rounded-xl font-bold hover:from-purple-700 hover:to-purple-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ✅ Unisciti
                </button>
                <button
                  onClick={() => {
                    setShowJoinPrivate(false);
                    setPrivateGameCode("");
                  }}
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