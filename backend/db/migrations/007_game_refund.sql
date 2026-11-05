-- Rimborso della quota d'ingresso quando un admin annulla una partita: un tipo di movimento a sé,
-- così nel registro dei movimenti si distingue da un premio. Chi l'ha annullata e perché stanno
-- nella riga 'game_cancelled' di audit_log.

ALTER TABLE credit_transactions DROP CONSTRAINT IF EXISTS credit_transactions_type_check;

ALTER TABLE credit_transactions
  ADD CONSTRAINT credit_transactions_type_check
  CHECK (type IN ('initial', 'purchase', 'game_entry', 'game_payout', 'admin_adjustment', 'game_refund'));
