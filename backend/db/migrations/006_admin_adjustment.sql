-- Rettifica dei crediti da parte di un admin: un tipo di movimento a sé, così nel registro dei
-- movimenti si distingue da un acquisto alla Cassa e da una quota o un premio di gioco.
-- Il motivo e chi l'ha fatta stanno nella riga corrispondente di audit_log.

ALTER TABLE credit_transactions DROP CONSTRAINT IF EXISTS credit_transactions_type_check;

ALTER TABLE credit_transactions
  ADD CONSTRAINT credit_transactions_type_check
  CHECK (type IN ('initial', 'purchase', 'game_entry', 'game_payout', 'admin_adjustment'));
