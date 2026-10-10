# Kern-Workflow: Taegliche Planung und Arbeit

## Empfehlung

Die erste Desktop-Version soll eine persoenliche, lokal gespeicherte Arbeitszentrale sein: Ein gemeinsamer Tagesworkflow mit einem reduzierten Easy Mode und einem per progressiver Offenlegung erweiterten Advanced Mode.

## Ziel und Annahmen

### Produktziel

Das Programm hilft einer einzelnen Person, den Arbeitstag in wenigen Minuten zu strukturieren, Aufgaben im Kontext von Notizen zu bearbeiten und Ergebnisse dauerhaft wiederzufinden. Es soll sich freier als eine reine Aufgaben-App, aber deutlich einfacher als ein vollstaendiger Notion-Arbeitsbereich anfuehlen.

### Annahmen fuer die Dummy-Version

- Die primaere Nutzung erfolgt am Desktop mit Tastatur, Maus, mehreren Fenstern und laengeren Schreibphasen.
- Eine Person arbeitet mit eigenen Notizen und Aufgaben; gemeinsame Bearbeitung, Rollen und Freigaben gehoeren nicht zu v1.
- Alle Daten liegen ausschliesslich lokal auf dem Geraet. Offline-Nutzung ist deshalb der Normalfall.
- Arbeit, Privates und einzelne Vorhaben werden ueber flache Seiten getrennt, ohne den gemeinsamen Tagesplan aufzuteilen.
- Cloud-Synchronisation, Handschrift und PDF-Annotation sind kuenftige Produktbereiche, aber nicht Teil dieses ersten Kern-Workflows.
- Aufgaben und Notizen sind verbunden, aber keine allgemeine Datenbank- oder Wiki-Engine.

### Erfolgskriterium fuer v1

Ein Nutzer kann morgens in unter drei Minuten einen realistischen Tagesplan erstellen, waehrend der Arbeit ohne Kontextwechsel Notizen und Aufgaben aktualisieren und den Tag mit einem kurzen Abschluss sauber beenden.

## Produktprinzipien

- **Heute vor Organisation:** Beim Start ist stets der heutige Arbeitstag sichtbar, nicht eine leere Sammlung von Bereichen.
- **Erfassung ohne Reibung:** Eine neue Aufgabe oder Notiz entsteht von jeder Hauptansicht aus schnell und ohne Formularstrecke.
- **Eine Wahrheit pro Inhalt:** Eine Aufgabe hat genau einen Status und kann an genau einer Notiz als Herkunft oder Arbeitskontext haengen.
- **Ruhig statt konfigurierbar:** Standardansichten und klare Begriffe haben Vorrang vor frei verschachtelten Seiten, Datenbanken und Dashboards.
- **Lokal zuerst:** Der Workflow darf keine Anmeldung, Netzwerkverbindung oder Synchronisationskonflikte voraussetzen.
- **Neutrale Arbeitsflaeche:** Beide Modi verwenden eine reduzierte, Notion-artige Grauskala. Klare Abgrenzungen, Text und Raum strukturieren Inhalte statt dominanter Akzentfarben.
- **Eckige Todos:** Aufgaben nutzen auf allen Desktop-Seiten kompakte, leicht gerundete quadratische Checkboxen statt runder Kontrollfelder.

## Informationsarchitektur

Die Desktop-Navigation besteht aus vier festen Bereichen; ganz unten, getrennt durch eine feine Linie und ueber den Einstellungen, liegt der **Papierkorb** mit einem Zaehler fuer die enthaltenen Eintraege. Er gehoert dorthin, weil er Hilfsfunktion und kein Arbeitsbereich ist. Sie soll dauerhaft schmal bleiben und nicht durch frei erstellbare Hauptbereiche wachsen. Sie laesst sich mit einem Pfeil manuell einklappen; dann bleibt eine schmale Spalte fuer den Ausklapp-Pfeil stehen, damit dieser nie ueber Inhalten liegt, und der Inhalt wird weich in die Mitte des frei gewordenen Platzes verschoben.

