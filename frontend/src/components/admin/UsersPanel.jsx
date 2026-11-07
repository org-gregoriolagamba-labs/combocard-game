/**
 * UsersPanel Component
 *
 * The registered users: search by name, filter by role, pages, and the two actions on each user
 * (edit the name or the role, adjust the credits).
 */

import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import { Button, Input } from "../common";
import { adminService } from "../../services";
import { setPlayer, setRole, updateCredits } from "../../store/slices/playerSlice";
import { addToast, setScreen } from "../../store/slices/uiSlice";
import AccessDialog from "./AccessDialog";
import CreditsDialog from "./CreditsDialog";
import EditUserDialog from "./EditUserDialog";
import Pager from "./Pager";

const PAGE_SIZE = 20;

const action =
  "min-h-[44px] min-w-[44px] max-w-full rounded-xl border-2 border-linea-forte bg-notte-700 px-3 text-sm font-bold text-testo transition hover:bg-notte-600";

const tag = "rounded-sm px-1.5 text-xs font-bold leading-5";

function UsersPanel({ onForbidden }) {
  const dispatch = useDispatch();
  const ownId = useSelector((state) => state.player.id);
  const [draft, setDraft] = useState("");
  const [q, setQ] = useState("");
  const [role, setRoleFilter] = useState("");
  const [page, setPage] = useState(1);
  const [reloads, setReloads] = useState(0);
  // The last page that arrived (it stays on screen while the next one loads), and how the
  // request of the moment ended: { key, error } once it is over
  const [data, setData] = useState(null);
  const [outcome, setOutcome] = useState(null);
  const [dialog, setDialog] = useState(null);

  const key = `${q}|${role}|${page}|${reloads}`;
  const loading = outcome?.key !== key;
  const error = loading ? null : outcome.error;

  useEffect(() => {
    // An answer that arrives after a newer request was made is not shown
    let current = true;
    adminService
      .listUsers({ q, role, page, limit: PAGE_SIZE })
      .then((result) => {
        if (current) {
          setData(result);
          setOutcome({ key, error: null });
        }
      })
      .catch((err) => {
        if (!current) {
          return;
        }
        if (err.status === 403) {
          onForbidden();
        } else {
          setOutcome({ key, error: err.message });
        }
      });
    return () => {
      current = false;
    };
  }, [key, q, role, page, onForbidden]);

  const search = (event) => {
    event.preventDefault();
    setPage(1);
    setQ(draft.trim());
  };

  const changeUser = (changes) =>
    setData((current) => ({
      ...current,
      items: current.items.map((user) => (user.playerId === changes.playerId ? { ...user, ...changes } : user)),
    }));

  const creditsDone = (user, result) => {
    changeUser({ playerId: user.playerId, credits: result.credits });
    if (user.playerId === ownId) {
      dispatch(updateCredits(result.credits));
    }
    dispatch(addToast({ message: `Crediti aggiornati: ${user.username} ora ha ${result.credits} crediti`, type: "success" }));
    setDialog(null);
  };

  const editDone = (user, updated, kind) => {
    changeUser(updated);
    if (kind === "rename") {
      if (user.playerId === ownId) {
        dispatch(setPlayer({ name: updated.username }));
      }
      dispatch(addToast({ message: `Nome cambiato: ora è ${updated.username}`, type: "success" }));
    } else {
      dispatch(addToast({ message: `${updated.username} ora è ${updated.role === "admin" ? "admin" : "giocatore"}`, type: "success" }));
      // An admin who made themselves a player has no admin area any more
      if (user.playerId === ownId && updated.role !== "admin") {
        dispatch(setRole("player"));
        dispatch(setScreen("hall"));
      }
    }
    setDialog(null);
  };

  const accessDone = (user, updated, kind) => {
    changeUser(updated);
    const message = {
      suspend: `Accesso sospeso: ${user.username}`,
      unsuspend: `Accesso riabilitato: ${user.username}`,
      revoke: `Sessioni chiuse: ${user.username}`,
    }[kind];
    dispatch(addToast({ message, type: "success" }));
    setDialog(null);
  };

  const select =
    "min-h-[44px] w-full rounded-xl border border-linea-forte bg-notte-950 px-4 py-3 text-testo focus:outline-none focus:ring-2 focus:ring-oro";

  return (
    <div>
      <form onSubmit={search} className="space-y-3" role="search">
        <Input label="Cerca per nome" type="search" value={draft} maxLength={30} onChange={(e) => setDraft(e.target.value)} />
        <Button type="submit" variant="secondary" fullWidth>Cerca</Button>
        <div>
          <label htmlFor="filtro-ruolo" className="mb-2 block text-sm font-bold text-testo">Ruolo</label>
          <select
            id="filtro-ruolo"
            value={role}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className={select}
          >
            <option value="">Tutti i ruoli</option>
            <option value="player">Giocatori</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </form>

      <div className="mt-4 border-t-2 border-linea pt-4" aria-busy={loading}>
        {error && (
          <div className="space-y-3">
            <p role="alert" className="font-bold text-coppe [overflow-wrap:anywhere]">{error}</p>
            <Button type="button" variant="secondary" onClick={() => setReloads((n) => n + 1)}>Riprova</Button>
          </div>
        )}

        {!error && !data && <p role="status" className="text-testo-2">Caricamento degli utenti…</p>}

        {!error && data && (
          <>
            <p className="mb-3 text-sm font-bold tabular-nums text-testo-2">
              {`${data.total} ${data.total === 1 ? "utente" : "utenti"}`}
            </p>
            {data.items.length === 0 ? (
              <p className="text-testo-2">Nessun utente trovato</p>
            ) : (
              <ul aria-label="Utenti" className="divide-y-2 divide-linea">
                {data.items.map((user) => (
                  <li key={user.playerId} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-lg font-bold text-testo [overflow-wrap:anywhere]">
                          {user.username}
                          {user.role === "admin" && <span className={`${tag} bg-oro text-inchiostro-900`}>Admin</span>}
                          {user.suspended && <span className={`${tag} bg-coppe text-testo`}>Sospeso</span>}
                          {user.inGame && <span className={`${tag} bg-notte-600 text-testo`}>In partita</span>}
                        </p>
                        <p className="text-sm tabular-nums text-testo-2">{`${user.credits} crediti`}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className={action}
                          aria-label={`Modifica ${user.username}`}
                          onClick={() => setDialog({ type: "edit", user })}
                        >
                          Modifica
                        </button>
                        <button
                          type="button"
                          className={action}
                          aria-label={`Rettifica crediti di ${user.username}`}
                          onClick={() => setDialog({ type: "credits", user })}
                        >
                          Crediti
                        </button>
                        {/* An admin cannot suspend themselves: the server refuses it, so the button is not there */}
                        {user.playerId !== ownId && (
                          <button
                            type="button"
                            className={action}
                            aria-label={`Accesso di ${user.username}`}
                            onClick={() => setDialog({ type: "access", user })}
                          >
                            Accesso
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <Pager page={page} total={data.total} limit={data.limit ?? PAGE_SIZE} onPage={setPage} disabled={loading} />
          </>
        )}
      </div>

      {dialog?.type === "credits" && (
        <CreditsDialog
          user={dialog.user}
          isSelf={dialog.user.playerId === ownId}
          onClose={() => setDialog(null)}
          onDone={(result) => creditsDone(dialog.user, result)}
        />
      )}
      {dialog?.type === "access" && (
        <AccessDialog
          user={dialog.user}
          onClose={() => setDialog(null)}
          onDone={(updated, kind) => accessDone(dialog.user, updated, kind)}
        />
      )}
      {dialog?.type === "edit" && (
        <EditUserDialog
          user={dialog.user}
          isSelf={dialog.user.playerId === ownId}
          onClose={() => setDialog(null)}
          onDone={(updated, kind) => editDone(dialog.user, updated, kind)}
        />
      )}
    </div>
  );
}

UsersPanel.propTypes = {
  onForbidden: PropTypes.func.isRequired,
};

export default UsersPanel;
