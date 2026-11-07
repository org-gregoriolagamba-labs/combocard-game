/**
 * DeleteAccountDialog Component
 *
 * The player deletes their own account, for good. It says what happens, asks for the password again and
 * for the username written by hand: the button stays off until it matches.
 */

import React, { useRef, useState } from "react";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import { Modal, Button, Input } from "../common";
import { deleteOwnAccount } from "../../store/sessionThunks";

function DeleteAccountDialog({ onClose }) {
  const dispatch = useDispatch();
  const playerName = useSelector((state) => state.player.name);
  const [password, setPassword] = useState("");
  const [typedName, setTypedName] = useState("");
  const [problem, setProblem] = useState(null);
  const [serverError, setServerError] = useState(null);
  const [sending, setSending] = useState(false);
  // A double tap must not send it twice: the ref answers at once, the state would not
  const inFlight = useRef(false);

  const confirmed = typedName === playerName;

  const submit = async (event) => {
    event?.preventDefault();
    if (inFlight.current || !confirmed) {
      return;
    }
    if (password === "") {
      setProblem("Scrivi la tua password");
      return;
    }

    inFlight.current = true;
    setSending(true);
    setServerError(null);
    try {
      // When it works the player is taken to the start and this dialog goes away with the screen
      await dispatch(deleteOwnAccount(password));
    } catch (error) {
      setServerError(error.message);
      inFlight.current = false;
      setSending(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Elimina il mio account">
      <form onSubmit={submit} noValidate className="space-y-4">
        <p className="font-bold text-coppe">Non si può annullare.</p>
        <p className="text-testo-2 [overflow-wrap:anywhere]">
          Non potrai più accedere e il tuo nome utente tornerà libero. I crediti che hai ancora si perdono, senza rimborso.
          Resta lo storico delle partite e dei movimenti, ma senza il tuo nome: al suo posto compare «Utente eliminato».
          Non puoi eliminare l&apos;account mentre sei in una partita, né se sei l&apos;ultimo admin.
        </p>

        <Input
          label="La tua password"
          type="password"
          autoComplete="current-password"
          maxLength={128}
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setProblem(null);
          }}
          error={problem}
        />
        <Input
          label="Scrivi il tuo nome utente per confermare"
          type="text"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          maxLength={30}
          value={typedName}
          onChange={(e) => setTypedName(e.target.value)}
          hint={`Il tuo nome è: ${playerName}`}
        />

        {serverError && (
          <p role="alert" className="text-sm font-bold text-coppe [overflow-wrap:anywhere]">
            {serverError}
          </p>
        )}

        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <Button type="submit" variant="danger" disabled={!confirmed || sending} className="flex-1 [overflow-wrap:anywhere]">
            {sending ? "Eliminazione in corso…" : "Elimina definitivamente"}
          </Button>
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Indietro
          </Button>
        </div>
      </form>
    </Modal>
  );
}

DeleteAccountDialog.propTypes = {
  onClose: PropTypes.func.isRequired,
};

export default DeleteAccountDialog;
