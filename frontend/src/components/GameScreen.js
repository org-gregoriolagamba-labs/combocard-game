import { Coins, ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";
import { API_URL, SEMI_COLORS } from "../config";
import Cartella from "./Cartella";
import CollezioniPanel from "./CollezioniPanel";
import PlayersList from "./PlayersList";

export default function GameScreen({
  gameId,
  playerId,
  playerName,
  game,
  currentPlayer,
  setCurrentPlayer,
  ultimaCartaEstratta,
  jollyMode,
  setJollyMode,
  tornaAllaHall,
  addToast,
}) {
  const montepremi = game?.montepremi || 0;
  const isCreator = game?.players?.[0]?.id === playerId;
  const [drawCooldown, setDrawCooldown] = useState(0);

  useEffect(() => {
    if (drawCooldown > 0) {
      const timer = setTimeout(() => setDrawCooldown(drawCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [drawCooldown]);

  const estraiCarta = async () => {
    if (drawCooldown > 0) {
      addToast(`Attendi ${drawCooldown} secondi prima di estrarre un'altra carta`);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/game/${gameId}/draw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error);
        return;
      }

      // Attiva cooldown di 8 secondi
      setDrawCooldown(8);
    } catch (error) {
      console.error("Errore estrazione carta:", error);
    }
  };

  const rivendicaCollezione = async (tipo) => {
    try {
      const response = await fetch(`${API_URL}/game/${gameId}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, tipo }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error);
        return;
      }

      const data = await response.json();
      alert(
        `🎉 Hai vinto ${tipo.toUpperCase().replace("_", " ")}!\nPremio: ${
          data.premio
        } gettoni!`
      );

      if (tipo === "combocard_reale") {
        alert("🏆 HAI VINTO CON COMBOCARD REALE! Partita terminata!");
      }
    } catch (error) {
      console.error("Errore rivendicazione collezione:", error);
    }
  };

  const attivaModalitaJolly = (tipo) => {
    if (currentPlayer.jollyUsato) {
      alert("Jolly già usato!");
      return;
    }

    if (game?.collezioni[tipo]?.vinto) {
      alert("Questa collezione è già stata vinta!");
      return;
    }

    setJollyMode(tipo);
    addToast(
      `🎯 Modalità Jolly attivata per ${tipo
        .toUpperCase()
        .replace("_", " ")}. Clicca su una carta non coperta.`,
      "info"
    );
  };

  const usaJolly = async (row, col) => {
    if (currentPlayer.jollyUsato) {
      alert("Jolly già usato!");
      return;
    }

    if (!jollyMode) {
      alert("Seleziona prima per quale collezione vuoi usare il Jolly!");
      return;
    }

    if (
      !window.confirm(
        `Usare Jolly per ${jollyMode
          .toUpperCase()
          .replace("_", " ")} sulla carta in posizione [${row + 1},${col + 1}]?`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/game/${gameId}/jolly`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, row, col, tipo: jollyMode }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error);
        setJollyMode(null);
        return;
      }

      const data = await response.json();
      alert(
        `✨ Jolly attivato! Carta convertita in ${data.convertedTo.valore} di ${data.convertedTo.seme}`
      );

      const newCartella = currentPlayer.cartella.map((r) =>
        r.map((c) => ({ ...c }))
      );
      newCartella[row][col] = { ...data.newCard };

      const newCoperte = currentPlayer.coperte.map((r) => [...r]);
      newCoperte[row][col] = true;

      setCurrentPlayer({
        ...currentPlayer,
        jollyUsato: true,
        jollyPos: { row, col },
        cartella: newCartella,
        coperte: newCoperte,
      });

      setJollyMode(null);
    } catch (error) {
      console.error("Errore uso jolly:", error);
      setJollyMode(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-700 p-4">
      <div className="max-w-7xl mx-auto">
        {jollyMode && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-yellow-400 text-yellow-900 px-6 py-3 rounded-xl shadow-2xl z-50 font-bold text-center">
            <p>
              🎯 Modalità Jolly attivata per{" "}
              {jollyMode.toUpperCase().replace("_", " ")}
            </p>
            <p className="text-sm">Clicca su una carta non coperta</p>
            <button
              onClick={() => setJollyMode(null)}
              className="mt-2 bg-red-500 text-white px-4 py-1 rounded-lg text-xs hover:bg-red-600"
            >
              Annulla
            </button>
          </div>
        )}

        <div className="bg-amber-50 rounded-2xl shadow-2xl p-4 mb-4 border-4 border-amber-600">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h2 className="text-2xl font-bold text-green-900 flex items-center gap-2">
                🎴 COMBOCARD - {playerName}
              </h2>
              <p className="text-sm text-green-700">Codice: {gameId}</p>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-green-700">Montepremi</p>
                <p className="text-2xl font-bold text-amber-600 flex items-center gap-1">
                  <Coins size={24} />
                  {montepremi}
                </p>
              </div>

              <div className="text-right">
                <p className="text-sm text-green-700">Tuoi Gettoni</p>
                <p className="text-2xl font-bold text-green-600 flex items-center gap-1">
                  <Coins size={24} />
                  {currentPlayer.gettoni}
                </p>
              </div>

              <button
                onClick={tornaAllaHall}
                className="bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-bold hover:bg-gray-400 transition flex items-center gap-2"
              >
                <ArrowLeft size={18} />
                Hall
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-amber-50 rounded-2xl shadow-2xl p-6 border-4 border-amber-600">
            <h3 className="text-xl font-bold mb-4 text-green-900">
              🎴 La Tua Cartella
            </h3>

            <Cartella
              cartella={currentPlayer.cartella}
              coperte={currentPlayer.coperte}
              jollyPos={currentPlayer.jollyPos}
              jollyMode={jollyMode}
              jollyUsato={currentPlayer.jollyUsato}
              onCardClick={usaJolly}
            />

            {!currentPlayer.jollyUsato && !jollyMode && (
              <p className="text-xs text-green-700 mt-3 text-center">
                💡 Seleziona una collezione e poi clicca "Usa Jolly" per
                attivare la modalità Jolly
              </p>
            )}
          </div>

          <div className="space-y-4">
            <div className="bg-amber-50 rounded-2xl shadow-2xl p-6 border-4 border-amber-600">
              <h3 className="text-lg font-bold mb-4 text-green-900">
                🎴 Ultima Carta
              </h3>

              {ultimaCartaEstratta ? (
                <div
                  className={`bg-gradient-to-br ${
                    SEMI_COLORS[ultimaCartaEstratta.seme]
                  } border-4 border-white rounded-2xl p-8 text-center shadow-2xl`}
                >
                  <div className="text-7xl mb-3">
                    {ultimaCartaEstratta.emoji}
                  </div>
                  <div className="text-3xl font-bold text-white mb-1">
                    {ultimaCartaEstratta.valore}
                  </div>
                  <div className="text-sm text-white opacity-90">
                    di {ultimaCartaEstratta.seme}
                  </div>
                </div>
              ) : (
                <div className="bg-green-100 rounded-2xl p-8 text-center text-green-700 border-2 border-green-300">
                  Nessuna carta estratta
                </div>
              )}

              <button
                onClick={estraiCarta}
                disabled={game?.status !== "playing" || !isCreator || drawCooldown > 0}
                className="w-full mt-4 bg-gradient-to-r from-green-600 to-green-800 text-white py-3 rounded-xl font-bold hover:from-green-700 hover:to-green-900 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {drawCooldown > 0 ? `⏱️ Attendi ${drawCooldown}s` : "🎲 Estrai Carta"}
              </button>

              <p className="text-xs text-green-700 mt-2 text-center">
                Carte rimaste: {game?.mazzo.length || 0}/40
              </p>
              
              {drawCooldown > 0 && (
                <div className="mt-2 bg-yellow-100 rounded-lg p-2 text-center">
                  <div className="text-xs text-yellow-800 font-bold">
                    💡 Usa questo tempo per valutare il Jolly
                  </div>
                  <div className="w-full bg-yellow-200 rounded-full h-2 mt-2 overflow-hidden">
                    <div 
                      className="bg-yellow-600 h-full transition-all duration-1000"
                      style={{ width: `${(drawCooldown / 8) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <PlayersList game={game} currentPlayerId={playerId} />

            <CollezioniPanel
              game={game}
              currentPlayer={currentPlayer}
              onClaim={rivendicaCollezione}
              onJollyMode={attivaModalitaJolly}
            />
          </div>
        </div>
      </div>
    </div>
  );
}