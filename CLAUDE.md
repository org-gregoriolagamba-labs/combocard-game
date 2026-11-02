# ComboCard

Gioco di carte italiano multiplayer in tempo reale. Monorepo con tre pacchetti:
- `backend/`: Express e Socket.io
- `frontend/`: React (Vite, Redux Toolkit)
- `e2e/`: test end-to-end con Playwright

## Comandi

- Installazione completa: `npm run install:all`
- Sviluppo (backend e frontend insieme): `npm run dev`
- Test: `npm test` (backend e frontend). End-to-end: `npm run test:e2e`
- Lint: `npm run lint`. Correzione automatica: `npm run lint:fix`

Per un solo pacchetto usa `npm --prefix <pacchetto> <script>`.

## Persistenza

Ogni modifica a crediti o partite in `req.gameState` va salvata anche con `req.store`: i controller non devono lasciare modifiche solo in memoria. Dettagli in `docs/DATABASE.md`.

## Autenticazione

Il giocatore di una richiesta è `req.auth.playerId`, preso dal token: non leggerlo mai dal corpo. Le nuove route di gioco restano dietro `requireAuth`. Dettagli in `docs/AUTH.md`.

## Visibilità

Un client riceve solo ciò che il suo giocatore può vedere: nessuna risposta o evento contiene `mazzo` o la cartella di un altro giocatore. Invia le partite con `gameViewFor` di `game.service.js`.

## Validazione

Ogni route che riceve un corpo lo valida con uno schema di `backend/src/validation/schemas.js`, applicato dal middleware `validate`.

## Requisiti

- Node.js 20.19 o superiore.

## Regole di repository

- Non fare mai push diretto su `main` o `develop`. Lavora su un branch `feature/`, `bugfix/` o `hotfix/` e apri una PR. Dettagli in `CONTRIBUTING.md`.
- Non modificare i file `.env`: contengono segreti. Modifica `.env.example` se serve una nuova variabile.
