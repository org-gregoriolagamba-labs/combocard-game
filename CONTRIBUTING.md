# Contributing Guidelines

Grazie per contribuire a questo repository 🚀  
Per mantenere qualità, ordine e tracciabilità, seguiamo un workflow semplice ma rigoroso.

---

## 🔒 Regole fondamentali

- ❌ **È vietato fare push diretto su `main` e `develop`**
- ✅ Tutte le modifiche devono passare da:
  - un branch dedicato
  - una Pull Request
  - almeno 1 review
  - GitHub Actions verdi (CI)

Queste regole valgono **per tutti, inclusi gli admin**.

---

## 🌳 Struttura dei branch

| Branch | Scopo |
|------|------|
| `main` | Release stabili / produzione |
| `develop` | Integrazione continua |
| `feature/*` | Nuove funzionalità |
| `bugfix/*` | Correzioni non urgenti |
| `hotfix/*` | Correzioni urgenti |

---

## 🏷️ Naming dei branch

Usa nomi chiari e descrittivi:

feature/short-description  
bugfix/short-description  
hotfix/short-description

Esempi:
- `feature/user-authentication`
- `feature/api-timeout-handling`
- `bugfix/error-on-createuser`
- `hotfix/null-pointer-on-startup`

---

## 🔁 Workflow standard (feature / bugfix)

1. Parti da `develop`:
    ```bash
    git checkout develop
    git pull
    ```
2. Crea il tuo branch:
    ```bash
    git checkout -b feature/descrizione-breve
    ```
3. Lavora, committa e pusha sul tuo branch:
    ```bash
    git push origin feature/descrizione-breve
    ```
4. Apri una Pull Request verso develop

5. Attendi:
    - almeno 1 approvazione
    - CI completata con successo

6. Merge tramite GitHub (no merge locali)  
    
    ❌ Una PR non può essere mergiata se:
    - anche solo un check fallisce
    - i branch non sono aggiornati (se richiesto)
    
---

## 🔍 Pull Request: requisiti minimi

Ogni PR deve:
- avere un titolo chiaro
- descrivere cosa cambia e perché
- essere limitata a una singola responsabilità
- passare tutte le GitHub Actions

**Checklist consigliata:**  
 - codice testato
 - `npm run lint` verde
 - `npm test` verde
 - (se tocca flussi utente o networking) `npm run test:e2e` verde
 - nessun commit inutile (fix, debug, ecc.)
 - naming coerente
 - nessun file non necessario (log, build, ecc.)

### Documentazione
Se una modifica impatta:
- setup/avvio/test (documentazione tecnica)
- comportamento di gioco / multiplayer / UX (documentazione funzionale)

aggiorna anche:
- README principali
- docs/ (Deployment / Game Design) quando pertinente

---

## 🤖 Continuous Integration (CI) 

Le GitHub Actions vengono eseguite automaticamente su:  
- pull_request verso `develop`
- pull_request verso `main`

---

## 👮 Code Review & Ownership

**Le review sono obbligatorie**

Alcune aree del codice possono richiedere approvazione specifica (da parte dei Code Owners)

**Code Owner principale:**
@gregoriolagamba

**🧹 Buone pratiche di collaborazione**

- Preferisci commit piccoli e significativi
- Evita PR “giganti”
- Commenta il codice solo dove serve davvero
- Se una scelta non è ovvia, spiegala nella PR

---

## 🚨 Hotfix

Un hotfix è una correzione critica che deve essere rilasciata immediatamente.

### Principio fondamentale

Gli hotfix vengono applicati **prima su `main`** e **solo successivamente** riportati su `develop`.

`develop` non deve mai essere sincronizzato **prima** del merge dell’hotfix su `main`.

---

### Procedura corretta

1. Crea un branch `hotfix/*` partendo da `main`
   ```bash
   git checkout main
   git pull
   git checkout -b hotfix/short-description
   ```
2. Applica la correzione e pusha il branch

3. Apri una Pull Request verso `main`  
    - assegna obbligatoriamente la label `hotfix`
    - CI e review sono obbligatorie

4. Esegui il merge della PR su `main`

Dopo il merge, una GitHub Action creerà automaticamente una Pull Request di sincronizzazione da `main` verso `develop`, con titolo: _Sync main into develop (hotfix #N)_

⚠️ Non è necessario che tu crei manualmente la PR di sync: la Action gestisce automaticamente questo passaggio.

**Chiusura dell’hotfix**  
Un hotfix è considerato completato solo quando:
- la PR hotfix è mergiata su `main`
- la PR automatica `main` → `develop` è stata revisionata e mergiata

**❌ È vietato:**
- sincronizzare `main` → `develop` prima del merge dell’hotfix
- usare cherry-pick, salvo casi eccezionali e concordati
- fare merge locali senza Pull Request

**🔔 Nota per i contributors**

La GitHub Action gestisce automaticamente la sincronizzazione di develop dopo ogni hotfix.

Il tuo compito è solo fare il merge corretto della PR hotfix e, successivamente, approvare la PR di sync creata dall’Action.

Tutto il resto è automatizzato per evitare dimenticanze o errori.

---

## ❓ Dubbi o domande
In caso di dubbi:
- chiedi prima di forzare soluzioni
- usa le Pull Request anche per discussioni tecniche

Grazie per contribuire in modo ordinato e professionale! 💪