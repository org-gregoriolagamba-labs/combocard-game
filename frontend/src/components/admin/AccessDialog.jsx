/**
 * AccessDialog Component
 *
 * The admin suspends a user, reinstates a suspended one, or closes the sessions of a user, with the
 * reason that goes in the audit log. A suspended user can only be reinstated: their sessions are
 * already closed.
 */

import React, { useRef, useState } from "react";
import PropTypes from "prop-types";
import { Modal, Button, Input } from "../common";
import { adminService } from "../../services";

function AccessDialog({ user, onClose, onDone }) {
  const [reason, setReason] = useState("");
  const [problem, setProblem] = useState(null);
  const [serverError, setServerError] = useState(null);
  const [sending, setSending] = useState(false);
  // A double tap must not send it twice: the ref answers at once, the state would not
  const inFlight = useRef(false);

  const send = async (kind) => {
    if (inFlight.current) {
      return;
    }
    if (reason.trim() === "") {
      setProblem("Scrivi il motivo");
      return;
    }

    const request = { suspend: adminService.suspendUser, unsuspend: adminService.unsuspendUser, revoke: adminService.revokeSessions }[kind];
    inFlight.current = true;
    setSending(true);
    setServerError(null);
    try {
      onDone(await request(user.playerId, { reason: reason.trim() }), kind);
    } catch (error) {
      setServerError(error.message);
    } finally {
      inFlight.current = false;
      setSending(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={`Accesso di ${user.username}`}>
      <form onSubmit={(event) => event.preventDefault()} noValidate className="space-y-4">
        {user.suspended ? (
          <p className="text-testo-2">
            {"L'account è sospeso: non può entrare né usare il gioco. Riabilitandolo potrà accedere di nuovo con la sua password."}
          </p>
        ) : (
          <p className="text-testo-2">
            {`Sospendendo l'account, ${user.username} perde subito l'accesso e le sue sessioni si chiudono. Una partita in corso resta com'è: puoi annullarla dalla scheda Partite. Chiudendo solo le sessioni, dovrà accedere di nuovo con la sua password.`}
          </p>
        )}

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

        {serverError && (
          <p role="alert" className="text-sm font-bold text-coppe [overflow-wrap:anywhere]">
            {serverError}
          </p>
        )}

        <div className="flex flex-col gap-2">
          {user.suspended ? (
            <Button type="button" disabled={sending} onClick={() => send("unsuspend")}>
              {sending ? "Invio in corso…" : "Riabilita l'accesso"}
            </Button>
          ) : (
            <>
              <Button type="button" disabled={sending} onClick={() => send("suspend")}>
                {sending ? "Invio in corso…" : "Sospendi l'accesso"}
              </Button>
              <Button type="button" variant="secondary" disabled={sending} onClick={() => send("revoke")}>
                Chiudi le sessioni
              </Button>
            </>
          )}
          <Button type="button" variant="outline" onClick={onClose}>
            Indietro
          </Button>
        </div>
      </form>
    </Modal>
  );
}

AccessDialog.propTypes = {
  user: PropTypes.shape({
    playerId: PropTypes.string.isRequired,
    username: PropTypes.string.isRequired,
    suspended: PropTypes.bool,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onDone: PropTypes.func.isRequired,
};

export default AccessDialog;
