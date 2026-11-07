/**
 * ChangePasswordScreen Component
 *
 * An admin reset the password and gave a temporary one: the player cannot do anything else until they
 * choose their own. The server refuses every other route to this session, so this is the only screen.
 */

import React, { useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button, Input } from "../common";
import { changePassword, logout } from "../../store/slices/playerSlice";
import { enterGameOrHall } from "../../store/sessionThunks";

const MIN_PASSWORD_LENGTH = 8;

function ChangePasswordScreen() {
  const dispatch = useDispatch();
  const playerName = useSelector((state) => state.player.name);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [problems, setProblems] = useState({});
  const [serverError, setServerError] = useState(null);
  const [sending, setSending] = useState(false);
  // A double tap must not send it twice: the ref answers at once, the state would not
  const inFlight = useRef(false);

  const submit = async (event) => {
    event.preventDefault();
    if (inFlight.current) {
      return;
    }

    const found = {};
    if (current === "") {
      found.current = "Scrivi la password provvisoria";
    }
    if (next.length < MIN_PASSWORD_LENGTH) {
      found.next = `Almeno ${MIN_PASSWORD_LENGTH} caratteri`;
    } else if (again !== next) {
      found.again = "Le due password non coincidono";
    }
    setProblems(found);
    if (Object.keys(found).length > 0) {
      return;
    }

    inFlight.current = true;
    setSending(true);
    setServerError(null);
    try {
      const session = await dispatch(changePassword({ currentPassword: current, newPassword: next })).unwrap();
      await dispatch(enterGameOrHall(session.player));
    } catch (error) {
      setServerError(typeof error === "string" ? error : error.message);
    } finally {
      inFlight.current = false;
      setSending(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center tavolo p-4 max-[359px]:p-2">
      <main className="superficie w-full max-w-md p-5 max-[359px]:p-3 sm:p-8">
        <h1 className="titolo text-2xl text-testo sm:text-3xl">Scegli una nuova password</h1>
        <p className="mt-2 [overflow-wrap:anywhere] text-testo-2 [text-wrap:pretty]">
          {`Ciao ${playerName}! L'amministrazione ha reimpostato la tua password. Scrivi quella provvisoria che ti hanno dato e scegline una tua: sarà l'unica che userai da ora in poi.`}
        </p>

        <form onSubmit={submit} noValidate className="mt-5 space-y-4">
          <Input
            label="Password provvisoria"
            type="password"
            autoComplete="current-password"
            maxLength={128}
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            error={problems.current}
          />
          <Input
            label="Nuova password"
            type="password"
            autoComplete="new-password"
            maxLength={128}
            value={next}
            onChange={(e) => setNext(e.target.value)}
            hint={`Da ${MIN_PASSWORD_LENGTH} a 128 caratteri`}
            error={problems.next}
          />
          <Input
            label="Ripeti la nuova password"
            type="password"
            autoComplete="new-password"
            maxLength={128}
            value={again}
            onChange={(e) => setAgain(e.target.value)}
            error={problems.again}
          />

          {serverError && (
            <p role="alert" className="text-sm font-bold text-coppe [overflow-wrap:anywhere]">
              {serverError}
            </p>
          )}

          <Button type="submit" fullWidth disabled={sending}>
            {sending ? "Salvataggio in corso…" : "Salva la nuova password"}
          </Button>
          <button
            type="button"
            onClick={() => dispatch(logout())}
            className="min-h-[44px] w-full text-sm font-bold text-testo-2 underline decoration-2 underline-offset-4 hover:text-testo"
          >
            Esci
          </button>
        </form>
      </main>
    </div>
  );
}

export default ChangePasswordScreen;
