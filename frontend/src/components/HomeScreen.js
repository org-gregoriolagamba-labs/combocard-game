import { useState } from "react";

export default function HomeScreen({ playerName, setPlayerName, registraGiocatore }) {
  const [localName, setLocalName] = useState(playerName);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!localName || localName.trim().length === 0) {
      alert("Inserisci il tuo nome");
      return;
    }
    await registraGiocatore(localName);
  };

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
          <p className="text-green-700 font-medium">
            Colleziona, combina, conquista!
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-green-900 mb-2">
              👤 Il Tuo Nome
            </label>
            <input
              type="text"
              value={localName}
              onChange={(e) => setLocalName(e.target.value)}
              className="w-full px-4 py-3 border-2 border-green-600 rounded-xl focus:border-green-800 focus:outline-none bg-white"
              placeholder="Inserisci il tuo nome"
              autoFocus
            />
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-green-600 to-green-800 text-white py-3 rounded-xl font-bold hover:from-green-700 hover:to-green-900 transition shadow-lg"
          >
            ✨ Entra nella Hall
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-green-700">
          <p>Benvenuto su COMBOCARD!</p>
          <p className="mt-1">Acquista crediti e partecipa alle partite</p>
        </div>
      </div>
    </div>
  );
}