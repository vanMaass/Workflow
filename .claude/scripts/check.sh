#!/usr/bin/env bash
# Prueft das Tauri-Projekt (React + TypeScript + Rust) auf Fehler.
#
# Aufruf:  check.sh [full|quick|ts|rust]
#   full  - Typecheck, Lint, Tests, Frontend-Build, rustfmt, clippy, cargo test (Standard)
#   quick - Typecheck + cargo check (schnell, fuer Checks nach jeder Datei-Aenderung)
#   ts    - nur schnelle TypeScript-Pruefung
#   rust  - nur schnelle Rust-Pruefung
#
# Exit-Code 0 = alles gruen, 1 = mindestens ein Check fehlgeschlagen.

set -uo pipefail

MODE="${1:-full}"
ROOT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"

# App-Verzeichnis finden: WORKFLOW_APP_DIR, sonst ./app, sonst das Projekt-Root.
if [[ -n "${WORKFLOW_APP_DIR:-}" ]]; then
  APP_DIR="$WORKFLOW_APP_DIR"
elif [[ -f "$ROOT/app/package.json" ]]; then
  APP_DIR="$ROOT/app"
elif [[ -f "$ROOT/package.json" ]]; then
  APP_DIR="$ROOT"
else
  echo "check: Noch kein App-Projekt gefunden (erwartet app/package.json) - nichts zu pruefen."
  exit 0
fi
TAURI_DIR="$APP_DIR/src-tauri"

FAILED=()
LOG_DIR="$(mktemp -d)"
trap 'rm -rf "$LOG_DIR"' EXIT

has_script() {
  node -e "process.exit(require('$APP_DIR/package.json').scripts?.['$1'] ? 0 : 1)" 2>/dev/null
}

run() {
  local name="$1"; shift
  local log="$LOG_DIR/${name//[^a-zA-Z0-9]/_}.log"
  printf '  %-22s' "$name"
  if "$@" >"$log" 2>&1; then
    echo "ok"
  else
    echo "FEHLER"
    FAILED+=("$name")
    echo "----- $name -----"
    tail -n 60 "$log"
    echo "------------------"
  fi
}

check_ts() {
  if [[ ! -d "$APP_DIR/node_modules" ]]; then
    echo "  node_modules fehlt     FEHLER (npm install in $APP_DIR ausfuehren)"
    FAILED+=("npm install"); return
  fi
  cd "$APP_DIR" || return
  if has_script typecheck; then
    run "TypeScript" npm run --silent typecheck
  else
    run "TypeScript" npx --no-install tsc --noEmit
  fi
  [[ "$MODE" == "full" ]] || return
  has_script lint  && run "ESLint" npm run --silent lint
  has_script test  && run "Frontend-Tests" npm run --silent test
  has_script build && run "Frontend-Build" npm run --silent build
}

check_rust() {
  [[ -f "$TAURI_DIR/Cargo.toml" ]] || return
  if ! command -v cargo >/dev/null 2>&1; then
    echo "  Rust-Toolchain         FEHLER (cargo fehlt - Rust via rustup installieren)"
    FAILED+=("cargo fehlt"); return
  fi
  cd "$TAURI_DIR" || return
  if [[ "$MODE" == "full" ]]; then
    run "rustfmt" cargo fmt --check
    run "clippy" cargo clippy --all-targets -- -D warnings
    run "cargo test" cargo test
  else
    run "cargo check" cargo check --all-targets
  fi
}

echo "check ($MODE): $APP_DIR"
case "$MODE" in
  ts)    check_ts ;;
  rust)  check_rust ;;
  quick) check_ts; check_rust ;;
  full)  check_ts; check_rust ;;
  *)     echo "Unbekannter Modus: $MODE"; exit 1 ;;
esac

if (( ${#FAILED[@]} )); then
  echo "check: ${#FAILED[@]} Check(s) fehlgeschlagen: ${FAILED[*]}"
  exit 1
fi
echo "check: alles gruen."
