-- Registro delle azioni: chi ha fatto cosa su chi. Si scrive nella stessa transazione della
-- modifica che descrive, quindi una modifica rifiutata non lascia nessuna riga.
--
-- Il registro sopravvive ai giocatori: per questo actor_id e target_id non hanno una chiave
-- esterna. L'attore è un giocatore (admin) oppure il sistema (script da terminale).

CREATE TABLE audit_log (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_type  TEXT NOT NULL CHECK (actor_type IN ('system', 'player')),
  actor_id    TEXT,
  action      TEXT NOT NULL,
  target_id   TEXT,
  details     JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX audit_log_target_idx ON audit_log (target_id, id DESC);
