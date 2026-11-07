-- Sospensione degli account e chiusura delle sessioni.
--
-- suspended_at: da quando l'account è sospeso (nullo = attivo). Un account sospeso non entra e non
-- usa nessuna route, anche con un access token ancora valido: lo stato si rilegge a ogni richiesta.
--
-- session_version: l'access token porta la versione in cui è stato firmato. Quando l'admin chiude le
-- sessioni (o sospende l'account) la versione sale, e i token firmati prima non valgono più, senza
-- aspettare i 15 minuti della scadenza. Gli account esistenti partono da 0, come i token già emessi.

ALTER TABLE user_accounts
  ADD COLUMN suspended_at    TIMESTAMPTZ,
  ADD COLUMN session_version INTEGER NOT NULL DEFAULT 0;
