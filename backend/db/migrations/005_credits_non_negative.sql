-- Il saldo di un giocatore non può scendere sotto zero: oltre ai controlli del gioco, lo garantisce
-- il database. Senza, una quota addebitata senza un controllo (o con due partite insieme) portava
-- il saldo in negativo e il debito non veniva mai riscosso.
--
-- Se nel database esistono già saldi negativi, il vincolo NON viene convalidato sulle righe
-- vecchie (la migrazione non deve impedire l'avvio del server): vale per ogni modifica da ora in
-- poi, e una riga già negativa non si può più aggiornare finché il saldo resta negativo.
-- Per cercarle: SELECT id, name, credits FROM players WHERE credits < 0;
-- Dopo averle sistemate: ALTER TABLE players VALIDATE CONSTRAINT players_credits_non_negative;

ALTER TABLE players
  ADD CONSTRAINT players_credits_non_negative CHECK (credits >= 0) NOT VALID;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM players WHERE credits < 0) THEN
    ALTER TABLE players VALIDATE CONSTRAINT players_credits_non_negative;
  END IF;
END $$;