| Bereich | Zweck | V1-Inhalt |
| --- | --- | --- |
| Heute | Tagesplanung und aktive Arbeit | Tagesfokus, Zeitplan, Aufgabenliste, Schnellnotiz |
| Aufgaben | Verbindliche Arbeit verwalten | Inbox, Heute, Demnaechst, Erledigt |
| Notizen | Wissen und Arbeitsnotizen finden | Alle Notizen, angeheftete Notizen, Suche |
| Archiv | Abgeschlossene Tage und Inhalte rueckblicken | Vergangene Schnellnotizen, erledigte Aufgaben, Suche |

`Heute` ist der Startbereich. `Aufgaben` und `Notizen` sind gleichwertige Bibliotheken. `Archiv` ist kein Ablagezwang, sondern eine aufgeraeumte Rueckschau auf bereits abgeschlossene Inhalte.

### Seiten

Unterhalb der festen Hauptnavigation liegt eine flache Leiste `Seiten`, vergleichbar mit Tabellenblaettern in Excel. Sie ordnet Inhalte fachlich ein, ohne eine zweite Hauptnavigation oder einen Ordnerbaum zu schaffen.

- V1 startet mit `Alle`, `Privat` und `Arbeit`.
- Der Nutzer kann weitere Seiten fuer konkrete Vorhaben anlegen, etwa `Umzug` oder `Quartalsplanung`.
- Eine Aufgabe oder Notiz kann hoechstens einer Seite zugeordnet sein; die Zuordnung ist optional.
- `Alle` zeigt den gesamten Bestand. Eine gewaehlte Seite filtert Aufgaben, Notizen, Archiv und Suchergebnisse auf ihren Kontext.
- `Heute` zeigt bewusst Aufgaben aller Seiten. Der Tagesplan bleibt eine Arbeitsrealitaet, keine Sammlung getrennter Listen.
- Eine Seite kann erst geloescht werden, nachdem ihre Inhalte nach `Alle` oder auf eine andere Seite verschoben wurden.

Die Seitenleiste ist im Easy Mode sichtbar, aber knapp: Seiten waehlen und eine neue Seite anlegen. Umbenennen, Loeschen und Filterdetails liegen im Advanced Mode oder einem zurueckhaltenden Kontextmenue.

## Kernobjekte und lokale Daten

| Objekt | Pflichtfelder | Zweck |
| --- | --- | --- |
| Aufgabe | Titel, Status, Erstellzeit | Eine konkrete, abschliessbare Arbeitseinheit |
| Tagesplan | Datum | Die Auswahl und Reihenfolge der Aufgaben fuer einen Arbeitstag |
| Notiz | Titel, Text, Erstellzeit, Aktualisierungszeit | Freier Arbeits- oder Wissenskontext |
| Verknuepfung | Aufgabe, Notiz | Zeigt die Notiz, aus der eine Aufgabe entstanden ist oder in der sie bearbeitet wird |
| Seite | Name | Flacher fachlicher Kontext fuer Aufgaben und Notizen |

### Aufgabenstatus

V1 kennt nur vier Statuswerte:

- `Inbox`: erfasst, noch nicht eingeordnet.
- `Heute`: bewusst fuer den aktuellen Tag eingeplant.
- `Demnaechst`: relevant, aber nicht fuer heute festgelegt.
- `Erledigt`: abgeschlossen und im Archiv sichtbar. Wird eine erledigte Aufgabe wieder geoeffnet, kehrt sie in die Kategorie zurueck, aus der sie abgehakt wurde. Erledigte Aufgaben lassen sich einzeln oder gesammelt in den Papierkorb loeschen.

Im Advanced Mode koennen zusaetzlich eigene Kategorien angelegt werden, die den Status ersetzen (Details in [docs/03-aufgaben.md](03-aufgaben.md)).

Eine Aufgabe kann optional eine Prioritaet `Hoch`, `Normal` oder `Niedrig` und eine optionale Dauer-Schaetzung in Minuten haben. Beides ist im Easy Mode nicht notwendig.

### Speicherprinzip

Die Anwendung speichert die Objekte in einem lokalen Anwendungsdatenbereich. Fuer v1 ist entscheidend, dass die Daten ohne Konto, Internet und Cloud-Abhaengigkeit dauerhaft zwischen Programmstarts verfuegbar sind.

V1 enthaelt deshalb einen lokalen Datenvertrauens-Workflow:

