/**
 * GamesPanel Component
 *
 * The games waiting or in progress, the oldest first (the stuck ones are at the top), with the
 * metadata only: never the deck or the grids. Each game can be cancelled, with a reason.
 */

import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { useDispatch } from "react-redux";
import { Button } from "../common";
import { adminService } from "../../services";
import { addToast } from "../../store/slices/uiSlice";
import CancelGameDialog from "./CancelGameDialog";
import Pager from "./Pager";

const PAGE_SIZE = 20;

const action =
  "min-h-[44px] min-w-[44px] max-w-full rounded-xl border-2 border-linea-forte bg-notte-700 px-3 text-sm font-bold text-testo transition hover:bg-notte-600";

const tag = "rounded-sm px-1.5 text-xs font-bold leading-5";

const STATUS_LABEL = { waiting: "In attesa", playing: "In corso" };

function GamesPanel({ onForbidden }) {
  const dispatch = useDispatch();
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [reloads, setReloads] = useState(0);
  // The last page that arrived (it stays on screen while the next one loads), and how the
  // request of the moment ended: { key, error } once it is over
  const [data, setData] = useState(null);
  const [outcome, setOutcome] = useState(null);
  const [dialog, setDialog] = useState(null);

  const key = `${status}|${page}|${reloads}`;
  const loading = outcome?.key !== key;
  const error = loading ? null : outcome.error;

  useEffect(() => {
    // An answer that arrives after a newer request was made is not shown
    let current = true;
    adminService
      .listGames({ status, page, limit: PAGE_SIZE })
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
  }, [key, status, page, onForbidden]);

  const cancelled = (game, result) => {
    const refunded = result.players.filter((p) => p.refund > 0).length;
    const message =
      refunded > 0
        ? `Partita annullata: ${refunded} ${refunded === 1 ? "giocatore rimborsato" : "giocatori rimborsati"} di ${game.requiredCredits} crediti`
        : "Partita annullata";
    dispatch(addToast({ message, type: "success" }));
    setDialog(null);
    setReloads((n) => n + 1);
  };

  const select =
    "min-h-[44px] w-full rounded-xl border border-linea-forte bg-notte-950 px-4 py-3 text-testo focus:outline-none focus:ring-2 focus:ring-oro";

  return (
    <div>
      <div>
        <label htmlFor="filtro-stato" className="mb-2 block text-sm font-bold text-testo">Stato</label>
        <select
          id="filtro-stato"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className={select}
        >
          <option value="">Tutte</option>
          <option value="waiting">In attesa</option>
          <option value="playing">In corso</option>
        </select>
      </div>

      <div className="mt-4 border-t-2 border-linea pt-4" aria-busy={loading}>
        {error && (
          <div className="space-y-3">
            <p role="alert" className="font-bold text-coppe [overflow-wrap:anywhere]">{error}</p>
            <Button type="button" variant="secondary" onClick={() => setReloads((n) => n + 1)}>Riprova</Button>
          </div>
        )}

        {!error && !data && <p role="status" className="text-testo-2">Caricamento delle partite…</p>}

        {!error && data && (
          <>
            <p className="mb-3 text-sm font-bold tabular-nums text-testo-2">
              {`${data.total} ${data.total === 1 ? "partita" : "partite"}`}
            </p>
            {data.items.length === 0 ? (
              <p className="text-testo-2">Nessuna partita in attesa o in corso</p>
            ) : (
              <ul aria-label="Partite" className="divide-y-2 divide-linea">
                {data.items.map((game) => (
                  <li key={game.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-bold text-testo">
                          <span className={`${tag} ${game.status === "playing" ? "bg-oro text-inchiostro-900" : "bg-notte-600 text-testo"}`}>
                            {STATUS_LABEL[game.status] ?? game.status}
                          </span>
                          {game.isPrivate && <span className={`${tag} bg-notte-600 text-testo`}>Privata</span>}
                          <span className="text-sm tabular-nums text-testo-2">
                            {`${game.players.length} di ${game.maxPlayers} giocatori`}
                          </span>
                        </p>
                        <p className="mt-1 text-testo [overflow-wrap:anywhere]">
                          {game.players.map((p) => p.name).join(", ") || "Nessun giocatore"}
                        </p>
                        <p className="text-sm tabular-nums text-testo-2">
                          {`Quota ${game.requiredCredits} · Montepremi ${game.montepremi}`}
                        </p>
                        <time dateTime={game.createdAt} className="text-sm text-testo-2">
                          {`Creata ${new Date(game.createdAt).toLocaleString("it-IT", { dateStyle: "medium", timeStyle: "short" })}`}
                        </time>
                      </div>
                      <button type="button" className={action} onClick={() => setDialog({ game })}>
                        Annulla partita
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <Pager page={page} total={data.total} limit={data.limit ?? PAGE_SIZE} onPage={setPage} disabled={loading} />
          </>
        )}
      </div>

      {dialog && (
        <CancelGameDialog
          game={dialog.game}
          onClose={() => setDialog(null)}
          onDone={(result) => cancelled(dialog.game, result)}
        />
      )}
    </div>
  );
}

GamesPanel.propTypes = {
  onForbidden: PropTypes.func.isRequired,
};

export default GamesPanel;
