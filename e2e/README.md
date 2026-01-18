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

## Running Specific Browsers

```bash
# Chromium only
npm run test:chromium

# Firefox only
npm run test:firefox

# WebKit (Safari) only
npm run test:webkit
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
