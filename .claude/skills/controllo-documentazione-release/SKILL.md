---
name: controllo-documentazione-release
description: Usa prima di pubblicare una release, o quando serve sapere se i documenti dicono la verità sul codice (README, GAME_DESIGN, DEPLOYMENT, AUTH, DATABASE, TEST_SUITE, CONTRIBUTING, README dei pacchetti). Sintomi, documenti che citano rotte, variabili, script o percentuali che non esistono più.
---

# controllo-documentazione-release

I documenti restano indietro in silenzio: a ogni versione qualcosa cambia nel codice e nessuno riapre il testo. Il controllo ha **due livelli**: uno script rileva ciò che si confronta a macchina, la rilettura rileva il resto. Il primo non sostituisce la seconda.

## Quando usarla

- È il passo «Revisione della documentazione» di «Pubblicare una release» in `CONTRIBUTING.md`: **prima** del bump di versione.
- Un utente chiede se i documenti sono aggiornati.
- Non serve per scrivere un documento nuovo o correggere un refuso in un file solo.

## Passi

1. **Script.** Dalla radice del repository:
   ```bash
   node .claude/skills/controllo-documentazione-release/scripts/check-docs.mjs
   ```
   Corregge i **documenti**, non il codice. Ogni `ERRORE` va risolto; ogni `AVVISO` va letto e corretto o motivato nel rapporto. Se un allarme è falso, correggi lo script e dillo: non ignorarlo in silenzio.
2. **Rilettura.** Per ogni documento elencato dallo script leggi ciò che la macchina non vede:

   | Documento | Rileggi contro |
   |-----------|----------------|
   | `docs/GAME_DESIGN.md` | regole e flussi: `backend/src/services/`, schermate di `frontend/src/` |
   | `README.md` | funzioni elencate, avvio, requisiti |
   | `docs/AUTH.md` | autorizzazioni, durata dei token, cosa può fare un admin |
   | `docs/DATABASE.md` | colonne e tipi di movimento in `backend/db/migrations/` e `store.js` |
   | `docs/DEPLOYMENT.md` | passi di aggiornamento, migrazioni nuove, variabili da impostare |
   | `TEST_SUITE.md` | numeri: lancia `npm test` (con `TEST_DATABASE_URL`) ed e2e, confronta |
   | `CONTRIBUTING.md`, README dei pacchetti | il processo scritto è quello che si segue |
3. **Rapporto.** Scrivi: errori corretti, avvisi (corretti o motivati), **documenti non riletti per intero** (o «nessuno»), file toccati. Il rapporto va nella sezione «Da sapere» della PR della release.

## Che cosa controlla lo script

| Controllo | Errore se |
|-----------|-----------|
| Rotte | una rotta del codice non è in nessun documento, o un documento cita una rotta che non esiste (le righe che dicono «rimossa» sono escluse) |
| Eventi socket | un `emit` del backend non è in nessun documento |
| Variabili d'ambiente | (avviso) una variabile letta dal codice manca in `.env.example`, o un documento ne cita una che nessun codice legge |
| Premi | la percentuale di README o GAME_DESIGN non è quella di `config/index.js` |
| Librerie | (avviso) un documento cita una libreria che non è una dipendenza |
| Script npm | `npm run X` non esiste in nessun `package.json` (con `--prefix`, in quello indicato) |
| Percorsi e collegamenti | un collegamento non porta a un file; (avviso) un percorso citato non esiste e non è ignorato da git |
| Tabelle | una tabella delle migrazioni non è in `DATABASE.md` |
| Versioni | (avviso) i quattro pacchetti hanno versioni diverse |

## Scuse da non accettare

| Scusa | Realtà |
|-------|--------|
| «Lo script è verde, i documenti sono a posto» | Non vede le regole di gioco, i flussi né il testo: la rilettura è un passo a parte. |
| «Questa release non tocca la documentazione» | È proprio la scusa con cui sono rimasti indietro. Si controlla comunque. |
| «Ho letto il README ieri» | Il codice è cambiato dopo. Rileggi contro il codice di oggi. |
| «Non ho tempo di rileggere tutto» | Dichiara i documenti non riletti. Un limite scritto è onesto, un controllo dato per fatto no. |

## Errori frequenti

- Aggiornare il codice per far tornare il documento: il codice è la verità, si corregge il testo.
- Accettare `AVVISO` come rumore senza leggerli: `LOG_LEVEL` e `frontend/build` sono comparsi come avvisi.
- Dire «documentazione verificata» senza aver eseguito lo script.
