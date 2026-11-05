/**
 * CreditsDialog Component
 *
 * The admin adds or takes away credits from a user, with the reason that goes in the audit log.
 * The amount is typed without a sign (a phone keypad has no minus): "Aggiungi" or "Togli" says
 * which. Each problem is shown in its field, once, and nothing is sent until the form is right.
 */

import React, { useRef, useState } from "react";
import PropTypes from "prop-types";
import { Modal, Button, Input } from "../common";
import { adminService } from "../../services";

const MAX_AMOUNT = 1000000;

// The number typed in the field, NaN when it is empty or is not a whole number
const numero = (testo) => (/^\d+$/.test(testo) ? parseInt(testo, 10) : NaN);

function CreditsDialog({ user, isSelf = false, onClose, onDone }) {
  const [operation, setOperation] = useState("add");
  const [amountText, setAmountText] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [sending, setSending] = useState(false);
  // A double tap must not send it twice: the ref answers at once, the state would not
  const inFlight = useRef(false);

  const amount = numero(amountText);
  const removing = operation === "remove";
  const validAmount = amount > 0 && amount <= MAX_AMOUNT && (!removing || amount <= user.credits);
  const after = validAmount ? user.credits + (removing ? -amount : amount) : null;

  const validate = () => {
    const problems = {};
    if (amountText.trim() === "" || amount === 0) {
      problems.amount = "Scrivi un importo";
    } else if (Number.isNaN(amount)) {
      problems.amount = "Scrivi un numero intero, senza segno";
    } else if (amount > MAX_AMOUNT) {
      problems.amount = "Al massimo 1.000.000 crediti per volta";
    } else if (removing && amount > user.credits) {
      problems.amount = `Il giocatore ha solo ${user.credits} crediti: non puoi toglierne di più`;
    }
    if (reason.trim() === "") {
      problems.reason = "Scrivi il motivo";
    }
    return problems;
  };

  const submit = async (event) => {
    event?.preventDefault();
    if (inFlight.current) {
      return;
    }
    const problems = validate();
    setErrors(problems);
    if (Object.keys(problems).length > 0) {
      return;
    }

    inFlight.current = true;
    setSending(true);
    setServerError(null);
    try {
      const result = await adminService.adjustCredits(user.playerId, {
        amount: removing ? -amount : amount,
        reason: reason.trim(),
      });
      onDone(result);
    } catch (error) {
      setServerError(error.message);
    } finally {
      inFlight.current = false;
      setSending(false);
    }
  };

  const choice =
    "flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-xl border-2 px-3 font-bold text-testo transition";

  return (
    <Modal isOpen onClose={onClose} title={`Rettifica crediti di ${user.username}`}>
      <form onSubmit={submit} noValidate className="space-y-4">
        {isSelf && <p className="text-sm font-bold text-oro">Stai rettificando i tuoi crediti</p>}
        <p className="text-testo">{`Saldo attuale: ${user.credits} crediti`}</p>

        <fieldset>
          <legend className="mb-2 text-sm font-bold text-testo">Operazione</legend>
          <div className="grid grid-cols-2 gap-2">
            {[["add", "Aggiungi"], ["remove", "Togli"]].map(([value, label]) => (
              <label
                key={value}
                className={`${choice} ${operation === value ? "border-oro bg-oro/10" : "border-linea-forte bg-notte-700"}`}
              >
                <input
                  type="radio"
                  name="operazione"
                  value={value}
                  checked={operation === value}
                  onChange={() => {
                    setOperation(value);
                    setErrors((current) => ({ ...current, amount: undefined }));
                  }}
                  className="h-5 w-5 shrink-0 accent-[var(--oro,#ffcf4a)]"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <Input
          label="Importo"
          type="number"
          inputMode="numeric"
          min="1"
          max={MAX_AMOUNT}
          value={amountText}
          onChange={(e) => {
            setAmountText(e.target.value);
            setErrors((current) => ({ ...current, amount: undefined }));
          }}
          error={errors.amount}
        />
        {after !== null && (
          <p className="text-sm font-bold tabular-nums text-testo-2">{`Saldo dopo: ${after} crediti`}</p>
        )}

        <Input
          label="Motivo"
          type="text"
          maxLength={200}
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            setErrors((current) => ({ ...current, reason: undefined }));
          }}
          hint="Resta nel registro delle azioni."
          error={errors.reason}
        />

        {serverError && (
          <p role="alert" className="text-sm font-bold text-coppe [overflow-wrap:anywhere]">
            {serverError}
          </p>
        )}

        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <Button type="submit" disabled={sending} className="flex-1">
            {sending ? "Invio in corso…" : "Conferma rettifica"}
          </Button>
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Annulla
          </Button>
        </div>
      </form>
    </Modal>
  );
}

CreditsDialog.propTypes = {
  user: PropTypes.shape({
    playerId: PropTypes.string.isRequired,
    username: PropTypes.string.isRequired,
    credits: PropTypes.number.isRequired,
  }).isRequired,
  isSelf: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
  onDone: PropTypes.func.isRequired,
};

export default CreditsDialog;
