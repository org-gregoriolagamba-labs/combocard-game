# Autenticazione

I giocatori accedono con nome utente e password. L'identità di ogni richiesta arriva solo dal token: un `playerId` nel corpo viene ignorato.

## Come funziona

| | Access token | Refresh token |
|---|---|---|
| **Formato** | JWT firmato (HS256) | Valore casuale |
| **Durata** | 15 minuti | 7 giorni, rinnovati a ogni uso |
| **Nel browser** | Solo in memoria | Cookie `HttpOnly`, valido solo per `/api/auth` |
| **Nel server** | Non salvato | Salvato solo come hash |
| **Revoca** | Sì, con la versione delle sessioni (vedi sotto); altrimenti scade da solo | Sì, con il logout o per mano di un admin |

1. Registrazione o login restituiscono l'access token e impostano il cookie.
2. Ogni chiamata API invia `Authorization: Bearer <token>`.
3. Quando il token scade il server risponde `401`: il frontend lo rinnova e ripete la richiesta, senza che l'utente veda nulla.
4. Ricaricando la pagina il token in memoria si perde: il frontend ne ottiene uno nuovo dal cookie e riporta il giocatore nella partita in corso.

### Eliminazione di un account

Si elimina un account per le richieste di cancellazione dei dati, gli abusi o gli account di prova. Che cosa resta e che cosa no è stato deciso nella #97:

- **Va via:** l'account (nome utente e password), i refresh token e il ruolo. Il nome utente si libera subito. Le connessioni dell'utente si chiudono (`sessionEnded` con `reason: "deleted"`).
- **Resta, anonimizzato:** la riga di `players` (nome «Utente eliminato», `deleted_at`) e **tutti i movimenti di crediti**, così la somma dei movimenti continua a tornare. Il saldo residuo si chiude con un movimento `account_closed` negativo, senza rimborso: i crediti non hanno valore reale.
- **Partite finite:** nello stato di ogni partita finita in cui ha giocato il nome diventa «Utente eliminato»; l'id resta, ma non identifica più nessuno perché la riga di `players` è anonima.
- **Registro:** le righe precedenti che nominano l'utente restano (hanno solo id), ma i nomi nei `username_changed` si riscrivono. La riga `user_deleted` ha id, ruolo, motivo e se l'ha fatto l'utente stesso (`self`), **mai il nome utente**.
- **Regole:** non si elimina l'ultimo admin attivo (conta chi è admin e non è sospeso, anche con due richieste insieme) né chi è in una partita in attesa o in corso (`409`: prima si annulla la partita, o l'utente la lascia). Un admin non elimina sé stesso dall'area di amministrazione.
- **Atomicità:** tutto avviene in un'unica transazione, dopo aver scritto ciò che le partite avevano ancora in coda; se il database non risponde non cambia nulla (`503`). Mentre la cancellazione è in corso il token dell'utente non è accettato, così non può entrare in una partita nel frattempo.
- **Schermata:** nella scheda Utenti, in «Accesso», «Elimina l'account» apre una finestra che dice che l'azione non si annulla, chiede il motivo e il nome utente scritto a mano (il pulsante resta spento finché non coincide). L'utente connesso torna al login con l'avviso «Il tuo account è stato eliminato»; l'errore per un utente in partita o per l'ultimo admin è spiegato nella finestra. Nel Registro compare come «ha eliminato un account: «motivo»», senza il nome.
- **Limite noto:** una richiesta già in corso che aggiunge crediti (per esempio la Cassa) nel momento esatto della cancellazione potrebbe lasciare un saldo sulla riga anonima; il caso richiede due richieste dello stesso utente in contemporanea con la cancellazione.

### Password provvisoria

Quando un admin reimposta una password (`POST /api/admin/users/:playerId/password/reset`, con motivo) il server genera una password provvisoria casuale (tre gruppi di quattro caratteri senza lettere ambigue, circa 59 bit, con un generatore sicuro) e la risponde **una sola volta** all'admin, con `Cache-Control: no-store`. Non finisce mai nel registro, nei log né in nessuna risposta successiva: del registro resta chi, per chi e perché (`password_reset`); del cambio resta chi e quando (`password_changed`), mai la password né l'hash. Un admin non può reimpostare la propria password (`409`).

