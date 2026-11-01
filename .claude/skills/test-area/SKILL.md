---
name: test-area
description: Lancia la suite di test che corrisponde ai file modificati (backend, frontend, e2e)
---

# test-area

Esegue solo le suite che coprono le modifiche correnti, per evitare di lanciare tutto ogni volta.

## Passi

1. Elenca i file modificati: `git diff --name-only HEAD` e `git ls-files --others --exclude-standard`.
2. Scegli le suite in base al percorso:
   - `backend/` → `npm --prefix backend test`
   - `frontend/` → `npm --prefix frontend test -- --watchAll=false`
   - `e2e/` → `npm --prefix e2e run test:smoke`, ma richiede backend e frontend avviati: chiedi conferma prima di lanciarlo.
   - Nessun file in questi percorsi → non lanciare nulla e dillo.
3. Se le modifiche toccano più aree, lancia le suite in sequenza, non in parallelo.
4. Riporta per ogni suite: comando eseguito, esito, numero di test falliti e il messaggio d'errore principale.

## Regole

- Non correggere i test falliti senza che l'utente lo chieda: riporta e basta.
- Playwright (e2e) richiede Node.js 20 o superiore. Se la versione è inferiore, fermati e segnalalo.
