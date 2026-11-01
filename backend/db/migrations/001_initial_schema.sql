-- Schema iniziale: giocatori, partite e movimenti di crediti.

CREATE TABLE players (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  credits     BIGINT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lo stato completo della partita (mazzo, cartelle, collezioni) sta in "state".
-- Le colonne duplicate servono solo a filtrare e ordinare senza leggere il JSON.
CREATE TABLE games (
  id                TEXT PRIMARY KEY,
  status            TEXT NOT NULL CHECK (status IN ('waiting', 'playing', 'finished')),
  is_private        BOOLEAN NOT NULL DEFAULT FALSE,
  required_credits  BIGINT NOT NULL,
  max_players       INTEGER NOT NULL,
  montepremi        BIGINT NOT NULL DEFAULT 0,
  state             JSONB NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ripristino all'avvio ed elenco di lobby e partite attive.
CREATE INDEX games_active_idx ON games (status, is_private, created_at)
  WHERE status <> 'finished';

-- Registro dei movimenti: players.credits è sempre la somma dei suoi movimenti.
CREATE TABLE credit_transactions (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  player_id      TEXT NOT NULL REFERENCES players (id) ON DELETE CASCADE,
  game_id        TEXT REFERENCES games (id) ON DELETE SET NULL,
  type           TEXT NOT NULL CHECK (type IN ('initial', 'purchase', 'game_entry', 'game_payout')),
  amount         BIGINT NOT NULL CHECK (amount <> 0),
  balance_after  BIGINT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX credit_transactions_player_idx ON credit_transactions (player_id, created_at);
CREATE INDEX credit_transactions_game_idx ON credit_transactions (game_id);
