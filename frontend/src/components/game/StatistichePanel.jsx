/**
 * StatistichePanel Component
 *
 * The personal statistics of the player: the games, the collections won for each type, the credits spent
 * and won, the balance and the best prize. They come from the server, which counts them from the movements
 * and the games; without the database it says they are not available.
 */

import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Button } from "../common";
import { meService } from "../../services";
import { conSegno } from "./MovimentiPanel";

const COLLEZIONI = [
  ["tris", "Tris"],
  ["sequenza", "Sequenza"],
  ["scopa", "Scopa"],
  ["napola", "Napola"],
  ["combocard_reale", "Combocard Reale"],
];

function Riga({ etichetta, valore }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2">
      <dt className="text-testo-2">{etichetta}</dt>
      <dd className="titolo text-lg tabular-nums text-testo">{valore}</dd>
    </div>
  );
}

Riga.propTypes = {
  etichetta: PropTypes.string.isRequired,
  valore: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
};

function StatistichePanel() {
  const [reloads, setReloads] = useState(0);
  // How the request of the moment ended: { reloads, data } or { reloads, error } once it is over
  const [outcome, setOutcome] = useState(null);

  useEffect(() => {
    let current = true;
    meService
      .getStats()
      .then((result) => {
        if (current) setOutcome({ reloads, data: result });
      })
      .catch((err) => {
        if (current) setOutcome({ reloads, error: err.message });
      });
    return () => {
      current = false;
    };
  }, [reloads]);

  const concluso = outcome?.reloads === reloads;
  const error = concluso ? outcome.error ?? null : null;
  const data = concluso ? outcome.data ?? null : null;

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

  if (data.disponibile === false) {
    return (
      <p className="text-testo-2 [text-wrap:pretty]">
        Le statistiche sono disponibili solo quando il server usa il database: senza, i dati non vengono conservati.
      </p>
    );
  }

  const s = data.statistiche;

  return (
    <div className="space-y-5">
      <section aria-labelledby="stat-partite">
        <h2 id="stat-partite" className="titolo text-lg text-testo">Partite</h2>
        <dl className="divide-y-2 divide-linea">
          <Riga etichetta="Partite giocate" valore={s.partiteGiocate} />
          <Riga etichetta="Partite con almeno una collezione" valore={s.partiteConCollezione} />
          <Riga etichetta="Combocard Reale vinte" valore={s.partiteVinte} />
        </dl>
      </section>

      <section aria-labelledby="stat-collezioni">
        <h2 id="stat-collezioni" className="titolo text-lg text-testo">Collezioni vinte</h2>
        <dl className="divide-y-2 divide-linea">
          {COLLEZIONI.map(([tipo, nome]) => (
            <Riga key={tipo} etichetta={nome} valore={s.collezioniVinte[tipo] ?? 0} />
          ))}
        </dl>
      </section>

      <section aria-labelledby="stat-crediti">
        <h2 id="stat-crediti" className="titolo text-lg text-testo">Crediti</h2>
        <dl className="divide-y-2 divide-linea">
          <Riga etichetta="Crediti spesi" valore={s.creditiSpesi} />
          <Riga etichetta="Crediti vinti" valore={s.creditiVinti} />
          <Riga etichetta="Bilancio" valore={conSegno(s.saldoNetto)} />
          <Riga etichetta="Incasso più alto in una partita" valore={s.incassoMassimo} />
        </dl>
      </section>
    </div>
  );
}

export default StatistichePanel;
