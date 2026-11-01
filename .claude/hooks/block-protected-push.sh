#!/usr/bin/env bash
# PreToolUse (Bash): blocca il push diretto su main e develop (vedi CONTRIBUTING.md).
input=$(cat)
cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // ""')

# Solo i comandi git push interessano questo controllo.
if ! printf '%s' "$cmd" | grep -Eq '(^|[;&|[:space:]])git[[:space:]]+push([[:space:]]|$)'; then
  exit 0
fi

current=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
protected_current=0
[ "$current" = "main" ] || [ "$current" = "develop" ] && protected_current=1

# Caso 1: il comando nomina esplicitamente main o develop come destinazione.
if printf '%s' "$cmd" | grep -Eq '(^|[[:space:]:])(main|develop)([[:space:]]|$)'; then
  blocked=1
fi

# Caso 2: push senza destinazione esplicita (solo opzioni) mentre si è su main o develop.
args=$(printf '%s' "$cmd" | sed -E 's/.*git[[:space:]]+push//' | tr ' ' '\n' | grep -v '^-' | grep -v '^$' | grep -v '^;\|^&\|^|' || true)
if [ "$protected_current" = "1" ] && [ -z "$args" ]; then
  blocked=1
fi

if [ "${blocked:-0}" = "1" ]; then
  echo "Push diretto su main o develop vietato (vedi CONTRIBUTING.md). Crea un branch feature/, bugfix/ o hotfix/ e apri una PR." >&2
  exit 2
fi

exit 0
