/**
 * DeleteUserDialog Component
 *
 * The admin deletes an account, for good. It says what happens, asks for the reason that goes in the
 * audit log and for the username written by hand: the button stays off until it matches.
 */

import React, { useRef, useState } from "react";
import PropTypes from "prop-types";
import { Modal, Button, Input } from "../common";
import { adminService } from "../../services";

function DeleteUserDialog({ user, onClose, onDone }) {
  const [typedName, setTypedName] = useState("");
  const [reason, setReason] = useState("");
  const [problem, setProblem] = useState(null);
  const [serverError, setServerError] = useState(null);
  const [sending, setSending] = useState(false);
  // A double tap must not send it twice: the ref answers at once, the state would not
  const inFlight = useRef(false);

  const confirmed = typedName === user.username;

  const submit = async (event) => {
    event?.preventDefault();
    if (inFlight.current || !confirmed) {
      return;
    }
    if (reason.trim() === "") {
      setProblem("Scrivi il motivo");
      return;
    }

    inFlight.current = true;
    setSending(true);
    setServerError(null);
    try {
      onDone(await adminService.deleteUser(user.playerId, { reason: reason.trim() }));
    } catch (error) {
      setServerError(error.message);
    } finally {
      inFlight.current = false;
      setSending(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={`Elimina l'account di ${user.username}`}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <p className="font-bold text-coppe">Non si può annullare.</p>
        <p className="text-testo-2 [overflow-wrap:anywhere]">
          {`${user.username} non potrà più accedere e il suo nome utente sarà libero. I crediti che ha ancora si perdono, senza rimborso. Resta lo storico delle partite e dei movimenti, ma senza il suo nome: al suo posto compare «Utente eliminato». Un utente che sta giocando una partita, o l'ultimo admin, non si può eliminare.`}
        </p>

        <Input
          label="Motivo"
          type="text"
          maxLength={200}
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            setProblem(null);
          }}
          hint="Resta nel registro delle azioni."
          error={problem}
        />
        <Input
          label="Scrivi il nome utente per confermare"
          type="text"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          maxLength={30}
          value={typedName}
          onChange={(e) => setTypedName(e.target.value)}
          hint={`Il nome è: ${user.username}`}
        />

        {serverError && (
          <p role="alert" className="text-sm font-bold text-coppe [overflow-wrap:anywhere]">
            {serverError}
          </p>
        )}

        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <Button type="submit" variant="danger" disabled={!confirmed || sending} className="flex-1">
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

DeleteUserDialog.propTypes = {
  user: PropTypes.shape({
    playerId: PropTypes.string.isRequired,
    username: PropTypes.string.isRequired,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onDone: PropTypes.func.isRequired,
};

export default DeleteUserDialog;
