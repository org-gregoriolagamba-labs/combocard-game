import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import "./index.css";
import "./App.css";
import { BACKEND_URL, API_URL } from "./config";
import HomeScreen from "./components/HomeScreen";
import HallScreen from "./components/HallScreen";
import LobbyScreen from "./components/LobbyScreen";
import GameScreen from "./components/GameScreen";
import { useToast } from "./hooks/useToast";
import { useSocket } from "./hooks/useSocket";
import Toast from "./components/Toast";

function App() {
  const [screen, setScreen] = useState("home"); // home, hall, lobby, game
  const [gameId, setGameId] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [playerCredits, setPlayerCredits] = useState(0);
  const [game, setGame] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [ultimaCartaEstratta, setUltimaCartaEstratta] = useState(null);
  const [jollyMode, setJollyMode] = useState(null);

  const { toasts, addToast } = useToast();
  
  useSocket(
    gameId,
    playerId,
    setGame,
    setCurrentPlayer,
    setUltimaCartaEstratta,
    setScreen,
    setJollyMode,
    addToast
  );

  const registraGiocatore = async (name) => {
    try {
      const response = await fetch(`${API_URL}/player/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerName: name }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error);
        return false;
      }

      const data = await response.json();
      setPlayerId(data.playerId);
      setPlayerName(data.player.name);
      setPlayerCredits(data.player.credits);
      setScreen("hall");
      return true;
    } catch (error) {
      console.error("Errore registrazione:", error);
      alert("Errore nella registrazione");
      return false;
    }
  };

  const aggiornaCrediti = async () => {
    if (!playerId) return;
    
    try {
      const response = await fetch(`${API_URL}/player/${playerId}`);
      if (response.ok) {
        const data = await response.json();
        setPlayerCredits(data.credits);
      }
    } catch (error) {
      console.error("Errore aggiornamento crediti:", error);
    }
  };

  const tornaAllaHall = async () => {
    // Se la partita è in corso, chiedi conferma
    if (game && game.status === 'playing') {
      const confirmed = window.confirm(
        "⚠️ La partita è ancora in corso!\n\n" +
        "Se esci ora perderai i crediti spesi per partecipare e non potrai rientrare.\n" +
        "I tuoi gettoni attuali verranno salvati.\n\n" +
        "Sei sicuro di voler uscire?"
      );
      
      if (!confirmed) {
        return; // L'utente ha annullato
      }
    }
    
    if (game && playerId) {
      try {
        await fetch(`${API_URL}/game/${gameId}/leave`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playerId }),
        });
      } catch (error) {
        console.error("Errore uscita partita:", error);
      }
    }
    
    setGameId("");
    setGame(null);
    setCurrentPlayer(null);
    setUltimaCartaEstratta(null);
    setJollyMode(null);
    await aggiornaCrediti();
    setScreen("hall");
  };

  if (screen === "home") {
    return (
      <>
        <HomeScreen
          playerName={playerName}
          setPlayerName={setPlayerName}
          registraGiocatore={registraGiocatore}
        />
        <Toast toasts={toasts} />
      </>
    );
  }

  if (screen === "hall") {
    return (
      <>
        <HallScreen
          playerId={playerId}
          playerName={playerName}
          playerCredits={playerCredits}
          setPlayerCredits={setPlayerCredits}
          setGameId={setGameId}
          setGame={setGame}
          setScreen={setScreen}
          addToast={addToast}
        />
        <Toast toasts={toasts} />
      </>
    );
  }

  if (screen === "lobby") {
    return (
      <>
        <LobbyScreen
          gameId={gameId}
          playerId={playerId}
          playerName={playerName}
          playerCredits={playerCredits}
          game={game}
          setGame={setGame}
          setCurrentPlayer={setCurrentPlayer}
          setScreen={setScreen}
          tornaAllaHall={tornaAllaHall}
          addToast={addToast}
        />
        <Toast toasts={toasts} />
      </>
    );
  }

  if (screen === "game" && currentPlayer) {
    return (
      <>
        <GameScreen
          gameId={gameId}
          playerId={playerId}
          playerName={playerName}
          game={game}
          currentPlayer={currentPlayer}
          setCurrentPlayer={setCurrentPlayer}
          ultimaCartaEstratta={ultimaCartaEstratta}
          setUltimaCartaEstratta={setUltimaCartaEstratta}
          jollyMode={jollyMode}
          setJollyMode={setJollyMode}
          tornaAllaHall={tornaAllaHall}
          addToast={addToast}
        />
        <Toast toasts={toasts} />
      </>
    );
  }

  return null;
}

export default App;