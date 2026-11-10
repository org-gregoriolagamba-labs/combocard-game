/**
 * StoricoScreen Component
 *
 * The player's own history and statistics, from the hall: two sections, the credit movements and the
 * personal statistics. The server answers only with the data of the player of the token.
 */

import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { ArrowLeft } from "lucide-react";
import { setScreen } from "../../store/slices/uiSlice";
import MovimentiPanel from "./MovimentiPanel";
import StatistichePanel from "./StatistichePanel";

const TABS = [
  { id: "movimenti", label: "Movimenti" },
  { id: "statistiche", label: "Statistiche" },
];

function StoricoScreen() {
  const dispatch = useDispatch();
  const [tab, setTab] = useState("movimenti");

  return (
    <div className="min-h-[100dvh] tavolo p-4 max-[359px]:p-2">
      <div className="mx-auto max-w-3xl space-y-4">
        <section className="superficie p-4 max-[359px]:p-3 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="titolo min-w-0 text-2xl text-testo [overflow-wrap:anywhere] sm:text-3xl">Storico e statistiche</h1>
            <button
              type="button"
              onClick={() => dispatch(setScreen("hall"))}
              className="flex min-h-[44px] max-w-full items-center gap-2 rounded-xl border-2 border-linea-forte bg-notte-700 px-4 font-bold text-testo transition hover:bg-notte-600"
            >
              <ArrowLeft size={20} aria-hidden="true" />
              Torna alla hall
            </button>
          </div>

          <div role="tablist" aria-label="Sezioni" className="mt-4 grid grid-cols-2 gap-2 max-[259px]:grid-cols-1">
            {TABS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                role="tab"
                id={`scheda-storico-${id}`}
                aria-selected={tab === id}
                aria-controls="pannello-storico"
                onClick={() => setTab(id)}
                className={`min-h-[44px] rounded-xl border-2 px-3 font-bold transition ${
                  tab === id
                    ? "border-oro bg-oro/10 text-testo"
                    : "border-linea-forte bg-notte-700 text-testo-2 hover:bg-notte-600"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <section
          id="pannello-storico"
          role="tabpanel"
          aria-labelledby={`scheda-storico-${tab}`}
          className="superficie p-4 max-[359px]:p-3 sm:p-6"
        >
          {tab === "movimenti" && <MovimentiPanel />}
          {tab === "statistiche" && <StatistichePanel />}
        </section>
      </div>
    </div>
  );
}

export default StoricoScreen;