- L'account ha `must_change_password`: la vecchia password non vale più, le sue sessioni si chiudono (versione delle sessioni e refresh token, come nella sospensione) e le sue connessioni vengono chiuse.
- Con la password provvisoria il login riesce e risponde `mustChangePassword: true` (come il rinnovo della sessione), ma **ogni altra route risponde `403 You must change your password first`** e il tempo reale rifiuta la connessione: l'unica route aperta è `POST /api/auth/password`, con `requireAuthToChangePassword`.
- Il frontend mostra solo la schermata "Scegli una nuova password" (prima anche delle regole) e non apre il socket: i tentativi rifiutati rinnoverebbero la sessione e si scontrerebbero con il cambio.
- Cambiata la password, l'obbligo cade e la sessione nuova è quella normale. Lo stesso percorso serve a chi vuole cambiare la propria password senza reset (il frontend non ha ancora una schermata per questo) e potrà servire al recupero della #44.

### Sospensione e chiusura delle sessioni

L'access token porta la **versione delle sessioni** dell'account (`sv`, 0 per i token emessi prima della migrazione 008). A **ogni richiesta** e a ogni connessione Socket.IO il server rilegge l'account dal database e rifiuta il token con `401` se l'account è sospeso, se non esiste più o se la versione è cambiata. Una lettura per chiave primaria a richiesta: il ruolo che arriva in `req.auth.role` è quello dell'account adesso, non quello scritto nel token.

- **Sospensione** (`suspended_at`): l'utente non fa login (`403 This account is suspended`, detto solo dopo la password giusta, così non rivela quali nomi esistono), non rinnova la sessione (`401`) e perde l'accesso alla richiesta successiva anche con un token ancora valido. Sospendere sale la versione e revoca tutti i refresh token dell'account.
- **Chiusura delle sessioni**: sale la versione e revoca i refresh token, senza sospendere. L'utente rifà il login con la sua password.
- Alle sue connessioni Socket.IO arriva `sessionEnded` `{ reason: "suspended" | "revoked" }` e subito dopo vengono chiuse. Il frontend riporta il giocatore alla schermata iniziale con l'avviso.
- Una partita in corso di un utente sospeso resta com'è: l'admin può annullarla (con rimborso), oppure l'utente la ritrova se viene riabilitato.

### Rotazione del refresh token

Ogni rinnovo sostituisce il refresh token con uno nuovo, e ogni login apre una "famiglia" di token.

Se arriva un token già sostituito da più di 10 secondi, forse è stato rubato: l'intera famiglia viene revocata e bisogna rifare il login. Nei primi 10 secondi viene accettato, perché può capitare normalmente con due schede che rinnovano insieme. Il logout revoca solo la famiglia di quel dispositivo.

## API

| Route | Accesso | Descrizione |
|---|---|---|
| `POST /api/auth/register` | Pubblico | `{ username, password }`. Risponde `409` se il nome è già in uso |
| `POST /api/auth/login` | Pubblico | `{ username, password }`. Stesso `401` per password errata e utente inesistente |
| `POST /api/auth/refresh` | Cookie | Nuovo access token. Senza cookie risponde `200` con valori `null` |
| `POST /api/auth/logout` | Cookie | Chiude la sessione su questo dispositivo |
| `POST /api/auth/password` | Token (anche con password provvisoria) | `{ currentPassword, newPassword }` (8–128 caratteri, diversa dalla attuale). Controlla di nuovo la password attuale (`400` se è sbagliata: non `401`, che il frontend prenderebbe per una sessione scaduta), chiude **tutte** le sessioni e ne apre una nuova per questo dispositivo: risponde come il login. Limite di tentativi come il login |

