---
name: start-branch
description: Crea un branch feature/, bugfix/ o hotfix/ a partire da develop, con nome conforme a CONTRIBUTING.md
disable-model-invocation: true
---

# start-branch

Crea il branch di lavoro seguendo `CONTRIBUTING.md`. Non esegue push e non apre PR.

## Passi

1. Chiedi il tipo (`feature`, `bugfix` o `hotfix`) e una descrizione breve, se non sono già stati forniti.
2. Normalizza la descrizione in uno slug: minuscole, parole separate da trattini, nessun carattere speciale. Esempio: `Login utente` → `login-utente`.
3. Controlla lo stato: `git status --short`. Se ci sono modifiche non committate, fermati e chiedi cosa fare.
4. Per `feature` e `bugfix`:
   - `git checkout develop`
   - `git pull`
   - `git checkout -b <tipo>/<slug>`
5. Per `hotfix`: chiedi conferma della base prima di creare il branch, perché `CONTRIBUTING.md` la definisce diversamente.
6. Verifica con `git branch --show-current`, poi riporta il nome del branch creato.

## Regole

- Il nome deve iniziare con `feature/`, `bugfix/` o `hotfix/`: lo controlla il workflow `enforce-branch-naming.yml`.
- Non fare mai commit o push su `main` e `develop`.
