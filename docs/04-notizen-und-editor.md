# Notizen und Editor

## Empfehlung

Notizen sind freie, Seiten mit einer ruhigen Textflaeche. Der Easy Mode bietet die schnellen Basisfunktionen fuer alltaegliches Schreiben; der Advanced Mode erweitert denselben Inhalt um strukturierte und technische Blocktypen, ohne einen zweiten Editor oder ein anderes Datenformat einzufuehren.

## Ziel und Annahmen

- Notizen dienen fuer Meetings, Recherche, Entscheidungen und persoenliche Gedanken ohne vorgegebene Struktur.
- Eine Notiz kann leer beginnen und wird nicht zum Anlegen einer Kategorie, eines Projekts oder einer Datenbank gezwungen. Sie kann optional einer flachen Seite wie `Privat`, `Arbeit` oder einem Vorhaben zugeordnet sein.
- Easy und Advanced Mode bearbeiten stets denselben Inhalt. Der Moduswechsel darf keine Formatierung entfernen oder Inhalte umwandeln.
- Die Desktop-Version startet als primaere Arbeitsflaeche. iPhone und iPad folgen mit derselben fachlichen Struktur, aber anderer Interaktion.
- Der Dark Mode ist eine vollwertige Darstellung, keine reine Farb-Invertierung.

## Informationsarchitektur

Die Navigation oeffnet `Notizen` als eigene Arbeitsflaeche. Sie nutzt die gleiche Tab-Leiste wie [docs/03-aufgaben.md](03-aufgaben.md):

- Geoeffnete Notizen erscheinen als Tabs neben Aufgabenansichten.
- Ein Klick auf eine Notiz in der Liste oeffnet oder aktiviert ihren Tab.
- Der aktive Tab zeigt genau eine editierbare Notiz.
- Mindestens ein stabiler Startpunkt `Notizen` bleibt erreichbar, auch wenn einzelne Notiz-Tabs geschlossen werden.

Auf Desktop besteht die Ansicht aus zwei Bereichen:

| Bereich | Inhalt | Verhalten |
| --- | --- | --- |
| Notizliste links | Suche, angeheftete und zuletzt bearbeitete Notizen | feste, schmale Arbeitsliste; unabhaengig vom Editor scrollbar |
| Editor rechts | Titel, Inhalt und kontextbezogene Werkzeuge | primaere, frei editierbare Textflaeche |

Die Liste ist keine tiefe Ordnernavigation. Die flache Leiste `Seiten` aus [docs/01-kern-workflow-taegliche-planung.md](01-kern-workflow-taegliche-planung.md) filtert die Liste bei Bedarf; sie ersetzt Ordner, verschachtelte Projekte und Mehrfach-Tags.

## Notizmodell

| Feld | Zweck |
| --- | --- |
| Stabile ID | Plattformunabhaengige Referenz fuer Tabs, Links und spaeteren Sync |
| Titel | Erste Textzeile oder bewusst gesetzter Titel |
| Inhalt | Geordnete Folge formatierter Text- und Inhaltsbloecke |
| Erstell- und Aenderungszeit | Sortierung, lokale Speicherung und spaeter Synchronisation |
| Angeheftet | Hebt wichtige Notizen in der Liste hervor |
| Verknuepfungen | Referenzen auf Aufgaben, andere Notizen und spaeter Projekte |
| Seite | Optionaler flacher Kontext; Aufgaben und Notizen haben hoechstens eine Seite |

Der Inhalt ist intern blockbasiert, auch wenn er sich im Easy Mode wie eine zusammenhaengende Seite anfuehlt. Das erlaubt spaeter Tabellen, Code oder LaTeX, ohne alte Textnotizen migrieren zu muessen.

## Easy Mode

### Editor

Der Editor ist eine freie Schreibflaeche ohne Rahmen und ohne Werkzeugleiste: nur Titel und Text. Formatiert wird ohne sichtbare Menues:

