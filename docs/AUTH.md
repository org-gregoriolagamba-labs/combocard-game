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

- I ruoli sono predisposti (`role` in `user_accounts` e nel token), ma oggi nessuna route li usa.
- Non esistono ancora il recupero della password e la verifica dell'email.