- Export des gesamten Datenbereichs in ein dokumentiertes, versionsiertes Format.
- Import eines solchen Exports mit Vorschau und eindeutiger Auswahl: bestehenden Bestand ersetzen oder als getrennten Bestand uebernehmen.
- Automatischer lokaler Wiederherstellungspunkt vor Import und Datenmigration sowie manuelle Sicherung in den Einstellungen.
- Papierkorb fuer geloeschte Aufgaben und Notizen mit Wiederherstellen und endgueltigem Leeren. Einzelne Eintraege und der ganze Papierkorb werden erst nach einer zweiten Bestaetigung (`Sicher?`) endgueltig geloescht; es gibt keine automatische Frist.

Cloud-Synchronisation bleibt eine spaetere, optionale Schicht und ist keine Voraussetzung fuer Sicherung oder Geraetewechsel.

## Easy Mode und Advanced Mode

### Empfehlung

Easy und Advanced Mode sind keine getrennten Produkte und keine getrennten Datenmodelle. Sie zeigen dieselben Aufgaben, Notizen und Tagesplaene mit unterschiedlicher Informationsdichte.

### Easy Mode

Der Standardmodus fuer taegliche Nutzung. Er zeigt nur die Entscheidungen, die fuer einen guten Arbeitstag notwendig sind:

- die eine wichtigste Aufgabe,
- die heutige Aufgabenliste,
- eine kurze Schnellnotiz,
- schnelles Erfassen von Aufgabe oder Notiz,
- Seitenwahl fuer den aktuellen fachlichen Kontext,
- Erledigen, Verschieben und Oeffnen von Kontext.

Easy Mode ist auch die Grundlage fuer die spaetere Handy-Nutzung. Seine Oberflaeche bleibt flach: keine Unterseiten, Projektstruktur oder verschachtelte Navigation. Notizen bestehen aus Text, aufklappbaren Listen und Todos. Nicht sichtbar sind Prioritaetsverwaltung, Zeitschaetzung, Filter, detaillierte Metadaten und Archivnavigation. Diese Daten werden weder geloescht noch verborgen, wenn sie bereits gesetzt wurden; sie werden lediglich nicht in den Vordergrund gestellt.

### Advanced Mode

Der optionale Modus fuer Planung, Rueckblick und komplexere Arbeitstage. Er erweitert die gleichen Ansichten um:

- Prioritaet und geschaetzte Dauer,
- Zeitbloecke im Tagesplan,
- erweiterte Filter und Suche in Aufgaben und Notizen,
- offene Inbox und Demnaechst-Liste,
- Verknuepfungen zwischen Notizen und Aufgaben,
- Rueckblick auf vergangene Tage und erledigte Aufgaben,
- Unterseiten, LaTeX, HTML und gestaltete Textinhalte mit Farben.
- Konfiguration der sichtbaren Bausteine auf der Seite `Heute`.

Die Einstellungen enthalten zwei klar getrennte Schalter: Easy/Advanced Mode und Hell/Dunkel-Darstellung. Beide gelten fuer die gesamte Anwendung, bleiben lokal erhalten und sind nicht prominent im Tagesablauf platziert. Ein Moduswechsel ist sofort und ohne Migration moeglich. Die detaillierte Planung des Advanced Mode erfolgt nach dem Test des Easy-Mode-Kernworkflows.

## Tagesworkflow

### 1. Tagesstart: Orientierung

Beim ersten Oeffnen eines Tages erscheint die Ansicht `Heute` mit einem ruhigen, vorbereiteten Zustand:

- Datum und Wochentag oben.
- Ein Feld `Was ist heute wichtig?` fuer die wichtigste Aufgabe.
- Die Aufgaben vom Vortag, die nicht erledigt wurden, im Abschnitt `Offen von gestern`.
- Eine leere Liste `Heute`.
- Eine leere **Schnellnotiz** fuer den Tag (Platzhalter `Schnellnotiz fuer heute – morgen ist sie wieder leer`). Sie ist an jedem Tag neu und leer; ihr Text bleibt dem jeweiligen Tag zugeordnet. Wichtiges laesst sich mit `Als Notiz sichern` in eine eigene Notiz uebernehmen.

Der Nutzer kann offene Aufgaben per Klick nach heute uebernehmen, in `Demnaechst` verschieben oder als erledigt markieren. Ein Pfeil-nach-oben-Icon neben jeder Aufgabe uebernimmt sie direkt in die Liste `Heute`. Es gibt keine automatische Uebernahme: Der Tagesplan soll eine bewusste Entscheidung bleiben.

