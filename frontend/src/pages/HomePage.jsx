/**
 * HomePage
 *
 * Entry point - Login and registration screen.
 */

import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { clearError, login, registerAccount } from "../store/slices/playerSlice";
import { enterGameOrHall } from "../store/sessionThunks";
import Seme from "../components/game/Seme";
import InfoDialog from "../components/common/InfoDialog";
import { INCHIOSTRO_SEME } from "../utils";

const MIN_USERNAME_LENGTH = 3;
const MIN_PASSWORD_LENGTH = 8;

function HomePage() {
  const dispatch = useDispatch();
  const { isLoading, error } = useSelector((state) => state.player);

  const [isRegistering, setIsRegistering] = useState(false);
  const [formError, setFormError] = useState(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showInfo, setShowInfo] = useState(false);

  // The message is shown in the form, once: server errors arrive already in Italian
  const message = formError ?? error;

  const clearMessage = () => {
    setFormError(null);
    dispatch(clearError());
  };

  const handleToggleMode = () => {
    setIsRegistering((value) => !value);
    clearMessage();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (username.trim().length === 0 || password.length === 0) {
      setFormError("Inserisci nome utente e password");
      return;
    }

    if (isRegistering && username.trim().length < MIN_USERNAME_LENGTH) {
      setFormError(`Il nome utente deve avere almeno ${MIN_USERNAME_LENGTH} caratteri`);
      return;
    }

    if (isRegistering && password.length < MIN_PASSWORD_LENGTH) {
      setFormError(`La password deve avere almeno ${MIN_PASSWORD_LENGTH} caratteri`);
      return;
    }

    setFormError(null);

    try {
      const action = isRegistering ? registerAccount : login;
      const { player, mustChangePassword } = await dispatch(action({ username, password })).unwrap();
      // With a temporary password the server refuses the game: the app asks for a new password first
      if (!mustChangePassword) {
        await dispatch(enterGameOrHall(player));
      }
    } catch {
      // The reason is in the state of the player and is shown in the form
    }
  };

  const campo =
    "w-full rounded-xl border-2 border-linea-forte bg-notte-700 px-4 py-3 text-testo placeholder:text-testo-3 focus:outline-none focus:ring-2 focus:ring-oro";

  return (
    <div className="flex min-h-[100dvh] items-center justify-center tavolo p-4">
      <div className="superficie w-full max-w-md p-5 sm:p-8">
        <div className="mb-6 text-center">
          <div className="mb-4 grid grid-cols-4 gap-2" aria-hidden="true">
            {["Denari", "Coppe", "Spade", "Bastoni"].map((seme) => (
              <span
                key={seme}
                className={`flex h-14 items-center justify-center rounded-md border-2 border-linea-forte ${INCHIOSTRO_SEME[seme].soft}`}
              >
                <Seme seme={seme} className="h-10 w-10" />
              </span>
            ))}
          </div>
          <h1 className="titolo break-words text-4xl text-testo sm:text-5xl">COMBOCARD</h1>
          <p className="mt-2 font-medium text-testo-2">Colleziona, combina, conquista!</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="mb-2 block text-sm font-bold text-testo">
              Nome utente
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                clearMessage();
              }}
              aria-invalid={message ? true : undefined}
              aria-describedby={message ? "auth-error" : undefined}
              className={campo}
              placeholder="Inserisci il tuo nome utente"
              autoComplete="username"
              maxLength={30}
              autoFocus
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-bold text-testo">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                clearMessage();
              }}
              aria-invalid={message ? true : undefined}
              aria-describedby={message ? "auth-error" : "password-hint"}
              className={campo}
              placeholder={isRegistering ? `Almeno ${MIN_PASSWORD_LENGTH} caratteri` : "Inserisci la password"}
              autoComplete={isRegistering ? "new-password" : "current-password"}
              maxLength={128}
              disabled={isLoading}
            />
            {isRegistering && (
              <p id="password-hint" className="mt-1 text-xs text-testo-2">
                Almeno {MIN_PASSWORD_LENGTH} caratteri.
              </p>
            )}
          </div>

          {message && (
            <p id="auth-error" role="alert" className="text-sm font-bold text-coppe">{message}</p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="min-h-[48px] w-full rounded-xl bg-oro py-3 font-bold text-inchiostro-900 shadow-md transition hover:bg-oro-dark disabled:opacity-50"
          >
            {isLoading && "Caricamento..."}
            {!isLoading && (isRegistering ? "Registrati" : "Accedi")}
          </button>
        </form>

        <button
          type="button"
          onClick={handleToggleMode}
          disabled={isLoading}
          className="mt-4 min-h-[44px] w-full text-sm font-bold text-testo underline decoration-2 underline-offset-4 hover:text-coppe"
        >
          {isRegistering ? "Hai già un account? Accedi" : "Non hai un account? Crea un account"}
        </button>

        <p className="mt-4 text-center text-xs text-testo-2 [text-wrap:balance]">
          Si gioca con crediti di gioco, senza pagamenti e senza valore reale.
        </p>

        <div className="mt-1 text-center">
          <button
            type="button"
            onClick={() => setShowInfo(true)}
            className="min-h-[44px] rounded-lg px-3 text-sm font-bold text-testo-2 underline decoration-2 underline-offset-4 hover:text-testo"
          >
            Info e contatti
          </button>
        </div>
      </div>

      {showInfo && <InfoDialog onClose={() => setShowInfo(false)} />}
    </div>
  );
}

export default HomePage;
