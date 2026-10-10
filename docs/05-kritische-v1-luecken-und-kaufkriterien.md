# Kritische V1-Luecken und Kaufkriterien

## Empfehlung

Die bestaetigten V1-Funktionen werden im Kernworkflow verankert: globale Suche, Papierkorb, eine flache Seitenleiste und eine interaktive Einfuehrung; PDFs und Dateien bleiben ein separater Bereich nach V1.

## Ziel und Annahmen

Diese Einschaetzung nimmt die Perspektive einer Einzelperson ein, die ihre bisher verstreuten Aufgaben, Meeting-Notizen und Tagesplanung dauerhaft in diese Anwendung verlagern moechte.

Die vorhandene Planung hat bereits eine starke Grundlage:

- `Heute` als klarer Startpunkt statt leerer Arbeitsbereich.
- Schnellerfassung ohne vorherige Einordnung.
- Lokaler, offline-faehiger Betrieb ohne Konto.
- Eine gemeinsame Wahrheit fuer Aufgaben in Tagesplan, Liste und Notizen.
- Easy Mode als schnelle Oberflaeche, Advanced Mode als progressive Erweiterung.

Die folgenden Vorschlaege sind keine Marktbehauptungen. Sie sind die Mindest-Erwartung an ein Werkzeug, dem ein Nutzer nach einigen Wochen echte Arbeitsinhalte anvertrauen soll.

## Kritische Sicht: Was ein kaufender Nutzer erwarten wuerde

Die Anwendung muss drei Fragen jederzeit schnell beantworten:

1. Was muss ich jetzt tun?
2. Wo finde ich den Kontext zu einer Aufgabe oder Entscheidung wieder?
3. Kann ich meine Inhalte sicher behalten, verschieben und wiederherstellen?

Der aktuelle Entwurf beantwortet die erste Frage fuer den heutigen Tag schon gut. Fuer laenger laufende Arbeit fehlen jedoch vier tragende Dinge:

- Aufgaben und Notizen haben keinen flachen fachlichen Zusammenhang oberhalb einer einzelnen Verknuepfung.
- Eine Aufgabe kann noch nicht verlaesslich fuer ein bestimmtes spaeteres Datum vorgemerkt werden.
- Die Suche ist als Funktion genannt, aber ihr Ergebnis, Umfang und die Navigation zum Fundort sind nicht festgelegt.
- Lokale Speicherung ohne Export, Import und Backup ist fuer einen produktiven Umstieg zu riskant.

Ohne diese Bausteine bliebe das Produkt ein angenehmer Tagesplaner. Mit ihnen wird es eine glaubwuerdige persoenliche Arbeitszentrale.

## Muss fuer V1

### 1. Daten gehoeren dem Nutzer

Lokale Speicherung allein reicht nicht aus. Ein Nutzer muss vor einem Geraetewechsel, einer defekten Installation oder einem Fehlklick keine Sorge um seine Arbeitsnotizen haben.

**V1-Umfang:**

- Manueller Export des gesamten Bestands in einem dokumentierten, lesbaren Format.
- Import desselben Formats auf demselben oder einem anderen Geraet.
- Lokales Backup mit Wiederherstellungspunkt; mindestens vor Import und vor einer Datenmigration.
- Papierkorb fuer Aufgaben und Notizen mit Wiederherstellen und endgueltigem Leeren.
- Klarer Speicherort und Status der letzten erfolgreichen Sicherung in den Einstellungen.

**Nicht erforderlich:** Cloud, Konto, automatische Geraetesynchronisation oder Ende-zu-Ende-Verschluesselung. Diese Themen werden erst sinnvoll, wenn der lokale Umgang mit Export und Wiederherstellung verprobt ist.

### 2. Durchgaengige Suche und schnelles Wiederfinden

Eine Notiz-App wird ab dem ersten vollen Monat an ihrem Wiederfinden gemessen. Die Suche darf deshalb nicht nur eine gefilterte Liste sein.

**V1-Umfang:**

- Eine globale Suche ueber Aufgabentitel, Notiztitel, Notizinhalt und Tagesnotizen.
- Ergebnisse zeigen Typ, Titel, kurzen Textausschnitt und passenden Bereich.
- Ein Ergebnis oeffnet genau den Fundort; bei einer Notiz wird die passende Textstelle hervorgehoben.
- Suche findet auch erledigte Aufgaben und archivierte Tage, sofern der Nutzer sie nicht bewusst ausschliesst.
- `Ctrl/Cmd + K` oeffnet die Suche sofort aus jeder Hauptansicht.

