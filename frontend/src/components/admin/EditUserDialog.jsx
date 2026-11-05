/**
 * EditUserDialog Component
 *
 * The admin renames a user, or changes their role. The name cannot change while the player is
 * in a game (it is copied in the data of the game). A change of role always asks to confirm,
 * and warns an admin who is about to lose their own access.
 */

import React, { useRef, useState } from "react";
import PropTypes from "prop-types";
import { Modal, Button, Input } from "../common";
import { adminService } from "../../services";

const MIN_NAME = 3;
const MAX_NAME = 30;

function EditUserDialog({ user, isSelf = false, onClose, onDone }) {
  const [name, setName] = useState(user.username);
  const [nameError, setNameError] = useState(null);
  const [serverError, setServerError] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const inFlight = useRef(false);

  const isAdmin = user.role === "admin";
  const newRole = isAdmin ? "player" : "admin";
  const newRoleLabel = isAdmin ? "giocatore" : "admin";
  const trimmed = name.trim();

  // The same guard for both changes: one request at a time, and what the server says is shown here
  const send = async (change, kind) => {
    if (inFlight.current) {
      return;
    }
    inFlight.current = true;
    setSending(true);
    setServerError(null);
    try {
      onDone(await adminService.updateUser(user.playerId, change), kind);
    } catch (error) {
      setServerError(error.message);
    } finally {
      inFlight.current = false;
      setSending(false);
    }
  };

  const saveName = (event) => {
    event?.preventDefault();
    if (trimmed.length < MIN_NAME) {
      setNameError(`Almeno ${MIN_NAME} caratteri`);
      return;
    }
    if (trimmed.length > MAX_NAME) {
      setNameError(`Al massimo ${MAX_NAME} caratteri`);
      return;
    }
    setNameError(null);
    send({ username: trimmed }, "rename");
  };

  const errorLine = serverError && (
    <p role="alert" className="text-sm font-bold text-coppe [overflow-wrap:anywhere]">
      {serverError}
    </p>
  );

  if (confirming) {
    return (
      <Modal isOpen onClose={onClose} title={`Rendere ${newRoleLabel} ${user.username}?`}>
        <div className="space-y-4">
          <p className="text-testo [overflow-wrap:anywhere]">
            {isAdmin
              ? `${user.username} non potrà più usare l'amministrazione.`
              : `${user.username} potrà vedere e modificare tutti gli utenti, anche i loro crediti.`}
          </p>
          {isSelf && isAdmin && (
            <p className="font-bold text-oro">{"Perderai l'accesso all'amministrazione."}</p>
          )}
          {errorLine}
          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <Button type="button" disabled={sending} onClick={() => send({ role: newRole }, "role")} className="flex-1">
              {sending ? "Invio in corso…" : "Sì, conferma"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setConfirming(false);
                setServerError(null);
              }}
              className="flex-1"
            >
              Annulla
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen onClose={onClose} title={`Modifica ${user.username}`}>
      <div className="space-y-6">
        <form onSubmit={saveName} noValidate className="space-y-3">
          <Input
            label="Nuovo nome utente"
            type="text"
            maxLength={MAX_NAME}
            value={name}
            disabled={user.inGame}
            onChange={(e) => {
              setName(e.target.value);
              setNameError(null);
            }}
            error={nameError ?? undefined}
          />
          {user.inGame && (
            <p className="text-sm text-testo-2">Il giocatore è in una partita: il nome si può cambiare dopo</p>
          )}
          <Button type="submit" disabled={sending || user.inGame || trimmed === user.username} fullWidth>
            Salva nome
          </Button>
        </form>

        <div className="space-y-3 border-t-2 border-linea pt-4">
          <p className="text-testo">{`Ruolo attuale: ${isAdmin ? "Admin" : "Giocatore"}`}</p>
          <Button
            type="button"
            variant="secondary"
            disabled={sending}
            onClick={() => {
              setServerError(null);
              setConfirming(true);
            }}
            fullWidth
          >
            {`Rendi ${newRoleLabel}`}
          </Button>
        </div>

        {errorLine}
      </div>
    </Modal>
  );
}

EditUserDialog.propTypes = {
  user: PropTypes.shape({
    playerId: PropTypes.string.isRequired,
    username: PropTypes.string.isRequired,
    role: PropTypes.string.isRequired,
    inGame: PropTypes.bool,
  }).isRequired,
  isSelf: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
  onDone: PropTypes.func.isRequired,
};

export default EditUserDialog;
