# Technische Architektur und Plattformstrategie

## Empfehlung

Starte die Desktop-Anwendung mit Tauri 2, React und TypeScript auf Windows in VS Code; gestalte Datenmodell und Synchronisation von Beginn an plattformneutral, damit eine spaetere native SwiftUI-App fuer iPad und iPhone denselben Datenbestand nutzen kann.

## Ziel und Annahmen

- Der erste nutzbare Kern ist eine schnelle, lokale Desktop-App fuer Windows, macOS und Linux.
- App-Start, Navigation, Tagesplanung und Notizen sollen ohne Netzwerkverbindung funktionieren.
- Die erste Version speichert ausschliesslich lokal; Cloud und Konten folgen erst nach Bewertung des lokalen Workflows.
- Das iPad soll spaeter eine hochwertige native Stift- und Dokumenterfahrung erhalten. SwiftUI ist dafuer die bevorzugte Richtung.
- Die Wahl von Tauri 2 ist eine Arbeitsentscheidung fuer den Desktop-Prototyp, keine irreversible Festlegung fuer alle Plattformen.

## Plattformaufteilung

| Bereich | Vorgeschlagene Technologie | Begruendung |
| --- | --- | --- |
| Desktop fuer Windows, macOS, Linux | Tauri 2, React, TypeScript, Rust | Eine Codebasis fuer die Desktop-Oberflaeche, geringe App-Groesse und Zugriff auf lokale Betriebssystemfunktionen. |
| iPad und iPhone | SwiftUI und Swift | Native Apple-Interaktion, gute Grundlage fuer Stift, Handschrift, Dateien und performante Touch-Oberflaechen. |
| Gemeinsamer Kern | Versionsiertes Datenmodell, lokale Datenbank, spaeter Sync-Protokoll | Desktop und Apple-App teilen Inhalte und Regeln, nicht zwingend dieselbe UI-Technologie. |
| Cloud, spaeter | Separater Sync-Dienst und API | Die lokale App bleibt auch ohne Cloud voll funktionsfaehig. |

Die genaue interne Technik von Goodnotes wird hier nicht als Grundlage angenommen. Fuer das Produkt ist entscheidend, dass eine native Apple-App mit Swift und SwiftUI die passenden Plattform-APIs fuer Stiftinteraktion nutzen kann.

## Desktop-Architektur

```text
React + TypeScript
  Ansichten, Editor, Interaktionen, Easy/Advanced Mode
             |
             | Tauri Command API
             v
Rust-Anwendungskern
  Validierung, lokale Dateipfade, Datenzugriff, spaeter Sync-Adapter
             |
             v
SQLite-Datenbank im lokalen Anwendungsdatenordner
  Aufgaben, Notizen, Tagesplaene, Verknuepfungen, Seiten, Papierkorb, Einstellungen
```

### Verantwortlichkeiten

- **React und TypeScript:** Bedienoberflaeche, Darstellung, lokaler Zustand waehrend einer Interaktion und Zugriffslogik auf den Anwendungskern.
- **Rust:** sichere lokale Datenzugriffe, Datenbankmigrationen, Dateioperationen und spaeter die technische Grundlage fuer Import, Export und Synchronisation.
- **SQLite:** dauerhafte lokale Datenhaltung. Sie ist transaktional, performant fuer den vorgesehenen Umfang und auf allen drei Desktop-Systemen gut nutzbar.

Die Oberflaeche darf keine direkten SQL-Abfragen enthalten. Ein klarer Datenzugriff zwischen UI und Anwendungskern verhindert, dass spaetere Cloud- oder iPad-Anbindungen von React-spezifischen Details abhaengen.

## Datenmodell und Kompatibilitaet

Die fachlichen Objekte aus der Produktdokumentation bleiben die gemeinsame Sprache aller Plattformen:

