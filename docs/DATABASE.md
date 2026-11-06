# Database

ComboCard salva giocatori, partite e movimenti di crediti in PostgreSQL.

## Perché PostgreSQL

Crediti e premi devono restare corretti anche in caso di errore: ogni movimento aggiorna saldo e registro nella stessa transazione. PostgreSQL offre transazioni e vincoli tra tabelle in modo diretto. La colonna `JSONB` tiene comunque lo stato flessibile della partita (mazzo, cartelle, collezioni), che è il motivo principale per cui si sarebbe scelto MongoDB.

Il client è `pg`, senza ORM: le query sono poche e stanno tutte in `backend/src/db/store.js`.

## Configurazione

| Variabile | Default | Descrizione |
|---|---|---|
| `DATABASE_URL` | nessuno | Stringa di connessione. Senza, i dati restano in memoria e si perdono al riavvio. |
| `DATABASE_POOL_MAX` | `10` | Numero massimo di connessioni nel pool. |
| `TEST_DATABASE_URL` | nessuno | Abilita i test di integrazione. **Cancellano le tabelle**: usa un database dedicato. |

Avvio in locale:

```bash
docker compose up -d
# in backend/.env
# DATABASE_URL=postgresql://combocard:combocard@localhost:5432/combocard
npm run dev
```

Se `DATABASE_URL` è impostata e il database non è raggiungibile all'avvio, il server si ferma con un errore invece di partire senza dati.

## Schema

| Tabella | Contenuto |
|---|---|
| `players` | Identità e saldo di ogni giocatore, e quando ha confermato di aver letto le regole (`rules_accepted_at`, vuoto finché non lo fa). |
| `games` | Stato completo della partita in `state`, più le colonne per filtrare (`status`, `is_private`). |
| `credit_transactions` | Un movimento per ogni variazione di crediti, con il saldo risultante. Il tipo è `initial`, `purchase` (Cassa), `game_entry`, `game_payout`, `admin_adjustment` (rettifica di un admin, con il motivo in `audit_log`) o `game_refund` (quota restituita quando un admin annulla una partita). |
| `user_accounts` | Nome utente, hash della password e ruolo di ogni account, `suspended_at` (nullo = attivo) e `session_version` (sale quando un admin sospende l'account o ne chiude le sessioni: i token firmati prima non valgono più). Vedi [AUTH.md](AUTH.md). |
| `refresh_tokens` | Hash dei refresh token attivi. Vedi [AUTH.md](AUTH.md). |
| `audit_log` | Registro delle azioni degli admin e del sistema: chi (`actor_type` `system` o `player`, `actor_id`), che cosa (`action`), su chi (`target_id`) e i dettagli (`details`). Si scrive nella stessa transazione della modifica che descrive e sopravvive ai giocatori (nessuna chiave esterna). Oggi registra i cambi di ruolo (`role_changed`), di nome utente (`username_changed`) le rettifiche dei crediti (`credits_adjusted`, con importo e motivo) le partite annullate (`game_cancelled`: `target_id` è la partita, con motivo e rimborsi), le sospensioni e riabilitazioni (`user_suspended`, `user_unsuspended`) e le sessioni chiuse (`sessions_revoked`), tutte con il motivo. |
| `schema_migrations` | Migrazioni già applicate. |

`players.credits` non scende mai sotto zero: lo garantisce il vincolo `players_credits_non_negative` (`CHECK (credits >= 0)`, migrazione 005) e ogni movimento di crediti è un `UPDATE … WHERE credits + importo >= 0`, quindi un addebito senza fondi non cambia nulla e fallisce con codice `INSUFFICIENT_CREDITS`. Se al momento della migrazione esistevano già saldi negativi, il vincolo non viene convalidato sulle righe vecchie (`NOT VALID`, perché la migrazione non deve impedire l'avvio): per cercarle `SELECT id, name, credits FROM players WHERE credits < 0;`, e dopo averle sistemate `ALTER TABLE players VALIDATE CONSTRAINT players_credits_non_negative;`. Una riga già negativa non si può aggiornare finché resta negativa.

`players.credits` è sempre la somma dei movimenti del giocatore. Questa query deve restituire zero righe:

```sql
SELECT p.id
FROM players p
LEFT JOIN credit_transactions t ON t.player_id = p.id
GROUP BY p.id, p.credits
HAVING p.credits <> COALESCE(SUM(t.amount), 0);
```

## Migrazioni

I file in `backend/db/migrations` vengono applicati in ordine di nome all'avvio del server, oppure con `npm --prefix backend run db:migrate`. Per cambiare lo schema aggiungi un nuovo file numerato: non modificare quelli già applicati.

## Come funziona

La logica di gioco continua a lavorare su `gameState` in memoria. All'avvio il server carica giocatori e partite attive; ogni modifica viene poi scritta anche sul database.

- **Partite terminate**: restano nel database e non vengono ricaricate in memoria. `GET /api/games/:gameId` le legge da lì.
- **Registrazioni e acquisti**: se la scrittura fallisce, la modifica viene annullata e l'API risponde `503`.
- **Partite in corso**: se la scrittura fallisce, il gioco continua. La modifica resta in attesa e viene ritentata ogni 5 secondi e alla chiusura del server.

`GET /api/health/detailed` riporta lo stato nel campo `database`. `pendingWrites` maggiore di zero indica scritture ancora in attesa.

### Limiti noti

- Il server deve essere uno solo: lo stato attivo vive nella memoria del processo.
- Se il processo si interrompe di colpo mentre il database è irraggiungibile, le scritture in attesa vanno perse.

## Verifica manuale

1. Avvia il server con `DATABASE_URL` impostata.
2. Registra due account con `POST /api/auth/register`, acquista crediti, crea una partita con `maxPlayers: 2` e fai entrare entrambi.
3. Estrai qualche carta con `POST /api/games/:gameId/draw`.
4. Ferma il server con `kill -9`, poi riavvialo.
5. Controlla che `GET /api/players/:playerId` e `GET /api/games/:gameId` restituiscano gli stessi dati, compreso il numero di carte estratte.
6. Estrai un'altra carta: la partita deve proseguire.
7. Esegui la query di controllo qui sopra: deve restituire zero righe.