**Easy/Advanced:** Im Easy Mode genuegen Suchfeld und Ergebnisliste. Advanced kann spaeter Filter nach Zeitraum, Bereich und Inhaltstyp ergaenzen.

### 3. Flache Bereiche fuer dauerhaften Kontext

Die vier Status `Inbox`, `Heute`, `Demnaechst` und `Erledigt` beschreiben den Zeitpunkt einer Aufgabe, nicht ihren Grund. Ohne fachliche Einordnung vermischen sich beispielsweise Arbeit, Privatleben und mehrere parallel laufende Vorhaben in einer Liste.

**V1-Umfang:**

- Ein optionaler `Bereich` fuer Aufgaben und Notizen, zum Beispiel `Arbeit`, `Privat` oder `Umzug`.
- Bereiche sind eine flache, kurze Liste und keine verschachtelte Projektstruktur.
- Ein Inhalt hat hoechstens einen Bereich; kein Mehrfach-Tagging in V1.
- Beim Erfassen ist kein Bereich Pflicht. Die Inbox bleibt reibungsfrei.
- In Aufgaben und Notizen kann nach Bereich gefiltert werden; `Heute` zeigt weiterhin alles, damit der Tag nicht in getrennte Arbeitswelten zerfaellt.

**Begruendung:** Ein einzelnes, optionales Feld verbessert Ordnung, Suche und spaetere Archivierung deutlich, ohne Ordner, Labels, Projekte oder Datenbanken einzufuehren.

### 4. Optionale Fälligkeit mit ruhiger Wiedervorlage

`Demnaechst` ist sinnvoll fuer offene Arbeit, ersetzt aber keinen festen Termin. Eine Rechnung, Vorbereitung oder Zusage mit Datum darf nicht nur in einer unsortierten Liste liegen.

**V1-Umfang:**

- Eine Aufgabe kann optional ein Faelligkeitsdatum erhalten.
- Bei Tagesstart erscheinen ueberfaellige und heute faellige Aufgaben als separater, kompakter Vorschlag; sie werden nicht automatisch in den Tagesplan gezogen.
- Nach Faelligkeitsdatum sortierte Aufgaben bleiben in `Demnaechst` sichtbar.
- Das Datum ist im Easy Mode nur bei Bedarf ueber eine unaufdringliche Aktion setzbar; im Advanced Mode kann es als Spalte und Filter erscheinen.

**Bewusste Grenze:** Keine externe Kalenderintegration, keine wiederkehrenden Aufgaben und keine Benachrichtigungen in V1. Diese Funktionen erzeugen dauerhaft Erwartungen an Zuverlaessigkeit und brauchen eine eigene Spezifikation.

### 5. Klaerer Aufgabenabschluss und Rueckkehr in den Plan

Der Tagesabschluss ist richtig gedacht, braucht aber verbindliche Regeln, damit Aufgaben nicht unbemerkt aus dem Blick verschwinden.

**V1-Umfang:**

- Jede nicht erledigte Aufgabe aus `Heute` verlangt beim Tagesabschluss eine explizite Entscheidung: nach morgen, nach `Demnaechst`, in die Inbox oder im Tagesplan behalten.
- `Nach morgen` ist eine Planungsaktion und keine neue Statusart: Die Aufgabe bleibt `Heute`, ihre Aufnahme in den naechsten Tagesplan wird vorgemerkt.
- Ein ueberfaelliger oder mehrfach verschobener Eintrag wird sachlich sichtbar, ohne Schuldgefuehl oder aufdringliche Warnung.
- Erledigte Aufgaben speichern Abschlusszeit und bleiben ueber Suche, Bereich und Archiv auffindbar.

## Soll fuer eine starke erste Nutzung

Diese Funktionen sind klein genug, um frueh zu testen, aber nicht Voraussetzung fuer den ersten geschlossenen Kernworkflow.