- **Nome utente:** da 3 a 30 caratteri tra lettere, numeri, spazi e `_ . -`. Maiuscole e minuscole contano come lo stesso nome.
- **Password:** da 8 a 128 caratteri, salvata con argon2id.
- **Tentativi:** al massimo 10 registrazioni e 10 login falliti al minuto per indirizzo IP.

Tutte le route di `/api/games` e `/api/players` richiedono il token. In particolare:

- `/api/players/:playerId` è accessibile solo al giocatore stesso;
- `GET /api/games/:gameId` è accessibile solo a chi ha creato la partita e ai suoi giocatori;
- avviare la partita ed estrarre carte spetta solo al primo giocatore della partita.

Sono state rimosse `POST /api/players/register` e `GET /api/players`.

### Socket.IO

La connessione richiede un access token valido in `auth.token`. Il server fa entrare un giocatore solo nelle stanze delle sue partite. Una connessione già aperta non viene chiusa alla scadenza del token: il token viene ricontrollato alla connessione successiva. Un account sospeso, o le cui sessioni sono state chiuse, non si connette (il token si ricontrolla sul database), e le connessioni già aperte vengono chiuse quando l'admin agisce.

## Ruoli

Ogni account ha un ruolo: `player` (il giocatore normale, chiamato "user" nei testi di prodotto) oppure `admin`. Alla registrazione il ruolo è sempre `player`. Un admin gioca come qualsiasi giocatore, con le stesse regole e la stessa visibilità delle partite: l'amministrazione è una sezione in più, non un vantaggio nel gioco.

- **Il ruolo nel token non decide nulla.** L'access token dura 15 minuti e non si può revocare: un admin declassato sarebbe rimasto admin fino alla scadenza. `requireAuth` rilegge l'account a ogni richiesta (vedi "Sospensione e chiusura delle sessioni") e mette in `req.auth.role` il ruolo di adesso. Le route riservate usano `requireRole('admin')`, che legge il ruolo dal database a ogni richiesta: chi viene declassato perde i privilegi alla richiesta successiva, e chi viene promosso li ha subito, senza rifare il login. Il ruolo non si legge mai dal corpo, dalla query o dalle intestazioni.
- **`/api/admin`.** Il router parte con `requireAuth` e poi `requireRole('admin')`, per tutte le sue route (un test controlla che una route aggiunta dopo non possa saltarli). Con un token mancante la risposta è `401`, per un `player` `403`, per un admin `200` (le route sono nella tabella sotto).
- **Non si può togliere il ruolo né sospendere l'ultimo admin.** Conta chi è admin e non è sospeso. La regola vale anche per due richieste nello stesso istante.
- **Registro delle azioni.** Ogni cambio di ruolo scrive una riga in `audit_log` (chi, quando, su chi, ruolo prima e dopo), nella stessa transazione del cambio. Un cambio rifiutato non lascia nessuna riga.

### Il ruolo nelle risposte, e la schermata

La registrazione, il login e il rinnovo rispondono con `{ accessToken, player, role }`: il ruolo sta **accanto** al giocatore e non dentro (il giocatore è ciò che il gioco mostra), ed è sempre e solo quello di chi fa la richiesta. Senza sessione il rinnovo risponde `role: null`.

Il frontend lo tiene in `state.player.role` e lo usa soltanto per decidere cosa **mostrare**: il pulsante "Amministrazione" nella hall compare solo a un admin, e la schermata (`ui.currentScreen === "admin"`) si apre solo se il ruolo è `admin`. Chi decide cosa è permesso resta il server: una richiesta rifiutata con `403` riporta il giocatore alla hall come giocatore, con un avviso. Un admin che si declassa da solo esce subito dall'area. Il ruolo cambia nel client al login o al rinnovo successivo, quindi un utente appena promosso lo vede al prossimo accesso.

### Le route di amministrazione

