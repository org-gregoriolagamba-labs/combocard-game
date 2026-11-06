/**
 * StatsPanel Component
 *
 * The numbers of the platform: users, games, credits and prizes. No names: only counts.
 */

import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Button } from "../common";
import { adminService } from "../../services";

const number = (n) => new Intl.NumberFormat("it-IT").format(n);

// What is shown, by group: [label, how to read it from the statistics]
const GROUPS = [
  {
    title: "Utenti",
    rows: [
      ["Utenti registrati", (s) => s.users.registered],
      ["In partita ora", (s) => s.users.inGame],
      ["Admin", (s) => s.users.admins],
    ],
  },
  {
    title: "Partite",
    rows: [
      ["Partite in attesa", (s) => s.games.waiting],
      ["Partite in corso", (s) => s.games.playing],
      ["Partite finite", (s) => s.games.finished],
      ["Partite annullate", (s) => s.games.cancelled],
    ],
  },
  {
    title: "Crediti",
    rows: [
      ["Crediti in circolazione", (s) => s.credits.inCirculation],
      ["Crediti nei montepremi in corso", (s) => s.credits.inPlay],
      ["Montepremi distribuiti", (s) => s.prizesDistributed],
    ],
  },
];

function StatsPanel({ onForbidden }) {
  const [reloads, setReloads] = useState(0);
  const [data, setData] = useState(null);
  const [outcome, setOutcome] = useState(null);

  const loading = outcome?.key !== reloads;
  const error = loading ? null : outcome.error;

  useEffect(() => {
    let current = true;
    adminService
      .getStats()
      .then((result) => {
        if (current) {
          setData(result);
          setOutcome({ key: reloads, error: null });
        }
      })
      .catch((err) => {
        if (!current) {
          return;
        }
        if (err.status === 403) {
          onForbidden();
        } else {
          setOutcome({ key: reloads, error: err.message });
        }
      });
    return () => {
      current = false;
    };
  }, [reloads, onForbidden]);

  if (error) {
    return (
      <div className="space-y-3">
        <p role="alert" className="font-bold text-coppe [overflow-wrap:anywhere]">{error}</p>
        <Button type="button" variant="secondary" onClick={() => setReloads((n) => n + 1)}>Riprova</Button>
      </div>
    );
  }

  if (!data) {
    return <p role="status" className="text-testo-2">Caricamento delle statistiche…</p>;
  }

  return (
    <div aria-busy={loading} className="space-y-5">
      {GROUPS.map(({ title, rows }) => (
        <section key={title} aria-label={title}>
          <h2 className="titolo mb-2 text-lg text-testo">{title}</h2>
          <dl className="divide-y-2 divide-linea">
            {rows.map(([label, read]) => (
              <div key={label} className="flex items-baseline justify-between gap-3 py-2">
                <dt className="min-w-0 text-testo-2 [overflow-wrap:anywhere]">{label}</dt>
                <dd className="shrink-0 text-lg font-bold tabular-nums text-testo">{number(read(data))}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
      <Button type="button" variant="secondary" fullWidth disabled={loading} onClick={() => setReloads((n) => n + 1)}>
        Aggiorna
      </Button>
    </div>
  );
}

StatsPanel.propTypes = {
  onForbidden: PropTypes.func.isRequired,
};

export default StatsPanel;
