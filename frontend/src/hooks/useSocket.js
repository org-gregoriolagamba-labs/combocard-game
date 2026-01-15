import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { BACKEND_URL } from "../config";

export function useSocket(
  gameId,
  playerId,
  setGame,
  setCurrentPlayer,
  setUltimaCartaEstratta,
  setScreen,
  setJollyMode,
  addToast
) {
  const socketRef = useRef(null);
  const gameIdRef = useRef(gameId);
  const playerIdRef = useRef(playerId);

  useEffect(() => {
    gameIdRef.current = gameId;
    playerIdRef.current = playerId;
  }, [gameId, playerId]);

  // Effetto separato per joinGame quando gameId cambia
  useEffect(() => {
    if (socketRef.current && gameId) {
      console.log("Joining game room:", gameId);
      socketRef.current.emit("joinGame", gameId);
    }
  }, [gameId]);

  useEffect(() => {
    const socketBackend = BACKEND_URL.replace(/\/api\/?$/, "");
    const socket = io(socketBackend);
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Socket connected", socket.id);
      if (gameIdRef.current) socket.emit("joinGame", gameIdRef.current);
    });

    socket.on("playerJoined", ({ player }) => {
      console.log("Player joined event received:", player);
      addToast(`${player.name} si è unito alla partita`);
      
      // Forza refresh completo dello stato del gioco
      if (gameIdRef.current) {
        fetch(`${BACKEND_URL}/api/game/${gameIdRef.current}`)
          .then(res => res.json())
          .then(gameData => {
            console.log("Game state refreshed:", gameData);
            setGame(gameData);
          })
          .catch(err => console.error("Error refreshing game state:", err));
      }
    });

    socket.on("playerLeft", ({ playerName }) => {
      addToast(`${playerName} ha lasciato la partita`);
      setGame((prev) => {
        if (!prev) return prev;
        return { ...prev, players: prev.players.filter(p => p.name !== playerName) };
      });
    });

    socket.on("gameStarted", ({ game: srvGame }) => {
      if (srvGame) {
        setGame(srvGame);
        const cp = srvGame.players.find((p) => p.id === playerIdRef.current);
        if (cp) setCurrentPlayer(cp);
        if (playerIdRef.current) setScreen("game");
        addToast("Partita iniziata");
      }
    });

    socket.on("cardDrawn", ({ carta }) => {
      if (!carta) return;
      setUltimaCartaEstratta(carta);
      setGame((prev) => {
        if (!prev || prev.id !== gameIdRef.current) return prev;
        const newMazzo = Array.isArray(prev.mazzo) ? prev.mazzo.slice() : [];
        if (newMazzo.length > 0) newMazzo.pop();
        const newCarteEstratte = [...(prev.carteEstratte || []), carta];
        const updated = {
          ...prev,
          mazzo: newMazzo,
          carteEstratte: newCarteEstratte,
        };
        const cp = updated.players.find((p) => p.id === playerIdRef.current);
        if (cp) setCurrentPlayer(cp);
        return updated;
      });
      addToast("Carta estratta: " + carta.valore + " di " + carta.seme);
    });

    socket.on("cardCovered", ({ playerId, row, col }) => {
      setGame((prev) => {
        if (!prev || prev.id !== gameIdRef.current) return prev;
        const players = prev.players.map((p) => {
          if (p.id !== playerId) return p;
          const newCoperte = p.coperte.map((r) => [...r]);
          newCoperte[row][col] = true;
          return { ...p, coperte: newCoperte };
        });
        const updated = { ...prev, players };
        const cp = players.find((p) => p.id === playerIdRef.current);
        if (cp) setCurrentPlayer(cp);
        const player = players.find((p) => p.id === playerId);
        if (player && playerId !== playerIdRef.current) {
          addToast(`${player?.name || "Giocatore"} ha coperto una carta`);
        }
        return updated;
      });
    });

    socket.on("collezioneVinta", ({ tipo, vincitore, vincitori, ammontare, divided, players: playersPayload }) => {
      setGame((prev) => {
        if (!prev || prev.id !== gameIdRef.current) return prev;

        const collezioni = { ...prev.collezioni };
        collezioni[tipo] = {
          vinto: true,
          vincitore: Array.isArray(vincitori)
            ? vincitori.map((v) => v.id)
            : [vincitore.id],
        };

        // Aggiorna i giocatori con i dati completi dal payload
        const players = prev.players.map((p) => {
          const updatedPlayer = playersPayload?.find((pp) => pp.id === p.id);
          if (updatedPlayer) {
            return { ...p, ...updatedPlayer };
          }
          return p;
        });

        const updated = { ...prev, collezioni, players };
        const cp = players.find((p) => p.id === playerIdRef.current);
        if (cp) setCurrentPlayer(cp);

        if (divided && vincitori) {
          addToast(
            `🎉 ${vincitori.map((v) => v.name).join(", ")} hanno vinto ${tipo
              .toUpperCase()
              .replace("_", " ")}! Premio diviso: ${ammontare} gettoni ciascuno`
          );
        } else if (vincitore) {
          addToast(
            `🎉 ${vincitore.name} ha vinto ${tipo
              .toUpperCase()
              .replace("_", " ")}! Premio: ${ammontare} gettoni`
          );
        }

        return updated;
      });
    });

    socket.on("gettoniAggiornati", ({ playerId, gettoni }) => {
      setGame((prev) => {
        if (!prev || prev.id !== gameIdRef.current) return prev;

        const players = prev.players.map((p) => {
          if (p.id === playerId) {
            return { ...p, gettoni };
          }
          return p;
        });

        const updated = { ...prev, players };
        
        // Aggiorna currentPlayer se è il giocatore corrente
        if (playerId === playerIdRef.current) {
          const cp = players.find((p) => p.id === playerId);
          if (cp) setCurrentPlayer(cp);
        }

        return updated;
      });
    });

    socket.on("jollyUsato", ({ playerId, row, col, newCard }) => {
      setGame((prev) => {
        if (!prev || prev.id !== gameIdRef.current) return prev;

        const players = prev.players.map((p) => {
          if (p.id === playerId) {
            const newCartella = p.cartella.map((r) => r.map((c) => ({ ...c })));
            if (newCard) newCartella[row][col] = { ...newCard };

            const newCoperte = p.coperte.map((r) => [...r]);
            newCoperte[row][col] = true;

            return {
              ...p,
              jollyUsato: true,
              jollyPos: { row, col },
              cartella: newCartella,
              coperte: newCoperte,
            };
          }
          return p;
        });

        const updated = { ...prev, players };
        
        // Aggiorna currentPlayer immediatamente
        const cp = players.find((p) => p.id === playerIdRef.current);
        if (cp) setCurrentPlayer(cp);

        const player = players.find((p) => p.id === playerId);
        if (player) {
          addToast(`✨ ${player.name} ha usato il Jolly!`);
        }

        return updated;
      });

      setJollyMode(null);
    });

    socket.on("gameFinished", ({ vincitore, vincitori }) => {
      setGame((prev) =>
        prev && prev.id === gameIdRef.current
          ? { ...prev, status: "finished" }
          : prev
      );

      if (vincitori && vincitori.length > 1) {
        addToast(
          `🏆 PARTITA TERMINATA! Vincitori: ${vincitori.map((v) => v.name).join(", ")}`
        );
      } else if (vincitore) {
        addToast(`🏆 PARTITA TERMINATA! Vincitore: ${vincitore.name}`);
      }
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, []);
}