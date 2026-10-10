# Aufgaben: Kategorien, Liste und Ansichten

## Empfehlung

Die Aufgabenansicht startet im Easy Mode mit einer schmalen Kategorien-Spalte direkt rechts neben der Hauptnavigation (Inbox, Heute, Demnaechst, Erledigt) und der Aufgabenliste der gewaehlten Kategorie daneben. Sie nutzt die gleiche neutrale, Notion-artige Grauskala und eckige To-do-Checkboxen wie die Startseite. Der Advanced Mode erhaelt spaeter mehrere Darstellungen desselben Aufgabenbestands, darunter ein drag-and-drop Board im Stil von Microsoft Planner.

## Ziel und Annahmen

- Die Aufgabenansicht ist der Ort zum Erfassen, Einordnen und Abschliessen von Arbeit ausserhalb der konkreten Tagesansicht.
- Eine Aufgabe liegt immer in genau einer Kategorie. Liste, Tagesansicht und spaetere Board-Ansicht zeigen dieselbe Aufgabe, keine Kopien.
- Die erste Arbeitsversion priorisiert einfache Todos und schnelle Statuswechsel vor Projektmanagement oder verschachtelten Strukturen.
- Die Tab-Leiste ist auf Desktop auch im Easy Mode sichtbar. Sie hilft beim schnellen Wechsel zwischen aktuell geoeffneten Arbeitsflaechen, nicht beim Aufbau einer tiefen Navigation.
- Die Planung des Advanced Mode wird nur so weit beschrieben, wie sie das Datenmodell und die Wechselwirkungen mit Easy Mode festlegt.

## Kernmodell

Eine Aufgabe liegt in genau einer **Kategorie**. Die vier festen Kategorien entsprechen den Status aus [docs/01-kern-workflow-taegliche-planung.md](01-kern-workflow-taegliche-planung.md) und haben stabile IDs:

| Kategorie (ID) | Bedeutung | Sichtbar im Easy Mode |
| --- | --- | --- |
| `Inbox` | Neu erfasst, noch nicht bewusst eingeordnet | Ja |
| `Heute` | Fuer den aktuellen Arbeitstag eingeplant | Ja |
| `Demnaechst` | Relevant, aber noch nicht fuer heute geplant | Ja |
| `Erledigt` | Abgeschlossen | Ja |

Im **Advanced Mode** kann der Nutzer zusaetzlich eigene Kategorien anlegen und wieder entfernen (z. B. `Kunde A`). Eigene Kategorien ersetzen den Status: Eine Aufgabe in `Kunde A` liegt dort statt in `Inbox`, `Heute` oder `Demnaechst`. Sie erscheint nicht automatisch auf der Startseite; erst das Verschieben nach `Heute` plant sie fuer den Tag ein.

- Feste Kategorien koennen weder entfernt noch umbenannt werden. Namen eigener Kategorien sind eindeutig (ohne Beachtung der Gross-/Kleinschreibung), nicht leer und hoechstens 60 Zeichen lang.
- Wird eine eigene Kategorie entfernt, wandern ihre Aufgaben in die `Inbox`; das Entfernen laesst sich mit `Rueckgaengig` zuruecknehmen.
- Wechselt der Nutzer vom Advanced Mode zurueck in den Easy Mode, werden eigene Kategorien nur ausgeblendet. Ihre Aufgaben erscheinen dann in der `Inbox`, bleiben aber unveraendert gespeichert und sind im Advanced Mode wieder in ihrer Kategorie.

Eine Kategorieaenderung ist die einzige Quelle der Wahrheit:

- Checkbox in einer Liste: setzt die Aufgabe auf `Erledigt` und merkt sich die Kategorie, aus der sie abgehakt wurde.
- Karte im spaeteren Board nach `Erledigt` ziehen: setzt dieselbe Aufgabe auf `Erledigt`.
- Aufgabe aus `Heute` auf `Erledigt` setzen: Sie erscheint auf der Startseite durchgestrichen und wird in die erledigte Sammlung uebernommen.
- **Eine erledigte Aufgabe wieder oeffnen** (Checkbox deaktivieren): Sie kehrt in die Kategorie zurueck, aus der sie abgehakt wurde. Wurde sie aus `Heute` abgehakt, wird sie wieder fuer heute eingeplant. Existiert die Herkunftskategorie nicht mehr oder ist sie unbekannt, landet die Aufgabe in der `Inbox`.

### Erledigte Aufgaben loeschen

Erledigte Aufgaben sammeln sich in `Erledigt`. Damit die Kategorie uebersichtlich bleibt, gibt es zwei Wege:

- **Einzeln loeschen:** Jede erledigte Aufgabe hat ein `x`, das sie loescht.
- **Alle loeschen:** Ein Knopf `Alle loeschen` in der Kategorie `Erledigt` loescht alle erledigten Aufgaben auf einmal. Offene Aufgaben sind nie betroffen.