- `Task`: Aufgabe, Status, Reihenfolge, Erstell- und Aenderungszeit.
- `Note`: Textinhalt, Titel, Erstell- und Aenderungszeit.
- `DailyPlan`: Datum, Tagesfokus und Reihenfolge der Aufgaben.
- `Link`: Verknuepfung zwischen Aufgabe und Notiz.
- `Page`: Flacher fachlicher Kontext fuer Aufgaben und Notizen.
- `UserPreference`: Easy/Advanced Mode und das Layout der Heute-Seite.

Jedes Objekt braucht eine stabile, plattformunabhaengige ID, eine Versionsnummer sowie `createdAt` und `updatedAt`. Das ist bereits lokal sinnvoll und schafft die Voraussetzung fuer spaetere Synchronisation und Konfliktbehandlung.

Die Datenbank ist eine lokale Implementierung dieses Modells, nicht die alleinige Definition des Modells. Fuer iPad/iPhone wird spaeter eine eigene lokale Datenhaltung moeglich sein, die dieselben Objekte und Regeln abbildet.

## Lokale Speicherung in v1

- Die SQLite-Datei liegt im betriebssystemueblichen Anwendungsdatenordner, nicht neben der installierten App.
- Schema-Aenderungen erfolgen ausschliesslich ueber versionierte Migrationen.
- Schreibvorgaenge fuer Aufgaben und Einstellungen sind kurz und transaktional.
- Textnotizen werden nach einer kurzen Eingabepause und beim Verlassen der Notiz gespeichert.
- Fehler beim Schreiben werden sichtbar gemeldet; bereits geladene Daten bleiben lesbar.
- Testdaten und Produktionsdaten erhalten getrennte lokale Speicherorte.
- Export und Import verwenden ein dokumentiertes, versionsiertes Format und pruefen die Kompatibilitaet vor einer Aenderung des Bestands.
- Vor Import und Datenmigration erzeugt die App einen lokalen Wiederherstellungspunkt; geloeschte Inhalte bleiben bis zum manuellen Leeren im Papierkorb.

Der Export deckt den gesamten Datenbereich einschliesslich Aufgaben, Notizen, Tagesplaenen, Seiten, Verknuepfungen und Einstellungen ab. Das konkrete Containerformat wird vor dem technischen Spike entschieden; es muss auf allen Zielplattformen lesbar und langfristig versionierbar sein.

## Performance-Leitplanken

Die Architektur wird auf gefuehlte Direktheit ausgelegt, nicht auf vorzeitige Komplexitaet:

- Die App zeigt die Heute-Ansicht aus der lokalen Datenbank, ohne auf Netzwerkantworten zu warten.
- Die erste Ansicht soll ohne schwere Editor-, Sync- oder Analysepakete starten. Erweiterte Editorfunktionen werden bei Bedarf nachgeladen.
- Listen rendern nur sichtbare Elemente, sobald ihr Umfang das sinnvoll macht.
- Datenbankabfragen liefern gezielt die Inhalte fuer die aktuelle Ansicht, nicht den gesamten Bestand.
- Speichern blockiert keine Eingabe und zeigt nur bei echten Fehlern einen Status.
- Jede spaetere Cloud-Anbindung ist asynchron und darf den lokalen Workflow nicht verlangsamen.

Messbare Zielwerte werden erst nach einem ersten funktionsfaehigen Desktop-Kern festgelegt und auf echter Zielhardware getestet. Vorher waeren konkrete Millisekundenwerte eine unbelegte Annahme.

## Spaetere Cloud und Synchronisation

Die Cloud wird als zusaetzliche Schicht geplant, nicht als Voraussetzung:

```text
Lokale Datenbank <-> Repository/Sync-Warteschlange <-> Sync-API <-> Cloud-Speicher
                                          ^
                                          |
                              Desktop und SwiftUI-App
```

### Regeln fuer die Vorbereitung