| Route | Cosa fa |
|---|---|
| `GET /api/admin/status` | `{ admin: true }`: serve a sapere se si è admin |
| `GET /api/admin/users?q=&role=&page=&limit=` | Utenti registrati, per nome, con totale. `q` è una parte del nome (senza badare alle maiuscole), `limit` al massimo 100. Mai l'hash della password. |
| `GET /api/admin/users/:playerId` | Un utente: nome, ruolo, crediti, data di registrazione, `inGame` |
| `PATCH /api/admin/users/:playerId` | `{ username }` **oppure** `{ role }`, uno alla volta. Il nome non può cambiare se il giocatore è in una partita non finita (`409`) né essere già in uso (`409`); il ruolo segue la regola dell'ultimo admin (`409`) |
| `POST /api/admin/users/:playerId/credits` | `{ amount, reason }`: accredito (positivo) o addebito (negativo), da 1 a 1.000.000, **con un motivo obbligatorio** (fino a 200 caratteri). Il saldo non scende mai sotto zero (`409`). Il giocatore vede il nuovo saldo subito (evento `gettoniAggiornati`) |
| `POST /api/admin/users/:playerId/suspend` | `{ reason }` (obbligatorio, fino a 200 caratteri): sospende l'utente e chiude le sue sessioni e connessioni (`404` se non esiste, `409` se sei tu o l'ultimo admin attivo). Risponde con l'utente (`suspended: true`) |
| `POST /api/admin/users/:playerId/unsuspend` | `{ reason }`: riabilita l'utente, che rientra con la sua password |
| `POST /api/admin/users/:playerId/sessions/revoke` | `{ reason }`: chiude tutte le sessioni dell'utente senza sospenderlo |
| `DELETE /api/admin/users/:playerId` | `{ reason }` (obbligatorio): elimina l'account, **senza ritorno** (vedi "Eliminazione di un account"). `404` se non esiste, `409` se sei tu, se è l'ultimo admin attivo o se sta giocando una partita in attesa o in corso. Risponde `{ playerId, credits }` (il saldo che è stato chiuso) |
| `POST /api/admin/users/:playerId/password/reset` | `{ reason }`: reimposta la password (vedi "Password provvisoria"). Risponde `{ user, temporaryPassword }` (`404` se non esiste, `409` se sei tu) |
| `GET /api/admin/games?status=&page=&limit=` | Le partite in attesa o in corso, dalla più vecchia, **solo metadati**: id, stato, quota, massimo di giocatori, montepremi, data e nomi dei giocatori. Mai `mazzo`, cartelle, carte estratte né saldi. L'id di una partita privata è il suo codice: l'admin lo vede |
| `POST /api/admin/games/:gameId/cancel` | `{ reason }` (obbligatorio, fino a 200 caratteri): annulla una partita in attesa o in corso (`404` se non esiste, `409` se è già finita). Se era in corso, ogni giocatore **ancora presente** riceve la quota d'ingresso (`game_refund`); i premi già assegnati ma non ancora accreditati si perdono, perché la partita conta come mai giocata. Chi l'aveva lasciata ha già perso la quota e non è rimborsato. I giocatori ricevono `gameCancelled` `{ gameId, gettoni, refund }` |
| `GET /api/admin/stats` | Numeri della piattaforma, senza nomi: utenti registrati, in partita ora e admin; partite in attesa, in corso, finite e annullate; crediti in circolazione e nel montepremi delle partite in corso; montepremi distribuiti |
| `GET /api/admin/audit?targetId=&page=&limit=` | Il registro delle azioni, dalla più recente, filtrabile per utente |

- Chi agisce è sempre l'admin del token: un `actor` scritto nel corpo viene ignorato, come ogni campo sconosciuto.
- **Un admin può rettificare anche i propri crediti** e quelli di altri admin, sempre con motivo e traccia (nel registro attore e bersaglio coincidono). Il divieto di accreditarsi da soli non protegge nulla finché la Cassa dà crediti gratis a chiunque: da rivedere se i crediti avranno mai un valore reale.
- Sospensione, riabilitazione e chiusura delle sessioni cambiano l'account e scrivono la riga di audit (`user_suspended`, `user_unsuspended`, `sessions_revoked`, con il motivo) in un'unica transazione; se il database non risponde non cambia nulla e la risposta è `503`.
- L'annullamento di una partita rimborsa, toglie la partita e scrive la riga `game_cancelled` (con motivo e rimborsi) in un'unica transazione, dopo aver scritto ciò che la partita aveva ancora in coda; se il database non risponde, la partita e i crediti tornano come prima e la risposta è `503`.
- Una rettifica aggiorna i crediti in memoria del server e scrive in un'unica transazione il movimento (`admin_adjustment`) e la riga di audit; se il database non risponde, i crediti tornano come prima e la risposta è `503`.

