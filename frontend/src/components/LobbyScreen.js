import { Users, PlayCircle, ArrowLeft } from "lucide-react";
import { useEffect } from "react";
import { API_URL } from "../config";

export default function LobbyScreen({
  gameId,
  playerId,
  playerName,
  playerCredits,
  game,
  setGame,
  setCurrentPlayer,
  setScreen,
  tornaAllaHall,
  addToast,
}) {
  // Polling per aggiornare lo stato della lobby
  useEffect(() => {
    const fetchGameState = async () => {
      try {
        const response = await fetch(`${API_URL}/game/${gameId}`);
        if (response.ok) {
          const gameData = await response.json();
          setGame(gameData);
        }
      } catch (error) {
        console.error("Errore aggiornamento lobby:", error);
      }
    };

    // Fetch iniziale
    fetchGameState();

    // Polling ogni 2 secondi
    const interval = setInterval(fetchGameState, 2000);
    return () => clearInterval(interval);
  }, [gameId, setGame]);
  const iniziaPartita = async () => {
    try {
      const response = await fetch(`${API_URL}/game/${gameId}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error);
        return;
      }

      const data = await response.json();
      setGame(data.game);
      const cp = data.game.players.find((p) => p.id === playerId);
      if (cp) setCurrentPlayer(cp);
      setScreen("game");
    } catch (error) {
      console.error("Errore avvio partita:", error);
    }
  };

  // Verifica se l'utente corrente è il creatore
  const isCreator = game?.players?.length > 0 && game.players[0].id === playerId;
  const canStart = isCreator && game?.players?.length >= 2;

  console.log("Lobby state:", { 
    playerId, 
    firstPlayerId: game?.players?.[0]?.id, 
    isCreator, 
    playerCount: game?.players?.length,
    canStart 
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-900 via-amber-800 to-orange-800 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-amber-50 rounded-3xl shadow-2xl p-6 mb-6 border-4 border-amber-700">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-3xl font-bold text-green-900">🎴 Lobby COMBOCARD</h2>
              <p className="text-green-700 mt-1">Benvenuto, {playerName}!</p>
            </div>
            <button
              onClick={tornaAllaHall}
              className="bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-bold hover:bg-gray-400 transition flex items-center gap-2"
            >
              <ArrowLeft size={18} />
              Esci
            </button>
          </div>

          <div className="bg-green-100 p-4 rounded-xl mb-4 border-2 border-green-600">
            <p className="font-bold text-green-900">
              Codice Partita:{" "}
              <span className="text-2xl font-mono text-green-700">{gameId}</span>
            </p>
            <p className="text-sm text-green-700 mt-2">
              Costo partecipazione: {game?.requiredCredits} crediti
            </p>
            <p className="text-sm text-green-700">
              I tuoi crediti: {playerCredits}
            </p>
            {game?.isPrivate && (
              <p className="text-sm text-purple-700 font-bold mt-1">
                🔒 Partita Privata
              </p>
            )}
            {game?.players?.length === game?.maxPlayers && (
              <p className="text-sm text-yellow-700 font-bold mt-2 bg-yellow-100 p-2 rounded animate-pulse">
                ⚡ Partita in avvio automatico!
              </p>
            )}
          </div>
        </div>

        <div className="bg-amber-50 rounded-3xl shadow-2xl p-6 border-4 border-amber-700">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-green-900">
            <Users size={24} />
            Giocatori ({game?.players.length || 0}/{game?.maxPlayers || 10})
          </h3>

          <div className="space-y-2 mb-6">
            {game?.players.map((player, idx) => (
              <div
                key={idx}
                className="bg-green-50 p-3 rounded-xl flex justify-between items-center border-2 border-green-200"
              >
                <span className="font-bold text-green-900">
                  {player.name} {idx === 0 && "👑"}
                </span>
                <span className="text-sm text-green-700">Pronto!</span>
              </div>
            ))}
          </div>

          {canStart && (
            <button
              onClick={iniziaPartita}
              className="w-full bg-gradient-to-r from-green-600 to-green-800 text-white py-4 rounded-xl font-bold hover:from-green-700 hover:to-green-900 transition flex items-center justify-center gap-2 shadow-lg"
            >
              <PlayCircle size={28} />
              <span className="text-lg">Inizia Partita</span>
            </button>
          )}

          {!isCreator && game?.players?.length >= 2 && (
            <p className="text-center text-green-700 text-sm">
              In attesa che il creatore avvii la partita...
            </p>
          )}

          {game?.players?.length < 2 && (
            <p className="text-center text-green-700 text-sm">
              Servono almeno 2 giocatori per iniziare
            </p>
          )}
        </div>
      </div>
    </div>
  );
}