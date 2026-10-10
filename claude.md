# Workflow - Desktop-Arbeitszentrale

Persoenliche, lokal gespeicherte Tages- und Aufgabenplanung mit Notizen. Desktop-App mit **Tauri 2, React, TypeScript und Rust**, Daten in **SQLite**.

## Projektstruktur

- `docs/` - Produkt- und Architekturdokumentation (fachliche Wahrheit). Vor jeder Feature-Arbeit die passende Datei lesen.
- `prototypes/` - HTML-Prototypen der Heute- und Aufgaben-Ansicht (keine Design-Vorlage, nur ein Vorschlag).
- `Screenshots/` - keine Design-Referenzen, nur konkretisierung des Aufbaus.
- `app/` - die Tauri-App (Frontend in `app/src`, Rust-Kern in `app/src-tauri`).
- `.claude/` - Agent, Skills, Hooks und Pruefskript.

## Befehle (in `app/`)

- `npm run tauri dev` - App im Entwicklungsmodus starten
- `npm run typecheck` / `npm run lint` / `npm run test` / `npm run build`
- `bash .claude/scripts/check.sh` - **alle Checks** (TS, ESLint, Vitest, Build, rustfmt, clippy, cargo test). Modi: `full` (Standard), `quick`, `ts`, `rust`.

## Regeln

- Kein SQL und keine Dateipfade in React - nur typisierte Tauri-Commands ueber `app/src/api/`.
- Datenobjekte: UUID, `version`, `createdAt`, `updatedAt`. Schema nur ueber neue Migrationen aendern.
- Rust ohne `unwrap()` im Produktivcode, Fehler als `Result<T, AppError>`.
- Design: ruhige Notion-artige Grauskala, eckige Checkboxen.
- Nach jeder Aenderung `check.sh` ausfuehren; erst bei gruenem Ergebnis ist eine Aufgabe fertig.

## Agent und Skills

- Agent `tauri-entwickler` - baut die App und prueft automatisch per Hook nach jedem Edit (schneller Typecheck) und beim Beenden (voller Check).
- `/clean` - unnoetigen Code entfernen, ohne Verhalten zu aendern.
- `/analyse` - ausfuehrliches Code-Review mit priorisierten Befunden.
- `/test` - systematisch auf Fehler testen, Fehler beheben, Tests ergaenzen.
