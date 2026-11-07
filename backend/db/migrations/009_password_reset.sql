-- Reimpostazione della password da parte di un admin.
--
-- must_change_password: l'admin ha dato una password provvisoria. Finché l'utente non ne sceglie una
-- sua, la sessione può solo cambiare la password (ogni altra route risponde 403 e non si apre il
-- tempo reale). Gli account esistenti partono da falso.

ALTER TABLE user_accounts
  ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT false;
