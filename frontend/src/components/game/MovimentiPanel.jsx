/**
 * MovimentiPanel Component
 *
 * The credit movements of the player, the latest first: what each one is, the game it belongs to, the
 * amount with its sign (the sign is written, not only coloured), the balance after and when. Paged,
 * with a filter by type and by period. Without the database nothing is kept and it says so.
 */

import React, { useEffect, useState } from "react";
import { Button } from "../common";
import { meService } from "../../services";
import Pager from "../admin/Pager";

const PAGE_SIZE = 20;

export const TIPI_MOVIMENTO = {
  initial: "Crediti iniziali",
  purchase: "Crediti presi",
  game_entry: "Quota d'ingresso",
  game_payout: "Premio",
  game_refund: "Rimborso",
  // The reason an admin gave stays in the audit log: the player is told only that it happened
  admin_adjustment: "Rettifica dell'amministrazione",
  account_closed: "Account chiuso",
};

const CAMPO =
  "min-h-[44px] w-full rounded-xl border border-linea-forte bg-notte-950 px-3 text-testo focus:outline-none focus:ring-2 focus:ring-oro";

/** An amount with its sign: a plus, or a real minus sign */
export const conSegno = (n) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "0");

const inizioGiorno = (data) => new Date(`${data}T00:00:00`).toISOString();
const fineGiorno = (data) => new Date(`${data}T23:59:59.999`).toISOString();

function MovimentiPanel() {
  const [page, setPage] = useState(1);
  const [type, setType] = useState("");
  const [dal, setDal] = useState("");
  const [al, setAl] = useState("");
  const [reloads, setReloads] = useState(0);
  // The last page that arrived (it stays on screen while the next one loads), and how the
  // request of the moment ended: { key, error } once it is over
  const [data, setData] = useState(null);
  const [outcome, setOutcome] = useState(null);

  const key = `${page}|${type}|${dal}|${al}|${reloads}`;
  const loading = outcome?.key !== key;
  const error = loading ? null : outcome.error;

  useEffect(() => {
    // An answer that arrives after a newer request was made is not shown
    let current = true;
    meService
      .getMovements({
        page,
        limit: PAGE_SIZE,
        type: type || undefined,
        from: dal ? inizioGiorno(dal) : undefined,
        to: al ? fineGiorno(al) : undefined,
      })
      .then((result) => {
        if (current) {
          setData(result);
          setOutcome({ key, error: null });
        }
      })
      .catch((err) => {
        if (current) {
          setOutcome({ key, error: err.message });
        }
      });
    return () => {
      current = false;
    };
  }, [key, page, type, dal, al]);

  // A new filter starts from the first page
  const filtra = (imposta) => (event) => {
    imposta(event.target.value);
    setPage(1);
  };

  if (error) {
    return (
      <div className="space-y-3">
        <p role="alert" className="font-bold text-coppe [overflow-wrap:anywhere]">{error}</p>
        <Button type="button" variant="secondary" onClick={() => setReloads((n) => n + 1)}>Riprova</Button>
      </div>
    );
  }

  if (!data) {
    return <p role="status" className="text-testo-2">Caricamento dei movimenti…</p>;
  }

  if (data.disponibile === false) {
    return (
      <p className="text-testo-2 [text-wrap:pretty]">
        Lo storico è disponibile solo quando il server usa il database: senza, i movimenti non vengono conservati.
      </p>
    );
  }

  return (
    <div aria-busy={loading}>
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="block text-sm font-bold text-testo-2">
          Tipo
          <select className={`${CAMPO} mt-1`} value={type} onChange={filtra(setType)}>
            <option value="">Tutti</option>
            {Object.entries(TIPI_MOVIMENTO).map(([valore, etichetta]) => (
              <option key={valore} value={valore}>{etichetta}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-bold text-testo-2">
          Dal
          <input type="date" className={`${CAMPO} mt-1`} value={dal} max={al || undefined} onChange={filtra(setDal)} />
        </label>
        <label className="block text-sm font-bold text-testo-2">
          Al
          <input type="date" className={`${CAMPO} mt-1`} value={al} min={dal || undefined} onChange={filtra(setAl)} />
        </label>
      </div>

      {data.items.length === 0 ? (
        <p className="text-testo-2">Nessun movimento</p>
      ) : (
        <ul aria-label="Movimenti" className="divide-y-2 divide-linea">
          {data.items.map((movimento) => (
            <li key={movimento.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="font-bold text-testo [overflow-wrap:anywhere]">
                  {TIPI_MOVIMENTO[movimento.tipo] ?? movimento.tipo}
                </p>
                {movimento.partita && (
                  <p className="text-sm text-testo-2 [overflow-wrap:anywhere]">
                    {movimento.partita.creatore ? `Partita di ${movimento.partita.creatore}` : "Partita"}
                  </p>
                )}
                <time dateTime={movimento.data} className="text-sm text-testo-2">
                  {new Date(movimento.data).toLocaleString("it-IT", { dateStyle: "medium", timeStyle: "short" })}
                </time>
              </div>
              <div className="shrink-0 text-right">
                <p className={`titolo text-lg tabular-nums ${movimento.importo > 0 ? "text-bastoni" : "text-coppe"}`}>
                  {conSegno(movimento.importo)}
                </p>
                <p className="text-sm tabular-nums text-testo-2">Saldo {movimento.saldoDopo}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Pager page={page} total={data.total} limit={data.limit ?? PAGE_SIZE} onPage={setPage} disabled={loading} />
    </div>
  );
}

export default MovimentiPanel;
