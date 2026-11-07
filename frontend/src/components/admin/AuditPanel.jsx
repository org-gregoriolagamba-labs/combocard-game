/**
 * AuditPanel Component
 *
 * The audit log: what the admins and the system did, the latest first, each action as a sentence.
 */

import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Button } from "../common";
import { adminService } from "../../services";
import Pager from "./Pager";

const PAGE_SIZE = 20;

const crediti = (n) => `${n} ${n === 1 ? "credito" : "crediti"}`;

/**
 * An action of the audit log, as a sentence
 * @param {Object} e - Event: { action, actorType, actorId, actorName, targetId, targetName, details }
 * @returns {string} The sentence
 */
export function frase(e) {
  const chi = e.actorType === "system" ? "Il sistema" : e.actorName ?? "Un utente";
  const bersaglio = e.targetName ?? "un utente";
  const suSeStesso = e.actorType === "player" && e.actorId !== null && e.actorId === e.targetId;

  if (e.action === "credits_adjusted") {
    const { amount, reason } = e.details;
    const verbo = amount > 0 ? "aggiunto" : "tolto";
    const preposizione = amount > 0 ? "al" : "dal";
    const dove = suSeStesso ? `${preposizione} proprio saldo` : `${preposizione} saldo di ${bersaglio}`;
    return `${chi} ha ${verbo} ${crediti(Math.abs(amount))} ${dove}: «${reason}»`;
  }
  if (e.action === "role_changed") {
    return `${chi} ha reso ${e.details.to === "admin" ? "admin" : "giocatore"} ${bersaglio}`;
  }
  if (e.action === "username_changed") {
    return `${chi} ha cambiato il nome di ${e.details.from} in ${e.details.to}`;
  }
  if (e.action === "game_cancelled") {
    const { reason, previousStatus, refunds = [] } = e.details;
    const rimborsati = refunds.reduce((total, r) => total + r.amount, 0);
    const stato = previousStatus === "playing" ? "in corso" : "in attesa";
    return `${chi} ha annullato una partita ${stato}: «${reason}»${rimborsati > 0 ? `, rimborsati ${crediti(rimborsati)}` : ""}`;
  }
  if (e.action === "user_suspended") {
    return `${chi} ha sospeso ${bersaglio}: «${e.details.reason}»`;
  }
  if (e.action === "user_unsuspended") {
    return `${chi} ha riabilitato ${bersaglio}: «${e.details.reason}»`;
  }
  if (e.action === "sessions_revoked") {
    return `${chi} ha chiuso le sessioni di ${bersaglio}: «${e.details.reason}»`;
  }
  if (e.action === "password_reset") {
    return `${chi} ha reimpostato la password di ${bersaglio}: «${e.details.reason}»`;
  }
  if (e.action === "password_changed") {
    return suSeStesso ? `${chi} ha cambiato la propria password` : `${chi} ha cambiato la password di ${bersaglio}`;
  }
  return `${chi}: ${e.action}`;
}

function AuditPanel({ onForbidden }) {
  const [page, setPage] = useState(1);
  const [reloads, setReloads] = useState(0);
  // The last page that arrived (it stays on screen while the next one loads), and how the
  // request of the moment ended: { key, error } once it is over
  const [data, setData] = useState(null);
  const [outcome, setOutcome] = useState(null);

  const key = `${page}|${reloads}`;
  const loading = outcome?.key !== key;
  const error = loading ? null : outcome.error;

  useEffect(() => {
    // An answer that arrives after a newer request was made is not shown
    let current = true;
    adminService
      .listAudit({ page, limit: PAGE_SIZE })
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
  }, [key, page, onForbidden]);

  if (error) {
    return (
      <div className="space-y-3">
        <p role="alert" className="font-bold text-coppe [overflow-wrap:anywhere]">{error}</p>
        <Button type="button" variant="secondary" onClick={() => setReloads((n) => n + 1)}>Riprova</Button>
      </div>
    );
  }

  if (!data) {
    return <p role="status" className="text-testo-2">Caricamento del registro…</p>;
  }

  return (
    <div aria-busy={loading}>
      {data.items.length === 0 ? (
        <p className="text-testo-2">Nessuna azione registrata</p>
      ) : (
        <ul aria-label="Azioni registrate" className="divide-y-2 divide-linea">
          {data.items.map((event) => (
            <li key={event.id} className="py-3 first:pt-0 last:pb-0">
              <p className="text-testo [overflow-wrap:anywhere]">{frase(event)}</p>
              <time dateTime={event.createdAt} className="text-sm text-testo-2">
                {new Date(event.createdAt).toLocaleString("it-IT", { dateStyle: "medium", timeStyle: "short" })}
              </time>
            </li>
          ))}
        </ul>
      )}
      <Pager page={page} total={data.total} limit={data.limit ?? PAGE_SIZE} onPage={setPage} disabled={loading} />
    </div>
  );
}

AuditPanel.propTypes = {
  onForbidden: PropTypes.func.isRequired,
};

export default AuditPanel;
