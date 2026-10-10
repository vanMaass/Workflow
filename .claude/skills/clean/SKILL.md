---
name: clean
description: Analysiert React/TypeScript- und Rust-Code und entfernt unnoetige Zeilen - toten Code, ungenutzte Imports/Variablen/Exporte/Abhaengigkeiten, Duplikate, auskommentierten Code und ueberfluessige Komplexitaet - ohne das Verhalten zu aendern. Verwenden bei "aufraeumen", "clean", "unnoetigen Code entfernen", "vereinfachen".
---

# clean - Code aufraeumen

Ziel: weniger Code bei **identischem Verhalten**. Jede Entfernung muss belegbar ungenutzt oder ueberfluessig sein.

## Ablauf

1. **Ausgangslage sichern:** `bash .claude/scripts/check.sh` ausfuehren. Ist der Stand nicht gruen, zuerst melden - aufgeraeumt wird nur auf gruener Basis, damit neue Fehler eindeutig zuzuordnen sind.
2. **Umfang klaeren:** Ohne Angabe gilt das ganze Projekt (`app/src`, `app/src-tauri/src`); sonst nur die genannten Dateien/Ordner.
3. **Kandidaten finden** (Werkzeuge, falls installiert, sonst per Grep/Lesen):
   - TypeScript: `npx --no-install tsc --noEmit --noUnusedLocals --noUnusedParameters`, `npx --no-install knip` (ungenutzte Dateien, Exporte, Abhaengigkeiten), ESLint.
   - Rust: `cargo clippy --all-targets -- -W clippy::pedantic` als Hinweisquelle, Compiler-Warnungen `dead_code`/`unused`, `cargo machete` fuer ungenutzte Crates.
   - Manuell: auskommentierter Code, `console.log`/`dbg!`/`println!`-Debugausgaben, doppelte Logik, triviale Wrapper, ueberfluessige Typannotationen, verschachtelte Bedingungen, die sich flach schreiben lassen, ungenutzte CSS-Klassen, veraltete TODOs.
4. **Jeden Kandidaten verifizieren:** Mit Grep alle Verwendungen suchen - auch dynamische (Tauri-Command-Namen als Strings in `invoke("...")`, `generate_handler![...]`, Re-Exporte, Tests). Im Zweifel **nicht** entfernen, sondern im Bericht als "pruefen" auffuehren.
5. **Entfernen in kleinen Schritten:** pro logischer Gruppe aendern, dann `bash .claude/scripts/check.sh quick`.
6. **Abschluss:** `bash .claude/scripts/check.sh` muss gruen sein. Bei Fehlern die betroffene Entfernung rueckgaengig machen oder korrekt beheben.

## Nicht entfernen

- Oeffentliche Tauri-Commands, Migrationen (auch alte!), Serde-Felder des persistierten Datenmodells (`id`, `version`, `createdAt`, `updatedAt`).
- Tests und Testdaten, ausser sie testen nachweislich entfernten Code.
- Kommentare, die ein nicht offensichtliches *Warum* erklaeren.
- Code, der fuer spaetere Sync-Faehigkeit laut `docs/02-technische-architektur.md` vorgesehen ist, ohne Rueckfrage.

## Bericht

```
## clean - Ergebnis
Entfernt: <n> Zeilen in <m> Dateien
| Datei | Was | Begruendung |
|-------|-----|-------------|
Zu pruefen (nicht entfernt): ...
check.sh: gruen / <Fehler>
```
