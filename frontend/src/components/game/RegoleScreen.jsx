/**
 * RegoleScreen Component
 *
 * The first time a player uses the game, they must read the rules and declare that they
 * read and understood them. The declaration can be made only after the end of the rules has
 * been on screen. The game does not start until every new player of it has confirmed.
 */

import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { acceptRules, logout } from "../../store/slices/playerSlice";
import RegoleGioco from "./RegoleGioco";

function RegoleScreen() {
  const dispatch = useDispatch();
  const { id: playerId, name: playerName, error } = useSelector((state) => state.player);
  const fine = useRef(null);
  const inFlight = useRef(false);
  const [lette, setLette] = useState(() => typeof window.IntersectionObserver !== "function");
  const [dichiarato, setDichiarato] = useState(false);

  // The declaration opens when the end of the rules has been on screen
  useEffect(() => {
    if (typeof window.IntersectionObserver !== "function" || !fine.current) return undefined;
    const osservatore = new window.IntersectionObserver((voci) => {
      if (voci.some((v) => v.isIntersecting)) {
        setLette(true);
      }
    });
    osservatore.observe(fine.current);
    return () => osservatore.disconnect();
  }, []);

  // A double tap must not send two confirmations: the ref answers at once, the state would not
  const conferma = async () => {
    if (!dichiarato || inFlight.current) return;
    inFlight.current = true;
    try {
      await dispatch(acceptRules(playerId)).unwrap();
    } catch {
      // The reason is in the state of the player and is shown under the button
    } finally {
      inFlight.current = false;
    }
  };

  return (
    <div className="min-h-[100dvh] tavolo p-4">
      <div className="mx-auto max-w-2xl">
        <main className="superficie p-5 sm:p-8">
          <h1 className="titolo text-2xl text-testo sm:text-3xl">Prima di giocare: le regole</h1>
          <p className="mt-2 text-testo-2 [text-wrap:pretty]">
            Ciao {playerName}! Leggi con calma come funziona il gioco. La partita non inizia finché tutti i giocatori
            nuovi non hanno confermato di aver letto e capito le regole: così partiamo tutti sapendo come si gioca.
          </p>

          <div className="mt-5 border-t border-linea pt-5">
            <RegoleGioco game={null} />
          </div>

          <div ref={fine} data-testid="fine-regole" aria-hidden="true" className="h-px" />

          <div className="mt-4 border-t border-linea pt-5">
            <label
              className={`flex min-h-[44px] items-start gap-3 ${lette ? "cursor-pointer text-testo" : "text-testo-3"}`}
            >
              <input
                type="checkbox"
                checked={dichiarato}
                disabled={!lette}
                onChange={(e) => setDichiarato(e.target.checked)}
                className="mt-1 h-5 w-5 shrink-0"
              />
              <span className="font-bold">Ho letto e compreso le regole e le meccaniche del gioco</span>
            </label>
            {!lette && (
              <p className="mt-1 text-sm text-testo-2">Scorri fino in fondo alle regole per poter confermare.</p>
            )}

            {error && (
              <p role="alert" className="mt-3 text-sm font-bold text-coppe">{error}</p>
            )}

            <button
              type="button"
              onClick={conferma}
              disabled={!dichiarato}
              className="mt-4 min-h-[52px] w-full rounded-xl bg-oro px-6 py-3 font-bold text-inchiostro-900 shadow-md transition hover:bg-oro-dark disabled:cursor-not-allowed disabled:bg-notte-600 disabled:text-testo-3"
            >
              Confermo e continuo
            </button>

            <button
              type="button"
              onClick={() => dispatch(logout())}
              className="mt-2 min-h-[44px] w-full text-sm font-bold text-testo-2 underline decoration-2 underline-offset-4 hover:text-testo"
            >
              Non sei {playerName}? Esci dall&apos;account
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}

export default RegoleScreen;