### 2. Planung: Realistischen Fokus setzen

Der Nutzer waehlt zuerst eine Aufgabe als Tagesfokus. Danach fuegt er weitere Aufgaben aus der Inbox, aus `Demnaechst` oder direkt per Schnellerfassung hinzu.

Im Easy Mode zeigt die heutige Liste maximal sieben sichtbare Aufgaben, bevor ein Hinweis `Weitere Aufgaben anzeigen` erscheint. Das ist keine harte Begrenzung, sondern eine sanfte Bremse gegen Ueberplanung.

Im Advanced Mode kann der Nutzer Dauer-Schaetzungen erfassen und Aufgaben in Zeitbloecke ziehen. Die Anwendung zeigt die Gesamtdauer der geplanten Aufgaben gegenueber der frei gesetzten Arbeitszeit. Sie verhindert keine Planung, warnt aber bei deutlicher Ueberbuchung.

### 3. Arbeit: Aufgabe und Kontext zusammenhalten

Die aktive Aufgabe wird im Tagesplan durch Auswahl hervorgehoben. Ein Klick oeffnet rechts einen Kontextbereich, ohne die Tagesansicht zu verlassen:

- Titel und Status der Aufgabe.
- Verknuepfte Notiz oder die Aktion `Notiz anlegen`.
- Kurze Notizen direkt zur Aufgabe.
- Aktionen: erledigen, auf morgen verschieben, aus dem Tagesplan entfernen.

Wird aus einer Notiz eine Aufgabe erstellt, verknuepft das Programm beide Objekte automatisch. Direkt an der markierten Zeile oder dem To-do waehlt der Nutzer `Inbox` oder `Heute`; die letzte Wahl ist fuer die aktuelle Notiz vorausgewaehlt. Bei `Heute` erscheint die Aufgabe sofort im Tagesplan, in der Aufgabenansicht und als verknuepfte Aufgabe der Notiz. Es ist kein nachtraegliches Verschieben erforderlich.

Der rechte Bereich zeigt nicht zwingend eine einzelne, fest zugeordnete Tagesnotiz. Oben waehlt der Nutzer ueber ein zentriertes Auswahlfenster (Suchfeld und Liste, per Tastatur bedienbar) eine Arbeitsnotiz aus: die Schnellnotiz des Tages (Standard) oder eine vorhandene Notiz, die dann im Bereich bearbeitet wird (Titel und Text mit Autosave, `In Notizen oeffnen`, Aufgaben per `/`-Menue). Die Auswahl gilt nur fuer den Tag, an dem sie getroffen wurde; am naechsten Tag steht wieder die Schnellnotiz bereit. Diese Auswahl ist eine Ansichtseinstellung und verschiebt oder kopiert keine Inhalte. So bleibt der Tagesplan bei mehreren Meetings mit getrennten Notizen nutzbar.

### 4. Zwischendurch: Schnellerfassung

Ein dauerhaft erreichbarer Button `Erfassen` und ein Tastaturkuerzel oeffnen eine kleine, globale Erfassung. In der Navigation stehen oben untereinander der Einklapp-Pfeil, darunter die Suchleiste (`⌕ Suchen`, Kuerzel `Strg/Cmd + K`) und darunter der Eintrag `+ Erfassen` (Kuerzel `Strg/Cmd + N`). Beide sind schlichte, rahmenlose Eintraege in gedaempfter Schrift ohne gefuellte Flaeche; sie unterscheiden sich durch Symbol und Beschriftung. Der Nutzer beginnt direkt zu tippen und waehlt erst bei Bedarf `Aufgabe` oder `Notiz`.

- Neue Aufgabe: landet standardmaessig in der Inbox.
- Neue Notiz: erhaelt einen vorlaeufigen Titel aus der ersten Textzeile und bleibt sofort editierbar.
- Erfassung aus einer geoeffneten Notiz: bietet zusaetzlich `Als Aufgabe aus dieser Notiz` mit der direkten Zielwahl `Inbox` oder `Heute` an.

`Aufgabe hinzufuegen` unter der Liste `Heute` ist bewusst eine andere, lokale Aktion: Sie erzeugt unmittelbar eine Aufgabe fuer heute. Die globale Erfassung dient dem schnellen Festhalten ohne Planungsentscheidung und legt neue Aufgaben deshalb in der Inbox ab. Die Erfassung darf den aktuellen Arbeitskontext nicht verdecken oder zu einer Vollbildansicht wechseln.

