---
name: test
description: Testet die Tauri-App (React, TypeScript, Rust) systematisch auf Fehler - statische Checks, Unit-/Integrationstests, Build und manuelle Pruefung der App - behebt gefundene Fehler und ergaenzt fehlende Tests. Verwenden bei "teste", "test", "auf Fehler pruefen", "laeuft alles?" sowie nach jeder groesseren Aenderung.
---

# test - Programm auf Fehler testen

## Ablauf

### 1. Automatische Checks
`bash .claude/scripts/check.sh` ausfuehren. Das umfasst:
- Frontend: TypeScript (`tsc --noEmit`), ESLint, Vitest, Vite-Build
- Rust: `cargo fmt --check`, `cargo clippy -D warnings`, `cargo test`

Fehlt eine Toolchain (z. B. `cargo`) oder `node_modules`, das klar melden und - wenn moeglich - `npm install` ausfuehren.

### 2. Fehler beheben
Fuer jeden Fehler: Ursache verstehen, an der Wurzel beheben, erneut pruefen. Verboten: Tests loeschen/abschwaechen, `@ts-ignore`, `#[allow(...)]`, `.skip`, Checks deaktivieren.

### 3. Testabdeckung pruefen und ergaenzen
Fehlende Tests fuer geaenderte oder kritische Logik schreiben:
- **Rust** (`#[cfg(test)]` bzw. `src-tauri/tests/`): jeder Tauri-Command (Erfolg + Fehlerfall), Validierung, Migrationen gegen eine In-Memory-SQLite (`:memory:`), Transaktionen.
- **React** (Vitest + Testing Library, `invoke` gemockt via `@tauri-apps/api/mocks`): Rendern, Nutzerinteraktion (Aufgabe anlegen/abhaken/verschieben), Lade- und Fehlerzustaende.
- **Randfaelle:** leere Daten, sehr lange Texte, Sonderzeichen/Umlaute, Datumswechsel um Mitternacht, gleichzeitige Speichervorgaenge.

Fehlt die Testinfrastruktur noch, einrichten: `vitest`, `@testing-library/react`, `@testing-library/user-event`, `jsdom` und ein `"test": "vitest run"`-Script in `app/package.json`.

### 4. Laufzeit pruefen (bei UI-Aenderungen)
Frontend mit `npm run dev` im Hintergrund starten und im Browser pruefen (Konsole auf Fehler/Warnungen, betroffene Ansicht durchklicken). Fuer die native App `npm run tauri dev` - Rust-Panics und Konsolenfehler beobachten. Server danach wieder stoppen.

### 5. Abschluss
`bash .claude/scripts/check.sh` muss gruen sein.

## Bericht

```
## test - Ergebnis
| Check | Status |
|-------|--------|
| TypeScript / ESLint / Vitest / Build | ok / FEHLER |
| rustfmt / clippy / cargo test        | ok / FEHLER |
| Laufzeit                             | ok / nicht geprueft (Grund) |

Gefundene und behobene Fehler: Datei:Zeile - Ursache - Fix
Neue Tests: ...
Offene Probleme: ...
```
