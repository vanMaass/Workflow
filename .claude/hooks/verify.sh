#!/usr/bin/env bash
# Hook-Wrapper fuer check.sh. Liest das Hook-JSON von stdin.
#   verify.sh edit  - PostToolUse nach Edit/Write: schneller Check passend zur Dateiendung
#   verify.sh stop  - Stop/SubagentStop: voller Check, blockiert das Beenden bei Fehlern
# Exit-Code 2 gibt die Fehlerausgabe an den Agenten zurueck, damit er sie behebt.

set -uo pipefail

HOOK="${1:-stop}"
INPUT="$(cat)"
CHECK="$(dirname "$0")/../scripts/check.sh"

case "$HOOK" in
  edit)
    FILE="$(jq -r '.tool_input.file_path // empty' <<<"$INPUT")"
    case "$FILE" in
      *.ts|*.tsx)                 MODE=ts ;;
      *.rs|*/Cargo.toml)          MODE=rust ;;
      *)                          exit 0 ;;
    esac
    ;;
  stop)
    # Nur einmal blockieren, sonst entsteht eine Endlosschleife.
    [[ "$(jq -r '.stop_hook_active // false' <<<"$INPUT")" == "true" ]] && exit 0
    MODE=full
    ;;
  *) exit 0 ;;
esac

if OUTPUT="$(bash "$CHECK" "$MODE" 2>&1)"; then
  exit 0
fi

echo "$OUTPUT" >&2
echo "Behebe diese Fehler, bevor du weitermachst." >&2
exit 2
