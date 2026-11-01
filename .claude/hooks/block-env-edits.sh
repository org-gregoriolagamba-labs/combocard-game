#!/usr/bin/env bash
# PreToolUse (Edit|Write): blocca le modifiche ai file .env con segreti. .env.example resta modificabile.
input=$(cat)
file=$(printf '%s' "$input" | jq -r '.tool_input.file_path // ""')
base=$(basename "$file")

case "$base" in
  .env.example) exit 0 ;;
  .env|.env.*)
    echo "Modifica bloccata: $base può contenere segreti. Modifica .env.example oppure fallo a mano." >&2
    exit 2 ;;
esac

exit 0