### Creare il primo admin

Nessuna route crea un admin: si fa dal terminale del server, con lo script `admin:promote`, che usa il `DATABASE_URL` del `.env` del backend.

```bash
npm --prefix backend run admin:promote -- <nome utente>
npm --prefix backend run admin:promote -- --demote <nome utente>
```

1. L'utente si registra normalmente sul sito.
2. L'operatore lancia lo script sul server. Con Docker: `docker compose exec backend npm run admin:promote -- <nome utente>`.
3. Lo script risponde `<nome> is now an admin.` (oppure `is already an admin.` se lo era). Il token già in uso funziona subito, senza rifare il login.

Lo script esce con `0` se è andato a buon fine, `1` se l'utente non esiste, se manca `DATABASE_URL`, se il database non è aggiornato (`npm run db:migrate`) o se si tenta di togliere il ruolo all'ultimo admin, `2` se gli argomenti sono sbagliati. Non stampa password né hash. Il registro delle azioni lo segna come eseguito dal sistema. È anche l'uscita di emergenza: se non resta nessun admin, si promuove un utente con lo stesso comando. Richiede PostgreSQL: senza `DATABASE_URL` gli account sono in memoria e nessuno è admin.

## Configurazione

| Variabile | Default | Descrizione |
|---|---|---|
| `JWT_SECRET` | casuale fuori produzione | **Obbligatoria in produzione**, almeno 32 caratteri. Senza, il server non parte. Si genera con `openssl rand -hex 48` |
| `ACCESS_TOKEN_TTL_SECONDS` | `900` | Durata dell'access token |
| `REFRESH_TOKEN_TTL_DAYS` | `7` | Durata del refresh token |
| `REFRESH_REUSE_GRACE_SECONDS` | `10` | Tempo in cui un refresh token già sostituito viene accettato |
| `COOKIE_SECURE` | `true` in produzione | Invia il cookie solo su HTTPS |
| `COOKIE_SAMESITE` | `strict` | Usa `none`, con `COOKIE_SECURE=true`, solo se frontend e backend stanno su domini diversi |
| `TRUST_PROXY` | `0` | Numero di reverse proxy davanti al server. Serve per riconoscere l'IP reale nei limiti di tentativi |

Fuori produzione, senza `JWT_SECRET` ne viene generato uno a ogni avvio: gli access token smettono di valere al riavvio, ma il frontend li rinnova da solo.

Cambiare `JWT_SECRET` in produzione invalida tutti gli access token. I refresh token continuano a funzionare.

**In produzione serve HTTPS.** Con `COOKIE_SECURE=true` su HTTP il browser scarta il cookie, e ricaricando la pagina bisogna rifare il login. Per provare il build di produzione in locale o in rete senza HTTPS, imposta `COOKIE_SECURE=false`.

## Giocatori già esistenti

I giocatori creati prima dell'autenticazione non hanno un account e nessuno può più accedervi. Restano nel database con i loro crediti e movimenti, senza effetti sui nuovi account. Registrandosi con lo stesso nome si crea un nuovo giocatore.

Senza `DATABASE_URL` anche gli account stanno in memoria e si perdono al riavvio.

## Limiti noti

- La sospensione di un utente, la chiusura delle sue sessioni, la reimpostazione della password e la gestione delle partite sono ancora da fare (#71, #72).
- Non esistono ancora il recupero della password e la verifica dell'email.