- **Markdown-Kuerzel** am Zeilenanfang: `# ` Ueberschrift 1, `## ` Ueberschrift 2, `- ` Aufzaehlung, `1. ` nummerierte Liste, `[ ] ` To-do-Liste, `---` Trennlinie; ausserdem `**fett**`, `*kursiv*`.
- **Tastenkuerzel:** `Ctrl/Cmd + B` fett, `+ I` kursiv, `+ U` unterstrichen, `+ Shift + H` Hervorhebung.
- **`/`-Menue:** Ein `/` am Zeilenanfang oder nach einem Leerzeichen oeffnet am Cursor eine kleine Auswahl (Text, Ueberschrift 1 und 2, Aufzaehlung, nummerierte Liste, To-do-Liste, Trennlinie, `Als Aufgabe fuer Heute`, `Als Aufgabe in die Inbox`). Weitertippen filtert, `Pfeiltasten` waehlen, `Enter` fuehrt aus, `Esc` schliesst. Das Menue erscheint nur auf Abruf.
- **Links** entstehen automatisch beim Tippen oder Einfuegen einer Adresse; nur `http`, `https` und `mailto` sind erlaubt.

Die Platzhalterzeile einer leeren Notiz weist auf das `/`-Menue hin. Im Easy Mode bietet es nur die Basisbausteine.

### Schreibfokus

Sobald der Nutzer in einer Notiz tippt (Titel oder Text), blenden sich die Notizliste, die Aktionen (`Anheften`, `Loeschen`, Speicherstatus) und die verknuepften Aufgaben aus. Der Platz bleibt erhalten, damit sich der Text nicht verschiebt. Die **Hauptnavigation bleibt sichtbar**: Sie wird ausschliesslich manuell mit dem Pfeil eingeklappt; dann gleitet der Text weich in die Mitte des frei gewordenen Platzes. Sobald die Maus bewegt oder geklickt wird, erscheinen die ausgeblendeten Bereiche wieder; kleinste Zitterbewegungen (unter 3 px) zaehlen nicht. Pfeil- und Tastenkuerzel loesen den Schreibfokus nicht aus, Eingaben in der Suchleiste ebenfalls nicht. Fehlermeldungen bleiben immer sichtbar. Waehrend des Schreibfokus ist der Mauszeiger ausgeblendet.

### Aufgaben aus Notizen

Ein To-do innerhalb einer Notiz kann lokal als Checkliste bleiben. Wird daraus eine verbindliche Aufgabe erstellt, entsteht ein `Task` mit Verknuepfung zur Notiz:

- Das `/`-Menue an einer Zeile bietet `Als Aufgabe fuer Heute` und `Als Aufgabe in die Inbox` (die Aufgabe nimmt den Text der Zeile).
- Bei `Heute` wird die Aufgabe unmittelbar im Tagesplan und in der Aufgabenansicht sichtbar; sie uebernimmt die Seite der Notiz, sofern eine gesetzt ist.
- Aufgabe und Notiz bleiben verknuepft, es entstehen keine doppelten Inhalte.

### Schnellerfassung und Suche

- `Ctrl/Cmd + N` oeffnet weiterhin die globale Erfassung und kann eine neue Notiz erzeugen.
- Eine neue Notiz erhaelt zunaechst einen Titel aus der ersten nicht-leeren Textzeile.
- Die Notizliste bietet eine einfache lokale Volltextsuche in Titel und Inhalt.
- Angeheftete Notizen stehen vor zuletzt bearbeiteten Notizen.

## Advanced Mode

### Grundsatz

Der Advanced Mode blendet weitere Bausteine und eine erweiterte Werkzeugleiste ein. Ein Basic-Text bleibt Basic-Text, bis der Nutzer bewusst einen erweiterten Block anlegt oder formatiert.

### Erweiterte Inhalte

| Funktion | Zweck |
| --- | --- |
| Unterseiten | Lange Themen in eigenstaendige, verlinkbare Notizen auslagern |
| Tabellen | Strukturierte Informationen direkt in einer Notiz darstellen |
| Zitat | Externe Aussage oder wichtige Entscheidung sichtbar absetzen |
| Codeblock | Quellcode oder technische Beispiele unveraendert darstellen |
| LaTeX-Block | Mathematische Ausdruecke formatiert anzeigen |
| HTML-Block | HTML als Inhalt oder Vorschau behandeln; Ausfuehrung ist nicht Teil von v1 |
| Textfarben und -groessen | Bewusste Hervorhebung oder hierarchische Darstellung |
| Seitenverlinkung | Eine andere Notiz direkt referenzieren, etwa `[[Quartalsplanung]]` |
| Eingebettete Aufgaben | Verknuepfte Aufgaben im Notizkontext anzeigen |

