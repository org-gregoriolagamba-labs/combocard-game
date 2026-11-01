#!/usr/bin/env bash
# PreToolUse (Bash): blocca il push diretto su main e develop (vedi CONTRIBUTING.md).
# Analizza solo il sottocomando "git push", così altre parti dello stesso comando
# (per esempio "gh pr create --base develop") non causano falsi positivi.
input=$(cat)
cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // ""')

is_protected() {
  case "$1" in
    main|develop|refs/heads/main|refs/heads/develop) return 0 ;;
    *) return 1 ;;
  esac
}

block() {
  echo "Push diretto su main o develop vietato (vedi CONTRIBUTING.md). Crea un branch feature/, bugfix/ o hotfix/ e apri una PR." >&2
  exit 2
}

current=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)

# Un sottocomando per riga: separa su newline, ;, &&, || e |.
segments=$(printf '%s\n' "$cmd" | sed -E 's/&&|\|\||;|\|/\n/g')

while IFS= read -r segment; do
  if ! printf '%s' "$segment" | grep -Eq '^[[:space:]]*git([[:space:]]+-[^[:space:]]+([[:space:]]+[^-[:space:]][^[:space:]]*)?)*[[:space:]]+push([[:space:]]|$)'; then
    continue
  fi

  # Argomenti dopo "push", senza le opzioni.
  args=$(printf '%s' "$segment" | sed -E 's/^.*[[:space:]]push([[:space:]]|$)//')
  read -ra words <<< "$args"
  positional=()
  for word in "${words[@]}"; do
    case "$word" in
      --all|--mirror) block ;;
      -*) ;;
      *) positional+=("$word") ;;
    esac
  done

  # Senza branch esplicito (git push, git push origin) vale il branch corrente.
  if [ "${#positional[@]}" -le 1 ]; then
    is_protected "$current" && block
    continue
  fi

  # Il primo argomento è il remote, gli altri sono refspec: conta la destinazione.
  for refspec in "${positional[@]:1}"; do
    destination=${refspec#+}
    destination=${destination##*:}
    if [ "$destination" = "HEAD" ]; then
      destination=$current
    fi
    is_protected "$destination" && block
  done
done <<< "$segments"

exit 0