| Funktion | Nutzen | Empfohlene Einordnung |
| --- | --- | --- |
| Onboarding fuer den ersten Tag | Erklaert Schnellerfassung, Tagesfokus und Abschluss im Nutzungsmoment | V1, sehr schlank und jederzeit ueberspringbar |
| Anhaenge oder Dateilinks | Verknuepft eine Notiz mit vorhandenen Unterlagen | Nach V1; zunaechst lokaler Dateilink statt eigener Dateispeicher |
| Wiederkehrende Aufgaben | Hilft bei Routinen | Nach V1; erst nach Test von Faelligkeit und Tagesabschluss |
| Vorlagen fuer Notizen | Beschleunigt wiederkehrende Meetings | Nach V1; mit wenigen festen Vorlagen statt Vorlagen-Engine |
| Aufgabenprioritaet und Dauer | Verbessert die realistische Tagesplanung | Bereits als Advanced-V1 vorgesehen |

## Was bewusst nicht in V1 gehoert

Folgende Funktionen wirken auf den ersten Blick vollstaendig, wuerden den ruhigen Kern aber frueh verwischen:

- Teamraeume, Zuweisungen, Kommentare und Freigaben.
- Kanban, Gantt, Abhaengigkeiten und Sprintplanung.
- Mehrfach-Tags, frei definierbare Datenbanken und Formeln.
- Kalender-Synchronisation, E-Mail-Import und externe Automationen.
- Wiederkehrende Aufgaben, Push-Benachrichtigungen und Erinnerungsregeln.
- Handschrift, PDF-Annotation und Dokumentbibliothek.
- Cloud-Synchronisation und Konten.

Das ist keine Absage an diese Bereiche. Jeder davon veraendert entweder das Datenmodell, die Zuverlaessigkeitserwartung oder die Bedienkomplexitaet deutlich und braucht deshalb einen eigenstaendigen Validierungsschritt.

## Bevorzugter V1-Nutzerfluss

### Erfassen

Der Nutzer drueckt `Ctrl/Cmd + N`, schreibt zuerst den Inhalt und kann anschliessend optional Typ, Bereich oder Faelligkeit setzen. Ohne weitere Auswahl wird eine Aufgabe in der Inbox oder eine Notiz in der Notizliste gespeichert.

### Planen

Morgens zeigt `Heute` offene Aufgaben vom Vortag sowie faellige Vorschlaege. Der Nutzer waehlt Tagesfokus und Aufgaben bewusst aus allen Bereichen. Ein Bereich filtert die Bibliotheken, zerschneidet aber nicht den Tagesplan.

### Arbeiten und Nachschlagen

Eine Aufgabe oeffnet ihren verknuepften Notizkontext. Ueber die globale Suche findet der Nutzer auch eine Entscheidung aus einer alten Meeting-Notiz und springt unmittelbar zur Stelle.

### Abschliessen und Vertrauen

Am Tagesende werden offene Aufgaben bewusst weitergeleitet. Vor riskanten Datenoperationen existiert ein Backup; bei Geraetewechsel oder Neuinstallation kann der Nutzer seinen Bestand selbst exportieren und importieren.

## Plattformentscheidung

| Plattform | V1-Prioritaet |
| --- | --- |
| Desktop | Voller Workflow: globales Suchen, Export/Import, Backup, Bereichsfilter, Faelligkeit und Tagesabschluss mit Tastatursteuerung. |
| iPhone | Spaeter Easy Mode: Erfassen, Heute, Suche und Lesen. Bereich und Faelligkeit bleiben schnell setzbar, umfangreiche Verwaltung nicht. |
| iPad | Spaeter Easy Mode mit nebeneinander liegender Liste und Notiz. Bereiche und Suche teilen das Datenmodell; Stift und Annotation bleiben ein eigener Produktbereich. |

## Reihenfolge der Produktarbeit

1. Globales Suchen mit Oeffnen des konkreten Fundorts spezifizieren und im bestehenden Dummy pruefen.
2. Flaches `Bereich`-Modell und optionale Fälligkeit fachlich in Aufgaben, Notizen und Tagesplan verankern.
3. Export, Import, Backup und Wiederherstellung als Vertrauensworkflow spezifizieren.
4. Tagesabschluss mit der Regel `nach morgen` gegen einen realen Wochenablauf testen.

## Festgelegter Stand

Die Funktionen Papierkorb, globale Suche, Seiten und Onboarding sind fuer V1 bestaetigt und in den Kernworkflow uebernommen. Die optionale Faelligkeit bleibt eine noch zu entscheidende V1-Erweiterung. Eingebettete PDFs und Dateien folgen nach V1 als eigener Anhangsbereich.