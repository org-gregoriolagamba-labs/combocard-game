# Autenticazione

I giocatori accedono con nome utente e password. L'identità di ogni richiesta arriva solo dal token: un `playerId` nel corpo viene ignorato.

## Come funziona

| | Access token | Refresh token |
|---|---|---|
| **Formato** | JWT firmato (HS256) | Valore casuale |
| **Durata** | 15 minuti | 7 giorni, rinnovati a ogni uso |
| **Nel browser** | Solo in memoria | Cookie `HttpOnly`, valido solo per `/api/auth` |
| **Nel server** | Non salvato | Salvato solo come hash |
| **Revoca** | No, scade da solo | Sì, con il logout |

1. Registrazione o login restituiscono l'access token e impostano il cookie.
2. Ogni chiamata API invia `Authorization: Bearer <token>`.
3. Quando il token scade il server risponde `401`: il frontend lo rinnova e ripete la richiesta, senza che l'utente veda nulla.
4. Ricaricando la pagina il token in memoria si perde: il frontend ne ottiene uno nuovo dal cookie e riporta il giocatore nella partita in corso.

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

- **Nome utente:** da 3 a 30 caratteri tra lettere, numeri, spazi e `_ . -`. Maiuscole e minuscole contano come lo stesso nome.
- **Password:** da 8 a 128 caratteri, salvata con argon2id.
- **Tentativi:** al massimo 10 registrazioni e 10 login falliti al minuto per indirizzo IP.

Tutte le route di `/api/games` e `/api/players` richiedono il token. In particolare:

- `/api/players/:playerId` è accessibile solo al giocatore stesso;
- `GET /api/games/:gameId` è accessibile solo a chi ha creato la partita e ai suoi giocatori;
- avviare la partita ed estrarre carte spetta solo al primo giocatore della partita.

Sono state rimosse `POST /api/players/register` e `GET /api/players`.

### Socket.IO

La connessione richiede un access token valido in `auth.token`. Il server fa entrare un giocatore solo nelle stanze delle sue partite. Una connessione già aperta non viene chiusa alla scadenza del token: il token viene ricontrollato alla connessione successiva.

## Ruoli

Ogni account ha un ruolo: `player` (il giocatore normale, chiamato "user" nei testi di prodotto) oppure `admin`. Alla registrazione il ruolo è sempre `player`. Un admin gioca come qualsiasi giocatore, con le stesse regole e la stessa visibilità delle partite: l'amministrazione è una sezione in più, non un vantaggio nel gioco.

- **Il ruolo nel token non decide nulla.** L'access token dura 15 minuti e non si può revocare: un admin declassato sarebbe rimasto admin fino alla scadenza. `requireAuth` mette il ruolo del token in `req.auth.role` solo come informazione. Le route riservate usano `requireRole('admin')`, che legge il ruolo dal database a ogni richiesta: chi viene declassato perde i privilegi alla richiesta successiva, e chi viene promosso li ha subito, senza rifare il login. Il ruolo non si legge mai dal corpo, dalla query o dalle intestazioni.
- **`/api/admin`.** Il router parte con `requireAuth` e poi `requireRole('admin')`, per tutte le sue route (un test controlla che una route aggiunta dopo non possa saltarli). Oggi c'è solo `GET /api/admin/status`: `401` senza token, `403` per un `player`, `200` con `{ admin: true }` per un admin.
- **Non si può togliere il ruolo all'ultimo admin.** La regola vale anche per due richieste nello stesso istante.
- **Registro delle azioni.** Ogni cambio di ruolo scrive una riga in `audit_log` (chi, quando, su chi, ruolo prima e dopo), nella stessa transazione del cambio. Un cambio rifiutato non lascia nessuna riga.

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

- L'unica route riservata agli admin è `GET /api/admin/status`: l'elenco degli utenti e le altre funzioni di amministrazione sono ancora da fare.
- Non esistono ancora il recupero della password e la verifica dell'email.
