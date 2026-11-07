# E2E Tests

End-to-end tests for ComboCard Game using Playwright.

## Prerequisites

- Node.js 18+
- Backend server running on port 3001
- Frontend server running on port 3000

## Setup

```bash
# Install dependencies
npm install

# Install Playwright browsers
npm run install-browsers
```

## Installazione dei browser in CI

I job end-to-end installano i browser con `.github/scripts/install-playwright.sh`, che chiama `playwright install --with-deps`:

- **Limite di tempo e tentativi:** ogni tentativo ha un limite di 4 minuti e si riprova fino a 3 volte; se il mirror dei pacchetti non risponde, il job fallisce in circa 13 minuti con un errore chiaro (`Playwright could not be installed…`) invece di restare fermo fino ai 30 minuti del job. Il passo ha anche un limite di 15 minuti.
- **apt:** lo script imposta anche un timeout di 30 secondi e 3 tentativi sulle connessioni di apt, così un mirror lentissimo viene abbandonato.
- **Cache dei browser:** `~/.cache/ms-playwright` è in cache con chiave sulla versione di `@playwright/test` (e sul tipo di job: tutti i browser o solo Chromium). Con la cache calda i browser non si scaricano di nuovo; restano i pacchetti di sistema. Aggiornando Playwright la chiave cambia e la cache si rifà da sola.
- Se il problema si ripresenta spesso, l'alternativa è l'immagine `mcr.microsoft.com/playwright` (vedi la #95).

## Running Tests

```bash
# Run all tests
npm test

# Run tests in headed mode (with browser visible)
npm run test:headed

# Run tests with UI mode (interactive)
npm run test:ui

# Run tests in debug mode
npm run test:debug

# Run only smoke tests
npm run test:smoke

# Run only critical tests
npm run test:critical
```

### Backend rate limiting for E2E
E2E suites can generate many requests from the same IP. To avoid 429 responses
when running against a real backend, start it with rate limiting disabled:

```bash
# From repo root
npm run start:backend:e2e
```

Alternatively, set `RATE_LIMIT_DISABLED=true` in the backend environment.

## Running Specific Browsers

```bash
# Chromium only
npm run test:chromium

# Firefox only
npm run test:firefox

# WebKit (Safari) only
npm run test:webkit
```

### Fast feedback (recommended locally)
The full Playwright configuration defines multiple projects (desktop + mobile). For quicker local runs,
prefer running Chromium only:

```bash
npm run test:chromium
```

## Viewing Reports

```bash
# Open HTML report
npm run report
```

## Code Generation

```bash
# Generate test code by recording actions
npm run codegen
```

## Test Structure

```
tests/
├── global.setup.js      # Global setup (runs once before all tests)
├── fixtures/            # Custom fixtures and utilities
├── ui/                  # UI tests
│   ├── home.spec.js     # Homepage tests
│   └── game.spec.js     # Game flow tests
└── api/                 # API tests
    └── health.spec.js   # Health endpoint tests
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

- `E2E_BASE_URL`: Frontend URL (default: http://localhost:3000)
- `E2E_API_URL`: Backend API URL (default: http://localhost:3001)
- `E2E_TEST_USER_NAME`: Test player name
