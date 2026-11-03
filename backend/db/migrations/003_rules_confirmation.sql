-- Conferma delle regole: ogni giocatore deve dichiarare, la prima volta, di aver letto e compreso
-- le regole del gioco. Finché non lo fa, nessuna partita a cui partecipa può iniziare.
--
-- NULL = non ancora confermato. I giocatori già esistenti partono da NULL e confermano
-- al prossimo accesso.

ALTER TABLE players ADD COLUMN rules_accepted_at TIMESTAMPTZ;