### 5. Tagesabschluss: Abschliessen statt aufraeumen

Beim Schliessen der Anwendung und beim ersten Oeffnen am Folgetag wird ein unaufdringlicher Abschluss angeboten, nie erzwungen:

1. Erledigte Aufgaben bestaetigen.
2. Verbleibende Aufgaben bewusst nach `Heute`, `Demnaechst` oder `Inbox` einordnen.
3. Optional einen Satz in die Tagesnotiz schreiben: `Was bleibt wichtig?`

Der abgeschlossene Tagesplan ist danach im Archiv sichtbar. Aufgaben behalten ihren Verlauf; die Tagesnotiz bleibt durchsuchbar.

### 6. Wiederfinden: Globale Suche

`Ctrl/Cmd + K` oeffnet aus jeder Hauptansicht eine globale Suche. Sie durchsucht Aufgabentitel, Notiztitel, Notizinhalte und Tagesnotizen einschliesslich Archiv.

- Ein Ergebnis zeigt Inhaltstyp, Titel, passenden Textausschnitt, Seite und Datum.
- Das Auswaehlen oeffnet den konkreten Fundort; eine Fundstelle in einer Notiz wird hervorgehoben.
- Im Easy Mode stehen nur die Filter `Alles`, `Aufgaben` und `Notizen` bereit.
- Im Advanced Mode ergaenzen Filter fuer `Titel`, `Inhalt`, `Datum`, `Seite`, Status und Archiv den gleichen Suchdialog.

**Umsetzungsstand:** `Ctrl/Cmd + K` (und der Knopf `Suchen` oben in der Navigation) oeffnet den Suchdialog aus jeder Ansicht; derselbe Kuerzel schliesst ihn wieder. Gesucht wird in Aufgabentiteln, Notiztiteln, Notizinhalten sowie in Schnellnotizen und Tagesfokus aller Tage, ohne Beachtung der Gross-/Kleinschreibung (auch fuer Umlaute). Mehrere Woerter muessen alle vorkommen. Treffer zeigen Art (`Aufgabe`, `Notiz`, `Schnellnotiz`), Titel, einen Textausschnitt mit hervorgehobenen Suchbegriffen sowie bei Aufgaben Kategorie und Datum; Titeltreffer stehen vor Inhaltstreffern, hoechstens 50 Treffer. Bedienung per `Pfeiltasten`, `Enter` (oeffnen) und `Esc`. Easy Mode: Filter `Alles`, `Aufgaben`, `Notizen` (Schnellnotizen zaehlen zu `Notizen`). Advanced Mode: zusaetzlich `Schnellnotizen` sowie der Suchbereich `Titel & Inhalt`, `Titel`, `Inhalt`.

Auswaehlen oeffnet den Fundort: eine Notiz in der Notizen-Ansicht (als Tab), eine Aufgabe in der Aufgabenansicht in ihrer Kategorie und hervorgehoben, die Schnellnotiz von heute auf der Startseite, die eines frueheren Tages als Vorschau mit `Als Notiz sichern` (bis es das Archiv gibt).

Noch offen: Hervorhebung der Fundstelle im Notiztext, die Filter `Datum`, `Seite` und Status sowie `Archiv`, und die Anzeige der Seite im Treffer (Seiten gibt es noch nicht).
## Zentrale Desktop-Ansichten

### Heute

Die Ansicht nutzt drei stabile Spalten:

| Bereich | Inhalt | Verhalten |
| --- | --- | --- |
| Navigation | Heute, Aufgaben, Notizen, Archiv, Schnellerfassung | schmal und im Desktop-Fenster fest |
| Tagesplan | Fokus, heutige Aufgaben, im Advanced Mode Zeitbloecke | primaere und eigenstaendig scrollbare Arbeitsflaeche |
| Kontext | Auswaehlbare Arbeitsnotiz oder Details der ausgewaehlten Aufgabe | fest, eigenstaendig ein- und ausklappbar |

