# ComboCard

Gioco di carte italiano multiplayer in tempo reale. Monorepo con tre pacchetti:
- `backend/`: Express e Socket.io
- `frontend/`: React (react-scripts, Redux Toolkit)
- `e2e/`: test end-to-end con Playwright

## Comandi

- Installazione completa: `npm run install:all`
- Sviluppo (backend e frontend insieme): `npm run dev`
- Test: `npm test` (backend e frontend). End-to-end: `npm run test:e2e`
- Lint: `npm run lint`. Correzione automatica: `npm run lint:fix`

Per un solo pacchetto usa `npm --prefix <pacchetto> <script>`.

## Persistenza

Ogni modifica a crediti o partite in `req.gameState` va salvata anche con `req.store`: i controller non devono lasciare modifiche solo in memoria. Dettagli in `docs/DATABASE.md`.

## Validazione

Ogni route che riceve un corpo lo valida con uno schema di `backend/src/validation/schemas.js`, applicato dal middleware `validate`.

## Requisiti

- Node.js 20.19 o superiore.

## Regole di repository

- Non fare mai push diretto su `main` o `develop`. Lavora su un branch `feature/`, `bugfix/` o `hotfix/` e apri una PR. Dettagli in `CONTRIBUTING.md`.
- Non modificare i file `.env`: contengono segreti. Modifica `.env.example` se serve una nuova variabile.
