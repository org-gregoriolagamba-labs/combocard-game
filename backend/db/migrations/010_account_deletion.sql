-- Eliminazione di un account.
--
-- La riga di players resta, anonimizzata (nome "Utente eliminato"): così i movimenti di crediti restano
-- interi e la somma continua a tornare. deleted_at dice da quando; un giocatore eliminato non si
-- ricarica nel gioco all'avvio.
--
-- account_closed: il movimento che porta a zero il saldo residuo di un account eliminato (nessun
-- rimborso: i crediti non hanno valore reale). Chi l'ha eliminato e perché sta nella riga
-- 'user_deleted' di audit_log, che non contiene il nome utente.

ALTER TABLE players ADD COLUMN deleted_at TIMESTAMPTZ;

ALTER TABLE credit_transactions DROP CONSTRAINT IF EXISTS credit_transactions_type_check;

ALTER TABLE credit_transactions
  ADD CONSTRAINT credit_transactions_type_check
  CHECK (type IN ('initial', 'purchase', 'game_entry', 'game_payout', 'admin_adjustment', 'game_refund', 'account_closed'));