Der `+`-Button und ein `/`-Befehl innerhalb einer leeren Zeile oeffnen die Auswahl fuer Blocktypen. Im Easy Mode zeigt dieselbe Interaktion nur die Basisbausteine.

### Unterseiten

Unterseiten sind ausschliesslich eine Advanced-Mode-Funktion. Sie sind normale Notizen mit einer Elternreferenz und koennen auch ueber Suche, Verlinkung oder Tabs erreicht werden. Der Nutzer kann daher Inhalte wiederfinden, ohne einen Ordnerbaum aufklappen zu muessen.

## Dark Mode und visuelle Regeln

Notizen folgen der gemeinsamen, neutralen Notion-artigen Grauskala aus [docs/01-kern-workflow-taegliche-planung.md](01-kern-workflow-taegliche-planung.md). Der globale Schalter in den Einstellungen wechselt die gesamte Anwendung zwischen Hell und Dunkel.

- Die Textflaeche ist im Hellmodus weiss und im Dunkelmodus fast schwarz, nicht rein schwarz.
- Text, Linien, Auswahl und deaktivierte Elemente verwenden definierte Kontraststufen; Inhalte duerfen nicht nur durch Farbe unterscheidbar sein.
- Hervorhebungen, Textfarben und Codebloecke werden fuer beide Modi als eigene Farbtokens definiert. Eine gelbe Markierung im Hellmodus darf im Dunkelmodus nicht unlesbar oder grell werden.
- Ecken bleiben leicht gerundet, Flaechen ruhig und ohne dekorative Farbverlaeufe.
- To-do-Listen nutzen die gleichen eckigen Checkboxen wie `Heute` und `Aufgaben`.

## Speicher- und Fehlerverhalten

- Text wird nach einer kurzen Eingabepause sowie beim Wechsel der Notiz lokal gespeichert.
- Ein Speichervorgang blockiert nicht die Eingabe.
- Der Editor zeigt einen unaufdringlichen lokalen Speicherstatus.
- Wenn lokales Speichern fehlschlaegt, bleibt der sichtbare Inhalt erhalten und eine dauerhafte Fehlermeldung informiert ueber den nicht gesicherten Zustand.
- Bei einem unerwarteten Programmende wird der zuletzt lokal gesicherte Stand geladen.

## Plattformentscheidung

### Desktop

Links Notizliste, rechts Editor, oben gemeinsame Tab-Leiste. Tastaturbefehle und Auswahlformatierung sind primaere Interaktionen.

### iPhone

Liste und Editor sind getrennte, flache Ansichten. Die Easy-Mode-Werkzeuge liegen kompakt oberhalb der Tastatur. Komplexe Advanced-Blöcke bleiben lesbar, ihre umfangreiche Bearbeitung wird spaeter gezielt bewertet.

### iPad

Notizliste und Editor koennen nebeneinander stehen. Ein zukuenftiger Stift- oder Dokumentbereich ist ein eigener Inhaltstyp und wird nicht als Bild in einen Textblock gezwungen. SwiftUI-spezifische Handschrift- und PDF-Entscheidungen folgen in einer separaten iPad-Spezifikation.

## Bewusst nicht enthalten

- Frei konfigurierbare Datenbanken, Formeln und Automationen.
- Echtzeit-Kollaboration und Kommentare.
- Ausfuehrbarer oder unsandboxierter HTML-/JavaScript-Inhalt.
- Handschrifterkennung, PDF-Annotation und Stiftwerkzeuge.
- Eingebettete PDFs und Dateien. Sie folgen nach V1 als eigener Anhangstyp mit lokaler Speicherung, Vorschau und klaren Exportregeln; ein Dateilink kann vorher als schlanke Alternative bewertet werden.
- Vollstaendige Ordner- und Projektstruktur; diese werden im separaten Projektkonzept geplant.

## Umsetzungsstand (Desktop, erste Version)

Umgesetzt:

