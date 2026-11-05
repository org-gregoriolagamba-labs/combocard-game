/**
 * CancelGameDialog Component
 *
 * The admin cancels a game that is stuck, with the reason that goes in the audit log. The dialog
 * says what happens to the players: a game in progress gives the entry fee back, a game that is
 * waiting has charged nobody.
 */

import React, { useRef, useState } from "react";
import PropTypes from "prop-types";
import { Modal, Button, Input } from "../common";
import { adminService } from "../../services";

function CancelGameDialog({ game, onClose, onDone }) {
  const [reason, setReason] = useState("");
  const [problem, setProblem] = useState(null);
  const [serverError, setServerError] = useState(null);
  const [sending, setSending] = useState(false);
  // A double tap must not send it twice: the ref answers at once, the state would not
  const inFlight = useRef(false);

  const playing = game.status === "playing";

  const submit = async (event) => {
    event?.preventDefault();
    if (inFlight.current) {
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
      onDone(await adminService.cancelGame(game.id, { reason: reason.trim() }));
    } catch (error) {
      setServerError(error.message);
    } finally {
      inFlight.current = false;
      setSending(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Annulla la partita">
      <form onSubmit={submit} noValidate className="space-y-4">
        <p className="text-testo [overflow-wrap:anywhere]">
          {`Giocatori: ${game.players.map((p) => p.name).join(", ") || "nessuno"}`}
        </p>
        {playing ? (
          <p className="text-testo-2">
            {`La partita è in corso. Ogni giocatore ancora presente riavrà la quota di ${game.requiredCredits} crediti. I premi già vinti ma non ancora accreditati vanno persi: la partita conta come mai giocata. Chi l'aveva lasciata non viene rimborsato.`}
          </p>
        ) : (
          <p className="text-testo-2">
            Nessuno ha ancora pagato la quota: la partita sparisce dalla lobby e i giocatori tornano liberi.
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

        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <Button type="submit" disabled={sending} className="flex-1">
            {sending ? "Invio in corso…" : "Conferma annullamento"}
          </Button>
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Indietro
          </Button>
        </div>
      </form>
    </Modal>
  );
}

CancelGameDialog.propTypes = {
  game: PropTypes.shape({
    id: PropTypes.string.isRequired,
    status: PropTypes.string.isRequired,
    requiredCredits: PropTypes.number.isRequired,
    players: PropTypes.arrayOf(PropTypes.shape({ name: PropTypes.string.isRequired })).isRequired,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onDone: PropTypes.func.isRequired,
};

export default CancelGameDialog;
