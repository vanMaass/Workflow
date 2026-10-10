---
name: analyse
description: Ausfuehrliches Code-Review fuer die Tauri-App (React, TypeScript, Rust, SQLite) - Korrektheit, Architektur, Sicherheit, Performance, Typsicherheit, Tests und Wartbarkeit mit priorisierten, belegten Befunden und konkreten Verbesserungsvorschlaegen. Verwenden bei "analysiere", "review", "Code pruefen", "Feedback zum Code".
---

# analyse - Ausfuehrliches Code-Review

Diese Skill **liest und bewertet**, sie aendert keinen Code (ausser der Nutzer bittet ausdruecklich darum).

## Ablauf

1. **Umfang:** Ohne Angabe das ganze Projekt; bei vorhandenem Git die aktuellen Aenderungen (`git diff`) zuerst. Lies `claude.md` und relevante `docs/` als Massstab fuer die fachlichen Anforderungen.
2. **Maschinelle Befunde sammeln:** `bash .claude/scripts/check.sh` ausfuehren und Ergebnisse einbeziehen.
3. **Code vollstaendig lesen** - nicht nur ueberfliegen. Folge Datenfluessen von der React-Komponente ueber `invoke` bis zur SQL-Abfrage in Rust.
4. **Pruefen nach Kategorien:**

| Kategorie | Worauf achten |
|-----------|---------------|
| Korrektheit | Logikfehler, Randfaelle (leere Listen, Datumsgrenzen/Zeitzonen, Mitternacht), Race Conditions bei async/`useEffect`, fehlende Fehlerbehandlung, falsche Abhaengigkeits-Arrays |
| Architektur | SQL oder Pfade in React? Typen Rust<->TS synchron? Schmale API-Schicht? Datenmodell mit `id`/`version`/`createdAt`/`updatedAt`? Migrationen versioniert? |
| Sicherheit | Tauri-Capabilities/Permissions minimal, CSP gesetzt, SQL nur parametrisiert, Pfad-Validierung, kein `dangerouslySetInnerHTML` ohne Sanitizing |
| Rust | `unwrap`/`expect`/`panic` im Produktivcode, Fehler-Typen, unnoetige `clone`, Blocking-Aufrufe in async-Commands, Transaktionen bei Mehrfachschreibvorgaengen |
| React/TS | `any`, unsichere Casts (`as`), unnoetige Re-Renders, fehlende `key`s, State-Duplikate, Barrierefreiheit (Labels, Tastaturbedienung, Fokus) |
| Performance | Laden nur benoetigter Daten pro Ansicht, Virtualisierung langer Listen, Lazy-Loading schwerer Editor-Pakete, Speichern ohne Eingabeblockade |
| Tests | Fehlende Tests fuer Kernlogik, Commands, Migrationen; Tests, die nichts pruefen |
| Wartbarkeit | Benennung, Dateigroesse, Duplikate, toter Code, Konsistenz mit bestehenden Mustern |

5. **Jeden Befund belegen:** konkrete Datei und Zeile, Auswirkung (was passiert konkret?), Vorschlag mit kurzem Code-Beispiel. Keine Vermutungen als Fakten darstellen - unsichere Punkte als "Frage" kennzeichnen.

## Bericht

```
## analyse - Code-Review
Umfang: ...  |  check.sh: gruen / <Fehler>

### Zusammenfassung
2-4 Saetze: Gesamteindruck, groesste Risiken, Staerken.

### Befunde
#### [KRITISCH] Titel - `datei.rs:42`
Problem / Auswirkung / Vorschlag (mit Code)

#### [HOCH] ...
#### [MITTEL] ...
#### [NIEDRIG] ...

### Fragen
### Positiv
### Empfohlene naechste Schritte (priorisiert)
```

Schweregrade: **KRITISCH** = Datenverlust, Absturz, Sicherheitsluecke. **HOCH** = falsches Verhalten im normalen Gebrauch. **MITTEL** = Randfall, Architekturverstoss, fehlende Tests. **NIEDRIG** = Stil, Lesbarkeit.