Auf dem Desktop fuellt die Ansicht das Fenster. Navigation und Arbeitsnotiz scrollen nicht mit dem Tagesplan; nur die mittlere Arbeitsflaeche scrollt bei langem Inhalt. Der Kontext ist standardmaessig als auswaehlbare Arbeitsnotiz sichtbar. Ein heller, rahmenloser Pfeil sitzt vollstaendig innerhalb des rechten Notizbereichs oben am linken Rand. Nach dem Einklappen wechselt er sichtbar an den rechten Rand der Arbeitsflaeche und bleibt dort erreichbar. Die Leiste gleitet dabei horizontal ein oder aus, statt abrupt zu verschwinden. Die gleiche zurueckhaltende Symbolsprache gilt fuer den Pfeil, der eine Aufgabe von gestern nach heute uebernimmt.

### Heute anpassen

Die Standardansicht besteht aus Tagesfokus, Aufgaben fuer heute, offenen Aufgaben von gestern und einer separaten Arbeitsnotiz-Seitenleiste. Im Advanced Mode oeffnet ein Button `Seitenlayout bearbeiten` einen klar abgegrenzten Bearbeitungszustand fuer die drei Hauptbausteine im Tagesplan.

- An jedem sichtbaren Hauptbaustein erscheint oben rechts, knapp ausserhalb seiner Begrenzung, ein kleines graues Minus-Symbol. Es wird nur im Layout-Bearbeitungsmodus gezeigt und blendet den Baustein aus.
- Zwischen den Bausteinen erscheinen beim Hover dezente Plus-Symbole. Ein Klick oeffnet eine kleine Liste der ausgeblendeten Bausteine; der gewaehlte Baustein wird exakt an dieser Stelle wieder eingefuegt.
- Sichtbare Bausteine koennen per Drag and drop neu angeordnet werden, etwa den Tagesfokus unter die Todos zu ziehen.
- Die Anpassung veraendert nur Sichtbarkeit und Reihenfolge auf `Heute`; sie loescht keine Aufgaben oder Notizen und legt keine alternative Seitenstruktur an.
- Die Arbeitsnotiz ist kein entfernbarer Layoutbaustein. Sie wird ausschliesslich ueber ihren eigenen Pfeil ein- oder ausgeklappt.

Im Easy Mode wird die Layoutkonfiguration nicht gezeigt, damit die Tagesansicht auf Desktop und Handy vorhersagbar bleibt.

### Aufgaben

Eine klare Listenansicht mit vier Tabs: `Inbox`, `Heute`, `Demnaechst`, `Erledigt`. Jede Zeile hat eine Checkbox, einen Titel und den aktuellen Status. Im Advanced Mode kommen Prioritaet, Dauer und verknuepfte Notiz hinzu.

### Notizen

Links steht eine durchsuchbare Liste, rechts die editierbare Notiz. Angeheftete Notizen stehen oben. Eine Notiz kann Aufgaben als kompakte Liste anzeigen; diese Liste ist kein zweites Aufgabensystem, sondern zeigt dieselben Objekte wie `Aufgaben`.

### Archiv

Das Archiv beginnt mit einer Liste vergangener Tage. Ein Tag zeigt Fokus, Anzahl erledigter Aufgaben und die Tagesnotiz. Suche findet Inhalte aus Notizen, Tagesnotizen und Aufgabentiteln.

## Wichtige Interaktionen

- **Tastatur:** `Ctrl/Cmd + N` fuer Schnellerfassung, `Ctrl/Cmd + K` fuer Suche, `Enter` fuer eine neue Aufgabe in einer Liste, `Space` zum Erledigen der fokussierten Aufgabe.
- **Drag and drop:** Im Layout-Bearbeitungsmodus des Advanced Mode duerfen die Hauptbausteine der Heute-Seite umsortiert werden. Die detaillierte Aufgabenplanung und das Verschieben zwischen `Inbox`, `Heute` und `Demnaechst` bleiben eine spaetere Advanced-Mode-Entscheidung. Im Easy Mode erfolgen relevante Aufgabenaktionen ueber ein klares Kontextmenue.
- **Rueckgaengig:** Jede Statusaenderung, Verschiebung oder Loeschung zeigt kurz `Rueckgaengig` an.
- **Loeschen:** Loeschen fragt nur bei Notizen mit Inhalt nach. Aufgaben werden zunaechst in einen lokal wiederherstellbaren Papierkorb verschoben.

## Erstes Oeffnen