- Alle lokalen Aenderungen entstehen zuerst auf dem Geraet und werden fuer spaeteren Upload protokolliert.
- Die UI liest immer aus dem lokalen Bestand, auch wenn die Cloud nicht erreichbar ist.
- Serverseitige IDs oder Cloud-Logik dringen nicht in React-Komponenten ein.
- Konfliktstrategie, Verschluesselung, Authentifizierung und Anbieterwahl bleiben offene Entscheidungen und werden vor einer Cloud-Umsetzung separat geplant.

## iPad und iPhone

Die Apple-App erhaelt keine verkleinerte Kopie der Desktop-Ansicht. Sie nutzt dasselbe fachliche Modell, aber eine plattformgerechte Interaktion:

- **iPhone:** Easy Mode mit schneller Erfassung, Tagesliste, Erinnerungen und flachen Textnotizen.
- **iPad:** Easy Mode fuer Planung sowie ein nativer Arbeitsbereich fuer Handschrift, Zeichnungen und Dokumentannotation.
- **Stift:** Apple-Pencil-Interaktion wird erst im nativen Apple-Teil bewertet. Anforderungen an Latenz, Schreibgefuehl, PDF-Markierung und Handschrifterkennung duerfen nicht von der Web-Oberflaeche des Desktop-Kerns abgeleitet werden.

Die gemeinsame Schnittstelle zwischen Tauri und SwiftUI ist deshalb das Datenmodell und spaeter das Sync-Protokoll, nicht ein geteilter UI-Code.

## Entwicklungsumgebung

### Start auf Windows

Fuer die erste Desktop-Entwicklung in VS Code werden benoetigt:

- Node.js in einer aktuell unterstuetzten LTS-Version.
- Rust mit dem Standard-Toolchain-Manager `rustup`.
- Microsoft C++ Build Tools fuer die nativen Windows-Abhaengigkeiten von Tauri.
- VS Code mit Erweiterungen fuer TypeScript/React und Rust.

### macOS

Ein Mac mit Xcode wird benoetigt, um macOS-Builds zu erstellen, native Abhaengigkeiten zu pruefen und spaeter die iPad-/iPhone-App zu entwickeln, zu signieren und im Simulator oder auf Geraeten zu testen. VS Code kann auch dort fuer den Tauri-Teil verwendet werden; Xcode ist fuer den Apple-Teil trotzdem erforderlich.

### Linux

Fuer Linux-Builds werden Rust, Node.js sowie distributionsspezifische Build- und WebKit-Bibliotheken benoetigt. Die exakten Pakete richten sich nach der Ziel-Distribution und werden erst bei der Linux-Build-Einrichtung festgelegt.

## Offene Entscheidungen vor dem Projekt-Setup

1. Welche Rich-Text- und Blockfunktionen gehoeren wirklich in den ersten Desktop-Editor? Diese Wahl beeinflusst Ladezeit und Komplexitaet erheblich.
2. Soll SQLite direkt aus Rust verwaltet werden oder ueber ein etabliertes Tauri-Plugin? Beide Wege sind moeglich; die Entscheidung kann beim ersten Datenpersistenz-Prototyp getroffen werden.
3. Welche Linux-Distributionen werden offiziell unterstuetzt? Ohne Zielgruppe ist nur allgemeine Linux-Kompatibilitaet planbar.
4. Wie sollen private und berufliche Daten spaeter getrennt oder geschuetzt werden? Das wird vor Cloud und iPhone-Erinnerungen relevant.

## Naechster Schritt

Vor der Implementierung des eigentlichen Programms einen kleinen technischen Spike freigeben: Tauri-2-Desktop-App mit React/TypeScript, lokaler SQLite-Testdatenbank und einer einfachen `Heute`-Ansicht. Damit lassen sich Startverhalten, lokales Speichern und die Entwicklungsumgebung auf Windows frueh pruefen, ohne die gesamte Produktarchitektur vorwegzunehmen.