Beides verschiebt die Aufgaben zunaechst in den lokalen Papierkorb (weiches Loeschen) und zeigt `Rueckgaengig` an. Es gibt keine Rueckfrage, weil das Loeschen jederzeit zuruecknehmbar ist. Im Papierkorb (ganz unten in der Hauptnavigation) lassen sich Aufgaben wiederherstellen oder erst nach Bestaetigung endgueltig loeschen.

## Tab-Leiste

### Zweck

Die Tab-Leiste liegt am oberen Rand der Aufgaben- und Notizarbeitsflaechen. Sie ist eine minimale Verlauf- und Wechselhilfe fuer Inhalte, die gerade bearbeitet werden. Die Startseite `Heute` verwendet sie nicht, da dort der Tagesfluss Vorrang hat.

### Inhalt

Ein Tab kann darstellen:

- eine Aufgabenansicht wie `Inbox`, `Demnaechst` oder spaeter `Board`,
- eine geoeffnete Notiz, etwa `Meeting: Quartalsplanung`,
- spaeter eine Advanced-Mode-Unterseite innerhalb eines Bereichs.

Die erste Aufgabenansicht oeffnet standardmaessig mit dem Tab `Aufgaben`. Weitere Ansichten oder Notizen oeffnen rechts daneben und koennen mit einem kleinen `x` geschlossen werden. Der aktive Tab ist klar markiert. Mindestens ein Aufgaben-Tab bleibt offen, damit das Schliessen nicht in eine leere Arbeitsflaeche fuehrt.

### Easy Mode

Im Easy Mode bleibt die Leiste bewusst kompakt:

- Sichtbar sind der aktuelle Aufgaben-Tab und wenige zuletzt geoeffnete Tabs.
- Tabs haben nur Name, aktiven Zustand und bei schliessbaren Tabs ein kleines `x`.
- Kein Verschieben, Gruppieren, Teilen oder Anheften von Tabs.
- Auf schmalen Fenstern und auf dem spaeteren Handy wird nur der aktive Tab mit einer einfachen Zurueck-Navigation gezeigt.

## Easy Mode: Aufgabenliste

### Aufbau

Die Ansicht besteht aus zwei Teilen:

1. **Kategorien-Spalte** (links, direkt neben der Hauptnavigation, buendig am Rand): `Inbox`, `Heute`, `Demnaechst`, `Erledigt` als anklickbare Felder, jeweils mit der Anzahl der Aufgaben. Das gewaehlte Feld ist hervorgehoben. Im Advanced Mode folgen darunter eigene Kategorien und `+ Kategorie hinzufuegen`.
2. **Aufgabenliste** (rechts): zeigt die Aufgaben der gewaehlten Kategorie mit Titel, Anzahl und einer Zeile zum Hinzufuegen. In `Erledigt` fehlt die Hinzufuegen-Zeile; dort stehen stattdessen `Alle loeschen` und je Aufgabe ein `x`.

Beim Start ist `Inbox` gewaehlt. Eine Aufgabenzeile enthaelt nur:

- Checkbox zum Abschliessen,
- Titel,
- bei Bedarf einen unaufdringlichen Hinweis auf eine verknuepfte Notiz,
- ein Menue `...` mit `Verschieben nach`, damit sich Aufgaben auch ohne Maus und Ziehen einordnen lassen.

Aufgaben lassen sich per Drag and drop auf ein Feld der Kategorien-Spalte ziehen. Das Feld hebt sich waehrend des Ziehens hervor. Es gibt keine Projektstruktur, Unteraufgaben, Prioritaet, Faelligkeitsdatum oder Zeitplanung im Easy Mode.

### Direkte Aktionen

| Aktion | Ergebnis |
| --- | --- |
| `+ Aufgabe` innerhalb von Inbox | Erstellt eine neue Aufgabe in `Inbox`. |
| `+ Aufgabe` innerhalb von Heute | Erstellt und plant die Aufgabe direkt fuer heute. |
| Checkbox aktivieren | Verschiebt die Aufgabe nach `Erledigt`. |
| Checkbox bei erledigter Aufgabe deaktivieren | Holt sie in die Kategorie zurueck, aus der sie abgehakt wurde (sonst `Inbox`). |
| Aufgabe auf ein Kategorie-Feld ziehen | Legt sie direkt in diese Kategorie; bei `Heute` erscheint sie auf der Startseite. |
| `...` an der Aufgabe, `Verschieben nach` | Wie Ziehen, ohne Maus. |
| `x` an einer erledigten Aufgabe | Loescht sie in den Papierkorb (mit `Rueckgaengig`). |
| `Alle loeschen` in `Erledigt` | Loescht alle erledigten Aufgaben in den Papierkorb (mit `Rueckgaengig`). |
| `+ Kategorie hinzufuegen` (Advanced Mode) | Legt eine eigene Kategorie an und waehlt sie aus. |
| `x` an einer eigenen Kategorie (Advanced Mode) | Entfernt die Kategorie; ihre Aufgaben wandern in die `Inbox` (mit `Rueckgaengig`). |
| Notiz-Hinweis anklicken | Oeffnet die verknuepfte Notiz in einem neuen Tab. |

## Advanced Mode: Ansichtsrahmen

