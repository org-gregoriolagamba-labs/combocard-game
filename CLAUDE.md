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

## Requisiti

- Playwright richiede Node.js 20 o superiore. Il campo `engines` dice `>=18`, ma con Node 18 i test e2e non partono.

## Regole di repository

- Non fare mai push diretto su `main` o `develop`. Lavora su un branch `feature/`, `bugfix/` o `hotfix/` e apri una PR. Dettagli in `CONTRIBUTING.md`.
- Non modificare i file `.env`: contengono segreti. Modifica `.env.example` se serve una nuova variabile.
