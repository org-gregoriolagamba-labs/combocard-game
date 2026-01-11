import { useState, useEffect } from "react";
import { Users, Trophy, Coins, PlayCircle } from 'lucide-react';
import { io } from "socket.io-client";
import './index.css';

const API_URL = 'http://localhost:3001/api';

const SEMI_EMOJI = {
  'Spade': '⚔️',
  'Coppe': '🏆',
  'Denari': '💰',
  'Bastoni': '🪵'
};

const SEMI_COLORS = {
  'Spade': 'from-gray-700 to-gray-900',
  'Coppe': 'from-red-600 to-red-800',
  'Denari': 'from-yellow-500 to-yellow-700',
  'Bastoni': 'from-amber-700 to-amber-900'
};

// App component
function App() {
  const [screen, setScreen] = useState('home');
  const [gameId, setGameId] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [game, setGame] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [puntataIniziale, setPuntataIniziale] = useState(100);
  const [ultimaCartaEstratta, setUltimaCartaEstratta] = useState(null);

  const creaPartita = async () => {
    try {
      const response = await fetch(`${API_URL}/game/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ puntataIniziale })
      });
      const data = await response.json();
      setGameId(data.gameId);
      setGame(data.game);
      setScreen('lobby');
    } catch (error) {
      console.error('Errore creazione partita:', error);
      alert('Errore nella creazione della partita');
    }
  };

  const uniscitiPartita = async () => {
    if (!playerName) {
      alert('Inserisci il tuo nome');
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/game/${gameId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName })
      });
      
      if (!response.ok) {
        const error = await response.json();
        alert(error.error);
        return;
      }
      
      const data = await response.json();
      setPlayerId(data.playerId);
      setCurrentPlayer(data.player);
      
      const gameResponse = await fetch(`${API_URL}/game/${gameId}`);
      const gameData = await gameResponse.json();
      setGame(gameData);
    } catch (error) {
      console.error('Errore unione partita:', error);
      alert('Errore nell\'unirsi alla partita');
    }
  };

  const iniziaPartita = async () => {
    try {
      const response = await fetch(`${API_URL}/game/${gameId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        const error = await response.json();
        alert(error.error);
        return;
      }
      
      const data = await response.json();
      setGame(data.game);
      setScreen('game');
    } catch (error) {
      console.error('Errore avvio partita:', error);
    }
  };

  const estraiCarta = async () => {
    try {
      const response = await fetch(`${API_URL}/game/${gameId}/draw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        const error = await response.json();
        alert(error.error);
        return;
      }
      
      const data = await response.json();
      setUltimaCartaEstratta(data.carta);
      
      if (currentPlayer) {
        autoCopriCarta(data.carta);
      }
    } catch (error) {
      console.error('Errore estrazione carta:', error);
    }
  };

  const autoCopriCarta = (carta) => {
    const newCoperte = [...currentPlayer.coperte.map(row => [...row])];
    let trovata = false;
    
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const cartaCartella = currentPlayer.cartella[r][c];
        if (cartaCartella.valore === carta.valore && 
            cartaCartella.seme === carta.seme && 
            !newCoperte[r][c]) {
          newCoperte[r][c] = true;
          trovata = true;
          break;
        }
      }
      if (trovata) break;
    }
    
    if (trovata) {
      setCurrentPlayer({ ...currentPlayer, coperte: newCoperte });
    }
  };

  const rivendicaCollezione = async (tipo) => {
    try {
      const response = await fetch(`${API_URL}/game/${gameId}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, tipo })
      });
      
      if (!response.ok) {
        const error = await response.json();
        alert(error.error);
        return;
      }
      
      const data = await response.json();
      alert(`🎉 Hai vinto ${tipo.toUpperCase().replace('_', ' ')}!\nPremio: ${data.premio} gettoni!`);
      
      const gameResponse = await fetch(`${API_URL}/game/${gameId}`);
      const gameData = await gameResponse.json();
      setGame(gameData);
      
      const updatedPlayer = gameData.players.find(p => p.id === playerId);
      setCurrentPlayer(updatedPlayer);
      
      if (tipo === 'combocard_reale') {
        alert('🏆 HAI VINTO CON COMBOCARD REALE! Partita terminata!');
      }
    } catch (error) {
      console.error('Errore rivendicazione collezione:', error);
    }
  };

  const usaJolly = async (row, col) => {
    if (currentPlayer.jollyUsato) {
      alert('Jolly già usato!');
      return;
    }
    
    if (!window.confirm(`Usare Jolly sulla carta in posizione [${row+1},${col+1}]?`)) {
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/game/${gameId}/jolly`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, row, col })
      });
      
      if (!response.ok) {
        const error = await response.json();
        alert(error.error);
        return;
      }
      
      alert('✨ Jolly attivato! Questa carta è ora universale.');
      
      setCurrentPlayer({
        ...currentPlayer,
        jollyUsato: true,
        jollyPos: { row, col }
      });
    } catch (error) {
      console.error('Errore uso jolly:', error);
    }
  };

  const calcolaProgresso = (tipo) => {
    if (!currentPlayer) return { count: 0, total: 0 };
    
    const totali = {
      tris: 3,
      sequenza: 4,
      scopa: 5,
      napola: 5,
      combocard_reale: 4
    };
    
    // Calcolo semplificato - conta le carte coperte
    let coperte = 0;
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (currentPlayer.coperte[r][c]) coperte++;
      }
    }
    
    return { 
      count: Math.min(coperte, totali[tipo]), 
      total: totali[tipo] 
    };
  };

  // Home Screen
  if (screen === 'home') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-700 flex items-center justify-center p-4">
        <div className="bg-amber-50 rounded-3xl shadow-2xl p-8 max-w-md w-full border-4 border-amber-600">
          <div className="text-center mb-8">
            <div className="flex justify-center gap-2 mb-4">
              <span className="text-5xl">⚔️</span>
              <span className="text-5xl">🏆</span>
              <span className="text-5xl">💰</span>
              <span className="text-5xl">🪵</span>
            </div>
            <h1 className="text-5xl font-bold text-green-900 mb-2">COMBOCARD</h1>
            <p className="text-green-700 font-medium">Colleziona, combina, conquista!</p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-green-900 mb-2">
                💰 Puntata Iniziale
              </label>
              <input
                type="number"
                value={puntataIniziale}
                onChange={(e) => setPuntataIniziale(parseInt(e.target.value))}
                className="w-full px-4 py-3 border-2 border-green-600 rounded-xl focus:border-green-800 focus:outline-none bg-white"
                min="10"
                step="10"
              />
            </div>
            
            <button
              onClick={creaPartita}
              className="w-full bg-gradient-to-r from-green-600 to-green-800 text-white py-3 rounded-xl font-bold hover:from-green-700 hover:to-green-900 transition shadow-lg"
            >
              ✨ Crea Nuova Partita
            </button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-green-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-amber-50 text-green-700">oppure</span>
              </div>
            </div>
            
            <input
              type="text"
              placeholder="Inserisci codice partita"
              value={gameId}
              onChange={(e) => setGameId(e.target.value)}
              className="w-full px-4 py-3 border-2 border-green-600 rounded-xl focus:border-green-800 focus:outline-none"
            />
            
            <button
              onClick={() => setScreen('lobby')}
              disabled={!gameId}
              className="w-full bg-gradient-to-r from-amber-600 to-amber-800 text-white py-3 rounded-xl font-bold hover:from-amber-700 hover:to-amber-900 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🎴 Unisciti a Partita
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Lobby Screen
  if (screen === 'lobby') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-900 via-amber-800 to-orange-800 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-amber-50 rounded-3xl shadow-2xl p-6 mb-6 border-4 border-amber-700">
            <h2 className="text-3xl font-bold text-green-900 mb-4">🎴 Lobby COMBOCARD</h2>
            <div className="bg-green-100 p-4 rounded-xl mb-4 border-2 border-green-600">
              <p className="font-bold text-green-900">Codice Partita: <span className="text-2xl font-mono text-green-700">{gameId}</span></p>
              <p className="text-sm text-green-700 mt-2">Condividi questo codice con altri giocatori</p>
            </div>
            
            {!playerId ? (
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Il tuo nome"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-green-600 rounded-xl focus:border-green-800 focus:outline-none"
                />
                
                <button
                  onClick={uniscitiPartita}
                  className="w-full bg-gradient-to-r from-green-600 to-green-800 text-white py-3 rounded-xl font-bold hover:from-green-700 hover:to-green-900 transition shadow-lg"
                >
                  ✅ Conferma e Unisciti
                </button>
              </div>
            ) : (
              <div className="bg-green-100 p-4 rounded-xl border-2 border-green-600">
                <p className="text-green-900 font-bold text-lg">✓ Ti sei unito come: {playerName}</p>
              </div>
            )}
          </div>
          
          <div className="bg-amber-50 rounded-3xl shadow-2xl p-6 border-4 border-amber-700">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-green-900">
              <Users size={24} />
              Giocatori ({game?.players.length || 0}/10)
            </h3>
            
            <div className="space-y-2 mb-6">
              {game?.players.map((player, idx) => (
                <div key={idx} className="bg-green-50 p-3 rounded-xl flex justify-between items-center border-2 border-green-200">
                  <span className="font-bold text-green-900">{player.name}</span>
                  <span className="text-sm text-green-700">Pronto!</span>
                </div>
              ))}
            </div>
            
            {playerId && game?.players.length >= 2 && (
              <button
                onClick={iniziaPartita}
                className="w-full bg-gradient-to-r from-green-600 to-green-800 text-white py-4 rounded-xl font-bold hover:from-green-700 hover:to-green-900 transition flex items-center justify-center gap-2 shadow-lg"
              >
                <PlayCircle size={28} />
                <span className="text-lg">Inizia Partita</span>
              </button>
            )}
            
            {game?.players.length < 2 && (
              <p className="text-center text-green-700 text-sm">
                Servono almeno 2 giocatori per iniziare
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Game Screen
  if (screen === 'game' && currentPlayer) {
    const montepremi = game.players.length * game.puntataIniziale;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-700 p-4">
        <div className="max-w-7xl mx-auto">
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
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-amber-50 rounded-2xl shadow-2xl p-6 border-4 border-amber-600">
              <h3 className="text-xl font-bold mb-4 text-green-900">🎴 La Tua Cartella</h3>
              
              <div className="grid grid-cols-5 gap-2">
                {currentPlayer.cartella.map((row, r) =>
                  row.map((carta, c) => {
                    const coperta = currentPlayer.coperte[r][c];
                    const isJolly = currentPlayer.jollyPos && 
                                   currentPlayer.jollyPos.row === r && 
                                   currentPlayer.jollyPos.col === c;
                    const gradientClass = SEMI_COLORS[carta.seme];
                    
                    return (
                      <div
                        key={`${r}-${c}`}
                        onClick={() => !coperta && !currentPlayer.jollyUsato && usaJolly(r, c)}
                        className={`aspect-square rounded-xl flex flex-col items-center justify-center text-center p-2 transition-all duration-300 cursor-pointer ${
                          coperta
                            ? 'bg-gradient-to-br from-red-700 to-red-900 text-white shadow-lg'
                            : isJolly
                            ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 border-4 border-yellow-300 shadow-xl'
                            : `bg-gradient-to-br ${gradientClass} border-2 border-amber-200 shadow-md hover:scale-105`
                        }`}
                      >
                        {!coperta && !isJolly && (
                          <>
                            <div className="text-3xl mb-1">{carta.emoji}</div>
                            <div className="text-xs font-bold text-white">{carta.valore}</div>
                          </>
                        )}
                        {isJolly && (
                          <>
                            <div className="text-3xl">✨</div>
                            <div className="text-xs font-bold text-white">JOLLY</div>
                          </>
                        )}
                        {coperta && !isJolly && (
                          <div className="text-4xl">✓</div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
              
              {!currentPlayer.jollyUsato && (
                <p className="text-xs text-green-700 mt-3 text-center">
                  💡 Clicca su una carta non coperta per usare il Jolly
                </p>
              )}
            </div>

            <div className="space-y-4">
              <div className="bg-amber-50 rounded-2xl shadow-2xl p-6 border-4 border-amber-600">
                <h3 className="text-lg font-bold mb-4 text-green-900">🎴 Ultima Carta</h3>
                
                {ultimaCartaEstratta ? (
                  <div className={`bg-gradient-to-br ${SEMI_COLORS[ultimaCartaEstratta.seme]} border-4 border-white rounded-2xl p-8 text-center shadow-2xl`}>
                    <div className="text-7xl mb-3">{ultimaCartaEstratta.emoji}</div>
                    <div className="text-3xl font-bold text-white mb-1">{ultimaCartaEstratta.valore}</div>
                    <div className="text-sm text-white opacity-90">di {ultimaCartaEstratta.seme}</div>
                  </div>
                ) : (
                  <div className="bg-green-100 rounded-2xl p-8 text-center text-green-700 border-2 border-green-300">
                    Nessuna carta estratta
                  </div>
                )}
                
                <button
                  onClick={estraiCarta}
                  disabled={game?.status !== 'playing'}
                  className="w-full mt-4 bg-gradient-to-r from-green-600 to-green-800 text-white py-3 rounded-xl font-bold hover:from-green-700 hover:to-green-900 transition shadow-lg disabled:opacity-50"
                >
                  🎲 Estrai Carta
                </button>
                
                <p className="text-xs text-green-700 mt-2 text-center">
                  Carte rimaste: {game?.mazzo.length || 0}/40
                </p>
              </div>

              <div className="bg-amber-50 rounded-2xl shadow-2xl p-6 border-4 border-amber-600">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-green-900">
                  <Trophy size={24} />
                  Collezioni
                </h3>
                
                <div className="space-y-2">
                  {[
                    { tipo: 'tris', label: 'TRIS', icon: '🎯' },
                    { tipo: 'sequenza', label: 'SEQUENZA', icon: '📊' },
                    { tipo: 'scopa', label: 'SCOPA', icon: '🎴' },
                    { tipo: 'napola', label: 'NAPOLA', icon: '💎' },
                    { tipo: 'combocard_reale', label: 'COMBOCARD REALE', icon: '👑' }
                  ].map(({ tipo, label, icon }) => {
                    const collezione = game?.collezioni[tipo];
                    const ammontare = game?.collezioniDistribuzione[tipo];
                    const isReale = tipo === 'combocard_reale';
                    const progresso = calcolaProgresso(tipo);
                    
                    return (
                      <div key={tipo} className="flex items-center justify-between gap-2">
                        <button
                          onClick={() => rivendicaCollezione(tipo)}
                          disabled={collezione?.vinto || game?.status !== 'playing'}
                          className={`flex-1 py-2 px-3 rounded-xl font-bold transition text-sm ${
                            collezione?.vinto
                              ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                              : isReale
                              ? 'bg-gradient-to-r from-yellow-500 to-orange-600 text-white hover:from-yellow-600 hover:to-orange-700 shadow-lg'
                              : 'bg-gradient-to-r from-green-600 to-green-800 text-white hover:from-green-700 hover:to-green-900'
                          }`}
                        >
                          {icon} {label}
                        </button>
                        <div className="text-right">
                          <p className="text-xs text-green-700">Premio</p>
                          <p className="font-bold text-green-600 text-sm">{ammontare}{isReale && ' 🏆'}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-green-100 rounded-2xl shadow-lg p-4 text-xs border-2 border-green-600">
                <h4 className="font-bold mb-2 text-green-900">📖 Collezioni:</h4>
                <ul className="space-y-1 text-green-800">
                  <li>• TRIS: 3 stesso valore</li>
                  <li>• SEQUENZA: 4 in fila</li>
                  <li>• SCOPA: 5 stesso seme</li>
                  <li>• NAPOLA: Tris + Coppia</li>
                  <li>• COMBOCARD REALE: 4 in fila stesso seme = VINCI! 👑</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default App;