#!/usr/bin/env bash
# PostToolUse (Edit|Write): applica ESLint --fix al file modificato in backend/ o frontend/.
# Se restano errori non sistemabili automaticamente, li restituisce a Claude con exit 2.
input=$(cat)
file=$(printf '%s' "$input" | jq -r '.tool_input.file_path // ""')

case "$file" in
  "$CLAUDE_PROJECT_DIR"/backend/src/*.js)                       pkg=backend ;;
  "$CLAUDE_PROJECT_DIR"/frontend/src/*.js|"$CLAUDE_PROJECT_DIR"/frontend/src/*.jsx) pkg=frontend ;;
  *) exit 0 ;;
esac

[ -f "$file" ] || exit 0
cd "$CLAUDE_PROJECT_DIR/$pkg" || exit 0

if ! out=$(./node_modules/.bin/eslint --fix "$file" 2>&1); then
  printf '%s\n' "$out" >&2
  exit 2
fi

exit 0