- Tab-Leiste oben in der Notizen-Ansicht: fester Startpunkt `Notizen`, je geoeffnete Notiz ein Tab mit `x`, `+` fuer eine neue Notiz. Ein Klick auf eine Notiz in der Liste (oder der Notiz-Hinweis an einer Aufgabe) oeffnet oder aktiviert ihren Tab. Beim Schliessen wird der vorherige Tab aktiv, zuletzt der Startpunkt. Die geoeffneten Tabs bleiben nach einem Neustart erhalten; geloeschte Notizen verschwinden daraus. Beim Schreiben blendet sich die Tab-Leiste mit aus.
- Notizen-Ansicht mit schmaler, in der Breite ziehbarer Notizliste links (Suche, `Angeheftet`, `Zuletzt bearbeitet`) und Editor rechts.
- Freie Schreibflaeche ohne Werkzeugleiste mit Markdown-Kuerzeln, Tastenkuerzeln und `/`-Menue (Text, Ueberschrift 1 und 2, Aufzaehlung, nummerierte Liste, To-do-Liste mit eckigen Checkboxen, Trennlinie, Als Aufgabe), Hervorhebung, automatische Links (nur `http`, `https`, `mailto`). Der Inhalt wird blockbasiert als JSON gespeichert; der Editor wird erst beim Oeffnen einer Notiz nachgeladen.
- Schreibfokus: beim Tippen verschwinden Notizliste und Aktionen, bis die Maus bewegt wird; die Hauptnavigation bleibt und wird nur manuell eingeklappt.
- Titel: eigener Titel oder, wenn leer, die erste nicht-leere Textzeile; eine leere Notiz heisst `Neue Notiz`.
- Automatisches Speichern nach kurzer Eingabepause, beim Verlassen des Titelfelds und beim Wechsel der Notiz; unaufdringlicher Status `Lokal gespeichert`, bei Fehlern eine dauerhafte Meldung bei erhaltenem Text.
- Volltextsuche ueber Titel und Inhalt; Anheften (aendert die Bearbeitungszeit nicht); Loeschen in den Papierkorb mit `Rueckgaengig`.
- Aufgaben aus Notizen: `Als Aufgabe ...` im `/`-Menue legt aus der aktuellen Zeile eine Aufgabe fuer `Heute` oder die `Inbox` an und verknuepft sie mit der Notiz. Unter dem Editor stehen die `Verknuepften Aufgaben`; an Aufgabenzeilen oeffnet der Hinweis `Notiz` die verknuepfte Notiz. Wird die Notiz geloescht, verschwindet nur der Hinweis; bei Wiederherstellung ist er wieder da.
- Schnellerfassung (`Ctrl/Cmd + N`) kann zwischen `Aufgabe` und `Notiz` wechseln; eine neue Notiz oeffnet sich sofort zum Schreiben.

Noch offen:

- Tab-Leiste auch fuer Aufgabenansichten (bisher nur fuer Notizen).
- Zuordnung zu einer Seite (`Privat`, `Arbeit`, ...) und die Filterung der Liste danach.
- Die Schnellnotiz der Heute-Seite ist weiterhin ein eigenes Feld des Tagesplans (nicht in der Notizliste, bis sie mit `Als Notiz sichern` uebernommen wird); der rechte Heute-Bereich kann jede vorhandene Notiz bearbeiten.
- Direkte Aktion `Als Aufgabe` an jedem einzelnen To-do (bisher ueber das `/`-Menue fuer die aktuelle Zeile); der `+`-Button fuer Blocktypen.
- Advanced-Mode-Bausteine (Unterseiten, Tabellen, Zitat, Codeblock, LaTeX, HTML, Textfarben, Seitenverlinkung, eingebettete Aufgaben) und das `/`-Menue.
- Die Suche in der Notizliste beachtet Gross-/Kleinschreibung nur fuer ASCII-Zeichen (die globale Suche mit `Ctrl/Cmd + K` behandelt auch Umlaute korrekt).

## Naechster Schritt

Einen klickbaren Notiz-Dummy erstellen: gemeinsame Tab-Leiste, feste Notizliste, leerer Editor, Easy-Mode-Toolbar und Darstellung von mindestens einer Aufgabenverknuepfung. Advanced-Blocktypen werden darin nur als Erweiterungsmenue sichtbar gemacht, nicht vollstaendig implementiert.