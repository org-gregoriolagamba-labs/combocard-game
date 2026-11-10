# Combocard Game - Test Suite

Tre livelli di test: unitari e di integrazione del backend, test dei componenti del frontend, test end-to-end con Playwright.

I numeri sotto sono quelli dell'ultima verifica (versione 2.5.0) e cambiano a ogni attività: per quelli aggiornati esegui i comandi, oppure guarda l'ultima esecuzione della CI.

| Livello | Strumento | Test (2.5.0) | Comando |
|---------|-----------|--------------|---------|
| Backend | Jest | 747 (con il database) | `npm run test:backend` |
| Frontend | Vitest + Testing Library | 691 | `npm run test:frontend` |
| End-to-end | Playwright | 84 per progetto | `npm run test:e2e` |

Senza `TEST_DATABASE_URL` i test del backend che hanno bisogno di PostgreSQL vengono saltati, quindi il totale è più basso.

## Struttura

```
combocard-game/
├── backend/__tests__/
│   ├── controllers/   # HTTP: autorizzazioni, visibilità, crediti, jolly, turni di estrazione, suoni, storico
│   ├── db/            # store (memoria e PostgreSQL), migrazioni, storico e statistiche, script admin
│   ├── middleware/    # autenticazione, limiti di richieste
│   ├── routes/        # route admin e auth
│   ├── services/      # regole di gioco, jolly, premi, giocatori, area admin, sessioni
│   ├── utils/         # carte e cartelle, errori, risposte, CORS
│   └── validation/    # schemi Joi
│
├── frontend/src/__tests__/
│   ├── components/    # schermate e componenti (cartella, zoom, barra azioni, storico…)
│   ├── hooks/         # socket, segnali di turno
│   └── pages/  services/  store/  utils/  config/
│
└── e2e/tests/
    ├── api/           # le API contro un server vero (partite, collezioni, area admin, storico…)
    ├── ui/            # i flussi nel browser (telefono incluso)
    ├── fixtures/ helpers/
    └── global.setup.js
```

## Cosa coprono

- **Collezioni e cartella.** Tris, Sequenza, Scopa, Napola e Combocard Reale; ogni cartella deve permettere tutte le collezioni; i contatori di avanzamento (righe, colonne, sequenza con i vuoti) e il loro tetto.
- **Jolly.** Dichiarazione, pausa delle estrazioni, scelta della carta, rifiuto di una carta già nella cartella, annullamento e scadenza.
- **Estrazione a turni.** Giro dei giocatori, attesa tra le estrazioni, tempo limite, cartellino giallo e rosso, giocatori scollegati, riarmo dei timer all'avvio.
- **Partite.** Creazione (anche privata, con codice), ingresso, avvio automatico a tavolo pieno, uscita, regole da confermare, una partita alla volta.
- **Crediti e premi.** Acquisto, quote d'ingresso, premi per collezione, premi non assegnati, rimborsi.
- **Visibilità.** Nessuna risposta o evento contiene il mazzo o la cartella di un altro giocatore.
- **Account e area admin.** Registrazione, sessioni, cambio e reimpostazione della password, sospensione, eliminazione, ruoli, registro delle azioni.
- **Storico e statistiche personali.** `GET /api/me/movements` e `GET /api/me/stats`.
- **Interfaccia.** Schermate strette (320, 360 e 390 px), zoom delle carte, suoni, contrasto dei colori, segni di avanzamento.

## Come si eseguono

### Backend

```bash
npm run test:backend
# un solo file
npm --prefix backend test -- __tests__/services/jolly.service.test.js
# copertura
npm --prefix backend test -- --coverage
```

Usa sempre `npm --prefix backend test` e non `npx jest` da solo: lo script imposta ciò che serve a Jest per i moduli ES.

I test d'integrazione con PostgreSQL partono solo se è impostato `TEST_DATABASE_URL`. **Cancellano e ricreano le tabelle**: usa un database dedicato ai test (mai quello di sviluppo).

```bash
TEST_DATABASE_URL=postgresql://combocard:combocard@127.0.0.1:5432/combocard_test npm run test:backend
```

Le suite che usano il database girano in parallelo. Una lo fa in uno schema suo (`store.history.test.js`, schema `test_history`) per non cancellare le tabelle delle altre.

### Frontend

```bash
npm run test:frontend
# un solo file
npm --prefix frontend run test:run -- src/__tests__/components/Cartella.test.jsx
```

### End-to-end

I test e2e **non avviano i server da soli**: servono backend e frontend già in esecuzione.

```bash
# terminale 1: backend senza limite di richieste (i test fanno molte chiamate)
RATE_LIMIT_DISABLED=true npm run dev:backend
# terminale 2: frontend
npm run dev:frontend
# terminale 3: test
npm run test:e2e
```

```bash
npm --prefix e2e run test:smoke        # solo i test marcati @smoke
npm --prefix e2e run test:chromium     # un solo browser (anche test:firefox, test:webkit)
npm --prefix e2e run test:headed       # con il browser visibile
npm --prefix e2e run test:ui           # interfaccia di Playwright
npm --prefix e2e test -- -g "nome del test"
```

I progetti Playwright sono chromium, firefox, webkit, mobile-chrome e mobile-safari. In locale spesso sono installati solo alcuni: gli altri girano in CI.

Variabili dei test e2e:

```env
E2E_BASE_URL=http://localhost:3000
E2E_API_URL=http://localhost:3001
# Facoltativa: il database PostgreSQL usato dal server sotto test. Senza, i test dell'area admin
# (i file `admin-*.spec.js`, `admin.spec.js` e le schermate admin) vengono saltati: un admin si può
# creare solo su un database, con `npm run admin:promote`. In CI il job e2e avvia un PostgreSQL e la imposta.
E2E_DATABASE_URL=postgresql://combocard:combocard@localhost:5432/combocard_e2e
```

Nella cartella `e2e/tests/ui/` due file finiscono in `.disabled` (`game-flow-complete`, `game`): non girano.

## Dati di prova

I test creano da soli giocatori con nomi univoci e partite proprie: possono girare in parallelo. Le richieste di gioco usano il token dell'account di prova (`Authorization: Bearer …`); il giocatore non si manda mai nel corpo. Gli helper stanno in `e2e/tests/helpers/` e le fixture in `e2e/tests/fixtures/`.

## Integrazione continua

La CI (`.github/workflows/`) esegue su ogni PR: lint, test del backend con PostgreSQL, test del frontend, build, controllo delle dipendenze (`npm audit`) e test e2e (nel flusso e2e un controllo rapido `@smoke` su chromium e poi la suite completa).

## Quando aggiungi una funzione

1. Test unitari per la logica del servizio.
2. Test delle API (controller e, se serve, e2e).
3. Test dell'interfaccia per il flusso dell'utente.
4. Aggiorna questo file solo se cambia la struttura o il modo di eseguire i test.

Prima di aprire una PR: `npm test` (backend e frontend) e `npm run lint`.