### Grundsatz

Der Advanced Mode erweitert den Zugang zum selben Aufgabenbestand. Ein Wechsel der Ansicht veraendert weder Status noch Reihenfolge einer Aufgabe. Die einfache Liste bleibt immer verfuegbar und ist der verlässliche Rueckzugsort fuer schnelle Todos.

### Ansichtsumschalter

Neben dem Namen des Aufgaben-Tabs erscheint im Advanced Mode ein kompakter Ansichtsumschalter. Die geplanten Ansichten sind:

| Ansicht | Zweck | Planungsstand |
| --- | --- | --- |
| Liste | Schnelle, statusbasierte Todos | Teil von v1 |
| Board | Aufgaben als Karten in Statusspalten | Als naechster Advanced-Prototyp vorgesehen |
| Weitere Ansichten | Zum Beispiel eigene Aufgaben-Seiten oder gefilterte Arbeitslisten | Noch offen |

### Board

Das Board nutzt vier horizontale Spalten: `Inbox`, `Heute`, `Demnaechst` und `Erledigt`. Jede Aufgabe ist eine kompakte Karte.

- Karten koennen per Drag and drop zwischen Statusspalten bewegt werden.
- Das Verschieben aktualisiert sofort den einen Aufgabenstatus, den auch Liste und Startseite verwenden.
- Eine Karte in `Heute` nach `Erledigt` zu ziehen streicht sie auf der Tagesansicht durch.
- Checkboxen auf Karten und in der Listenansicht erledigen die Aufgabe ebenfalls und bewegen sie nach `Erledigt`.
- Innerhalb einer Spalte bestimmt Drag and drop die Reihenfolge.
- Das Board ist eine Alternative zur Liste, kein zweites Aufgabensystem und kein Projektplan.

Das Board bleibt Desktop-first. Auf iPhone und im Easy Mode ist die Listenansicht die Standardinteraktion; mehrere enge Spalten sind dort nicht effizient.

### Spaetere Aufgaben-Seiten

Im Advanced Mode koennen spaeter eigene Aufgaben-Seiten entstehen, etwa eine dauerhaft geoeffnete Arbeitsliste oder eine strukturierte Projektnotiz mit eingebetteten Aufgaben. Diese Seiten duerfen den Kernstatus nicht duplizieren und bekommen kein eigenes, abweichendes To-do-Modell. Ihr genauer Umfang ist offen.

## Zentrale Interaktionen

- `Enter` in einem Abschnitt erzeugt eine neue Aufgabe in genau diesem Abschnitt.
- `Space` auf einer fokussierten Aufgabe aktiviert oder deaktiviert ihre Checkbox.
- Aufgaben koennen auch im Easy Mode per Drag and drop zwischen `Inbox`, `Heute`, `Demnaechst` und `Erledigt` verschoben werden. Diese direkte Bewegung ersetzt das Dreipunktmenue fuer Statuswechsel.
- `Ctrl/Cmd + N` bleibt die globale Erfassung und erstellt eine Inbox-Aufgabe oder Notiz.
- `Ctrl/Cmd + K` sucht spaeter Aufgaben und Notizen; die genaue Suche ist nicht Teil dieser Seite.
- Jede Statusaenderung zeigt kurz `Rueckgaengig`.
- Das Loeschen verschiebt die Aufgabe zuerst in den manuellen Papierkorb.

## Leer- und Sonderzustaende

| Situation | Verhalten |
| --- | --- |
| Neue Installation | `Inbox` ist sichtbar und bietet eine direkte Eingabe fuer die erste Aufgabe. |
| Heute ist leer | Der Abschnitt bleibt sichtbar und bietet `+ Aufgabe fuer heute`. |
| Alle aktiven Abschnitte sind leer | Die Ansicht bleibt eine einfache Liste und erklaert nicht die gesamte Anwendung; sie bietet nur Erfassung. |
| Erledigt ist leer | Der Abschnitt bleibt eingeklappt und zeigt keine leere Flaeche. |
| Ein Tab wird geschlossen | Der vorherige Tab wird aktiv; falls keiner bleibt, ist `Aufgaben` aktiv. |
| Board hat viele Karten | Jede Spalte scrollt eigenstaendig; Spaltenbreite bleibt stabil. |

## Nicht Teil des ersten Aufgaben-Dummys

- Vollstaendiges Advanced Board mit Drag and drop.
- Eigene Aufgaben-Seiten und Unterseiten.
- Prioritaeten, Dauer, Fälligkeitsdaten und Filter.
- Projektfelder, Abhaengigkeiten, Labels, Zuweisungen und Zusammenarbeit.
- Mobile Board-Ansicht.

## Naechster Schritt

Einen klickbaren Easy-Mode-Dummy fuer `Aufgaben` erstellen: Tab-Leiste, vier einklappbare Statusabschnitte, neue Aufgaben im jeweiligen Abschnitt, Checkbox-Statuswechsel und ein Beispiel fuer das Oeffnen einer verknuepften Notiz. Der Board-Entwurf folgt erst, wenn die Listeninteraktion bestaetigt ist.