/**
 * HomePage
 *
 * Entry point - Login and registration screen.
 */

import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { clearError, login, registerAccount } from "../store/slices/playerSlice";
import { enterGameOrHall } from "../store/sessionThunks";
import { useToast } from "../hooks";

const MIN_USERNAME_LENGTH = 3;
const MIN_PASSWORD_LENGTH = 8;

const ERROR_MESSAGES = {
  "Invalid username or password": "Nome utente o password non corretti",
  "Username already taken": "Questo nome utente è già in uso",
  "Too many failed login attempts, please try again later.": "Troppi tentativi falliti, riprova tra poco",
  "Too many requests, please try again later.": "Troppe richieste, riprova tra poco",
};

const translateError = (message) => ERROR_MESSAGES[message] ?? message;

function HomePage() {
  const dispatch = useDispatch();
  const { isLoading, error } = useSelector((state) => state.player);
  const { error: toastError } = useToast();

  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleToggleMode = () => {
    setIsRegistering((value) => !value);
    dispatch(clearError());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (username.trim().length === 0 || password.length === 0) {
      toastError("Inserisci nome utente e password");
      return;
    }

    if (isRegistering && username.trim().length < MIN_USERNAME_LENGTH) {
      toastError(`Il nome utente deve avere almeno ${MIN_USERNAME_LENGTH} caratteri`);
      return;
    }

    if (isRegistering && password.length < MIN_PASSWORD_LENGTH) {
      toastError(`La password deve avere almeno ${MIN_PASSWORD_LENGTH} caratteri`);
      return;
    }

    try {
      const action = isRegistering ? registerAccount : login;
      const { player } = await dispatch(action({ username, password })).unwrap();
      await dispatch(enterGameOrHall(player));
    } catch (err) {
      toastError(translateError(err) || "Errore di accesso");
    }
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
            <label htmlFor="username" className="block text-sm font-medium text-green-900 mb-2">
              👤 Nome utente
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border-2 border-green-600 rounded-xl focus:border-green-800 focus:outline-none bg-white"
              placeholder="Inserisci il tuo nome utente"
              autoComplete="username"
              maxLength={30}
              autoFocus
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-green-900 mb-2">
              🔑 Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border-2 border-green-600 rounded-xl focus:border-green-800 focus:outline-none bg-white"
              placeholder={isRegistering ? `Almeno ${MIN_PASSWORD_LENGTH} caratteri` : "Inserisci la password"}
              autoComplete={isRegistering ? "new-password" : "current-password"}
              maxLength={128}
              disabled={isLoading}
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm">{translateError(error)}</p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-green-600 to-green-800 text-white py-3 rounded-xl font-bold hover:from-green-700 hover:to-green-900 transition shadow-lg disabled:opacity-50"
          >
            {isLoading && "⏳ Caricamento..."}
            {!isLoading && (isRegistering ? "✨ Registrati" : "✨ Accedi")}
          </button>
        </form>

        <button
          type="button"
          onClick={handleToggleMode}
          disabled={isLoading}
          className="w-full mt-4 text-sm font-medium text-green-800 underline hover:text-green-900"
        >
          {isRegistering ? "Hai già un account? Accedi" : "Non hai un account? Crea un account"}
        </button>

        <div className="mt-6 text-center text-xs text-green-700">
          <p>Benvenuto su COMBOCARD!</p>
          <p className="mt-1">Acquista crediti e partecipa alle partite</p>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
