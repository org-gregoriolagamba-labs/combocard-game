# Contributing Guidelines

Grazie per contribuire a questo repository 🚀  
Per mantenere qualità, ordine e tracciabilità, seguiamo un workflow semplice ma rigoroso.

---

## 🔒 Regole fondamentali

- ❌ **È vietato fare push diretto su `main` e `develop`**
- ✅ Ogni attività ha una **issue** associata, e ogni issue ha un **branch dedicato collegato** ad essa (vedi [Issue e branch](#-issue-e-branch))
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

## 🔗 Issue e branch

Ogni attività ha la sua issue, e ogni issue ha il suo branch, **collegato** alla issue su GitHub.

- **Prima di scrivere codice** apri la issue dell'attività (o individua quella giusta). Una issue "contenitore" che raccoglie più attività non basta: ogni attività ha la propria issue, che può citare quella più ampia ("Parte della #N").
- **Crea il branch dalla issue**, così risulta collegato. Dalla pagina della issue (*Development* → *Create a branch*) oppure da terminale:
    ```bash
    gh issue develop <numero-issue> --name feature/descrizione-breve --base develop
    git fetch origin
    git checkout feature/descrizione-breve
    ```
  Per un hotfix usa `--base main` e un nome `hotfix/*`.
- **Un branch per issue**: non riusare lo stesso branch per attività diverse.
- **Nella PR** scrivi `Closes #<numero-issue>`: la issue si chiude da sola al merge. Se l'attività è parte di una issue più ampia, aggiungi anche `Part of #<numero>`.
- **Modelli**: aprendo una issue da GitHub scegli il modello (bug, nuova funzione, attività tecnica): compila da solo il tipo, l'etichetta e l'assegnatario. Le PR partono da `.github/pull_request_template.md`; per bugfix, feature e hotfix ci sono anche i modelli in `.github/PULL_REQUEST_TEMPLATE/`, da scegliere con `?template=bugfix.md` (o `feature.md`, `hotfix.md`) nell'indirizzo di apertura della PR. Alla PR l'azione `PR metadata` assegna l'autore, aggiunge l'etichetta (`feature/` → `enhancement`, `bugfix/` → `bug`) e avvisa, senza bloccare, se manca `Closes #N` o `Part of #N`. I revisori vengono da `.github/CODEOWNERS`.
- **Eccezione**: le PR create in automatico (la sincronizzazione `main` → `develop` dopo un hotfix, gli aggiornamenti di Dependabot) non hanno bisogno di una issue.

---

## 🔁 Workflow standard (feature / bugfix)

1. Apri (o individua) la issue dell'attività
2. Crea il branch collegato alla issue, partendo da `develop` (vedi [Issue e branch](#-issue-e-branch)):
    ```bash
    gh issue develop <numero-issue> --name feature/descrizione-breve --base develop
    git fetch origin
    git checkout feature/descrizione-breve
    ```
3. Lavora, committa e pusha sul tuo branch:
    ```bash
    git push origin feature/descrizione-breve
    ```
4. Apri una Pull Request verso develop, con `Closes #<numero-issue>` nella descrizione

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
- citare la sua issue (`Closes #N`)
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

## 📦 Pubblicare una release

Una release porta `develop` su `main`. **La revisione della documentazione è un passo del processo, e va fatta prima del bump di versione**: i documenti devono dire la verità sulla versione che esce.

1. **Issue della release** («Release X.Y.Z», modello *Release*) e branch `feature/release-X.Y.Z` collegato, da `develop`.
2. **Revisione della documentazione.** Lancia la skill `controllo-documentazione-release` (`.claude/skills/`): uno script confronta i documenti con il codice, poi si rilegge ciò che la macchina non vede. Segui la lista qui sotto e correggi ciò che è rimasto indietro. Le correzioni sono commit del branch della release.
3. **Bump di versione** nei quattro pacchetti, con i lock aggiornati:
    ```bash
    for d in . backend frontend e2e; do npm --prefix "$d" version X.Y.Z --no-git-tag-version; done
    ```
4. **PR del bump** verso `develop` (`Part of #<issue della release>`), poi **PR `develop` → `main`** con le note di rilascio (novità, correzioni, database, configurazione, cosa sapere per chi aggiorna, verifiche, limiti noti) e `Closes` per ogni issue della release. Per questa PR usa il modello `release.md` (`?template=release.md`).
5. **Merge** delle due PR, una alla volta, quando la CI è verde.
6. **Tag e release su GitHub** sul commit di `main`, con l'identificativo completo (non quello corto):
    ```bash
    gh release create vX.Y.Z --target <sha-completo-di-main> --title "vX.Y.Z" --notes-file <note.md>
    ```

### Revisione della documentazione

Per ogni documento, controlla nel codice e non a memoria:

| Documento | Che cosa controllare | Dove |
|-----------|----------------------|------|
| `README.md` | funzioni e regole di gioco (premi, jolly, estrazione); elenco di rotte e di eventi socket; tecnologie e versioni; elenco dei documenti | `backend/src/routes/`, `grep -rhn "emit(" backend/src`, `backend/src/config/index.js`, `package.json` |
| `docs/GAME_DESIGN.md` | regole e flusso di gioco; struttura delle cartelle; elenco «da fare» | codice di `backend/src/services/` e `frontend/src/` |
| `docs/DEPLOYMENT.md` | variabili d'ambiente, passi di aggiornamento, nuove migrazioni | `backend/.env.example`, `backend/src/config/index.js`, `backend/db/migrations/` |
| `docs/AUTH.md` | rotte di autenticazione e di amministrazione, durata dei token | `backend/src/routes/`, `backend/src/config/index.js` |
| `docs/DATABASE.md` | tabelle, colonne, tipi di movimento, nuove migrazioni | `backend/db/migrations/`, `backend/src/db/store.js` |
| `TEST_SUITE.md` | numeri dei test, struttura, comandi | `npm test`, `npm run test:e2e`, `backend/__tests__/`, `e2e/tests/` |
| `CONTRIBUTING.md` | il processo descritto è quello che si segue davvero | `.github/workflows/` |

Controlli rapidi (lo script `node .claude/skills/controllo-documentazione-release/scripts/check-docs.mjs` li fa tutti, e altri):

- **Rotte:** ogni rotta registrata compare nel README (e viceversa).
- **Variabili d'ambiente:** ogni variabile letta da `config/index.js` è in `.env.example`, e `DEPLOYMENT.md` non ne cita che non esistono.
- **Numeri:** quelli di `TEST_SUITE.md` coincidono con l'ultima esecuzione.
- **Refusi:** rileggi le parti cambiate in questa versione.

Se non riesci a rileggere un documento per intero, scrivilo nella PR della release («Da sapere»): meglio un limite dichiarato che una verifica data per fatta.

---

## 🚨 Hotfix

Un hotfix è una correzione critica che deve essere rilasciata immediatamente.

### Principio fondamentale

Gli hotfix vengono applicati **prima su `main`** e **solo successivamente** riportati su `develop`.

`develop` non deve mai essere sincronizzato **prima** del merge dell’hotfix su `main`.

---

### Procedura corretta

1. Apri la issue del problema e crea da essa un branch `hotfix/*` collegato, partendo da `main`
   ```bash
   gh issue develop <numero-issue> --name hotfix/short-description --base main
   git fetch origin
   git checkout hotfix/short-description
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