Beim ersten Programmstart zeigt die App eine kurze, interaktive Einfuehrung, die jederzeit uebersprungen oder in den Einstellungen erneut geoeffnet werden kann. Sie fuehrt nur durch drei konkrete Handlungen: eine Aufgabe oder Notiz erfassen, eine Aufgabe fuer heute waehlen und die Tagesnotiz wiederfinden. Danach startet der Nutzer in einem leeren `Heute` ohne Demo-Daten.

## Leer-, Fehler- und Sonderzustaende

| Situation | Verhalten |
| --- | --- |
| Erster Programmstart | Eine ueberspringbare interaktive Kurzanleitung zeigt Erfassung, Tagesfokus und Notizkontext; danach zeigt Heute einen leeren Tagesplan ohne Demo-Daten. |
| Keine Aufgabe fuer heute | Fokusbereich fragt nach der einen wichtigsten Sache; Nutzer kann bewusst ohne Tagesfokus fortfahren. |
| Inbox ist leer | Aufgabenansicht bietet direkte Erfassung, ohne weitere Erklaertexte. |
| Alle Aufgaben erledigt | Heute zeigt die erledigten Aufgaben eingeklappt und laesst Platz fuer die Tagesnotiz. |
| Unerledigte Aufgaben vom Vortag | Sie werden vorgeschlagen, aber nie automatisch uebernommen. |
| Lokaler Speicher nicht beschreibbar | Eine dauerhaft sichtbare Fehlermeldung erklaert, dass neue Aenderungen nicht gesichert werden; bestehende Inhalte bleiben lesbar. |
| Programm beendet sich unerwartet | Textaenderungen werden regelmaessig lokal gespeichert; beim Neustart wird der letzte sichere Stand geoeffnet. |
| Geloeschte Inhalte waehrend der Testphase | Sie bleiben im manuellen Papierkorb, bis der Nutzer ihn selbst leert. Eine automatische Loeschfrist wird erst nach den Tests entschieden. |

## Umfang der ersten Dummy-Version

### Enthalten

- Desktop-Anwendung mit Heute-, Aufgaben-, Notizen- und Archivansicht.
- Lokale Speicherung von Aufgaben, Tagesplaenen und Textnotizen.
- Easy Mode als Standard, mit einer auf Desktop und Handy gleich flachen Tageslogik.
- Schnellerfassung, Suche, Verknuepfung von Aufgabe und Notiz sowie Rueckgaengig.
- Tagesstart und optionaler Tagesabschluss.
- Seiten fuer `Privat`, `Arbeit` und einzelne Vorhaben sowie Filterung der Bibliotheken.
- Lokaler Export, Import, Backup und Papierkorb als Datenvertrauens-Workflow.
- Interaktive Kurzanleitung beim ersten Oeffnen.

### Bewusst nicht enthalten

- Benutzerkonto, Cloud, Synchronisation und Zusammenarbeit.
- Stifteingabe, Handschrift und PDF-Annotation.
- Frei definierbare Datenbanken, Formeln, Vorlagenmarktplatz und Automationen ausserhalb des spaeteren Advanced Mode.
- Kalenderintegration, Erinnerungen, Benachrichtigungen und E-Mail-Import.
- Komplexe Projektplanung wie Abhaengigkeiten, Gantt oder Kanban.

## Festgelegte Entscheidungen und offene Punkte

- Die erste Version fokussiert Arbeitsplanung. Private Notizen und Erinnerungen folgen spaeter, besonders als iPhone-Workflow.
- Der Easy Mode bleibt auch auf dem Handy flach und schnell erreichbar; Unterseiten und Projektstrukturen gehoeren ausschliesslich in den spaeteren Advanced Mode.
- Ein Advanced-Mode-Zeitblock kann spaeter die Frage `Fokus-Timer starten?` anbieten und den Timer mit der Blockdauer vorbelegen. Der Timer selbst wird jetzt nicht weiter geplant.
- Geloeschte Inhalte bleiben in der Testphase manuell wiederherstellbar. Eine automatische Frist von etwa 14 Tagen ist eine spaetere Option, keine aktuelle Festlegung.

## Naechster Schritt

Den Prototypen der Ansicht `Heute` gegen einen typischen Arbeitstag pruefen: Ist der Tagesfokus sofort klar, lassen sich Todos ohne Reibung erledigen, und bleibt die Tagesnotiz jederzeit erreichbar?