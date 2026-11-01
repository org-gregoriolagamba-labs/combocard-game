-- Autenticazione: account collegati ai giocatori e refresh token.
--
-- Gli account stanno in una tabella separata per non toccare i giocatori già
-- esistenti: possono avere nomi duplicati e non hanno una password.

CREATE TABLE user_accounts (
  player_id      TEXT PRIMARY KEY REFERENCES players (id) ON DELETE CASCADE,
  username       TEXT NOT NULL,
  -- Forma normalizzata del nome: rende "Anna" e "anna" lo stesso utente.
  username_key   TEXT NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  role           TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('player', 'admin')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Del refresh token si salva solo l'hash: chi legge il database non può usarlo.
-- Ogni login apre una "famiglia" di token, e ogni rinnovo ne aggiunge uno.
CREATE TABLE refresh_tokens (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  token_hash  TEXT NOT NULL UNIQUE,
  family_id   TEXT NOT NULL,
  player_id   TEXT NOT NULL REFERENCES players (id) ON DELETE CASCADE,
  expires_at  TIMESTAMPTZ NOT NULL,
  rotated_at  TIMESTAMPTZ,
  revoked_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX refresh_tokens_family_idx ON refresh_tokens (family_id);
CREATE INDEX refresh_tokens_player_idx ON refresh_tokens (player_id);
