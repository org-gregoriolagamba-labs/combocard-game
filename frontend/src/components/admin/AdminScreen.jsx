/**
 * AdminScreen Component
 *
 * The admin area: the users (search, name, role, credits), the games, the statistics and the audit log. It is shown only to
 * an admin, but the server decides: a 403 sends the player back to the hall.
 */

import React, { useCallback, useState } from "react";
import { useDispatch } from "react-redux";
import { ArrowLeft } from "lucide-react";
import { setRole } from "../../store/slices/playerSlice";
import { addToast, setScreen } from "../../store/slices/uiSlice";
import UsersPanel from "./UsersPanel";
import AuditPanel from "./AuditPanel";
import GamesPanel from "./GamesPanel";
import StatsPanel from "./StatsPanel";

const TABS = [
  { id: "utenti", label: "Utenti" },
  { id: "partite", label: "Partite" },
  { id: "statistiche", label: "Statistiche" },
  { id: "registro", label: "Registro" },
];

function AdminScreen() {
  const dispatch = useDispatch();
  const [tab, setTab] = useState("utenti");

  // The server refused: whoever was an admin is not any more
  const handleForbidden = useCallback(() => {
    dispatch(setRole("player"));
    dispatch(setScreen("hall"));
    dispatch(addToast({ message: "Non hai più i permessi dell'amministrazione", type: "warning" }));
  }, [dispatch]);

  return (
    <div className="min-h-[100dvh] tavolo p-4 max-[359px]:p-2">
      <div className="mx-auto max-w-3xl space-y-4">
        <section className="superficie p-4 max-[359px]:p-3 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="titolo min-w-0 text-2xl text-testo [overflow-wrap:anywhere] sm:text-3xl">Amministrazione</h1>
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
                id={`scheda-${id}`}
                aria-selected={tab === id}
                aria-controls="pannello-admin"
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
          id="pannello-admin"
          role="tabpanel"
          aria-labelledby={`scheda-${tab}`}
          className="superficie p-4 max-[359px]:p-3 sm:p-6"
        >
          {tab === "utenti" && <UsersPanel onForbidden={handleForbidden} />}
          {tab === "partite" && <GamesPanel onForbidden={handleForbidden} />}
          {tab === "statistiche" && <StatsPanel onForbidden={handleForbidden} />}
          {tab === "registro" && <AuditPanel onForbidden={handleForbidden} />}
        </section>
      </div>
    </div>
  );
}

export default AdminScreen;
