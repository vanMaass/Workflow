# remember.md – Kontext für zukünftige Sessions

Zweck: Alles Wichtige aus den bisherigen Chats an einem Ort, damit eine neue Session (oder ein Agent) ohne Rückfragen weiterarbeiten kann. **Bei größeren Änderungen bitte aktualisieren** (Abschnitte „Stand“, „Entscheidungen“, „Offen“ und „Gesprächsverlauf“).

Stand dieser Datei: 2026-10-04 (nach der globalen Suche).

---

## 1. Das Projekt in Kürze

**Workflow** ist eine persönliche, lokal gespeicherte Desktop-Arbeitszentrale für Tagesplanung, Aufgaben und Notizen (eine Person, kein Konto, keine Cloud, offline). Tech-Stack: **Tauri 2 + React 19 + TypeScript (strict) + Rust + SQLite (rusqlite, bundled)**. Später optional: native SwiftUI-App für iPad/iPhone (gemeinsam ist das Datenmodell, nicht die UI).

Die fachliche Wahrheit steht in `docs/` (Deutsch, ohne Umlaute geschrieben):

| Datei | Inhalt |
| --- | --- |
| `docs/01-kern-workflow-taegliche-planung.md` | Produktprinzipien, Easy/Advanced Mode, Tagesworkflow, Heute-Ansicht, Leer-/Fehlerzustände, V1-Umfang |
| `docs/02-technische-architektur.md` | Architektur, Datenmodell, lokale Speicherung, Performance, Sync-Vorbereitung |
| `docs/03-aufgaben.md` | Aufgaben/Kategorien, Tab-Leiste, Easy-/Advanced-Ansichten (**in dieser Session aktualisiert**) |
| `docs/04-notizen-und-editor.md` | Notizen und Editor (noch nicht umgesetzt) |
| `docs/05-kritische-v1-luecken-und-kaufkriterien.md` | V1-Lücken, Papierkorb, Suche, Seiten, Onboarding |

Wichtig laut `CLAUDE.md` (vom Nutzer gepflegt): `prototypes/` sind **keine Design-Vorlage, nur Vorschläge**; `Screenshots/` sind **keine Design-Referenzen, nur Konkretisierung des Aufbaus**. Design ist nachrangig, Funktion zuerst.

---

## 2. Wie der Nutzer arbeiten möchte (Präferenzen)

- **Sprache:** Deutsch (Antworten, UI-Texte, Docs, Commit-/Berichtstexte).
- **Nach jeder Ausführung auf Fehler testen:** `bash .claude/scripts/check.sh` muss grün sein, bevor etwas als fertig gilt (steht auch in `CLAUDE.md` und im Agenten).
- **Nach jeder Aufgabe eine Empfehlung für den nächsten logischen Schritt** geben (vom Nutzer in `.claude/agents/tauri-entwickler.md` Punkt 5 ergänzt).
- **Bei Design-Unsicherheit erst einen HTML-Prototypen** in `prototypes/` bauen, den Nutzer entscheiden lassen, dann in die App einbauen. Das hat gut funktioniert (siehe Aufgaben-Redesign).
- Nutzer mag: ruhige, Notion-artige Grauskala, eckige Checkboxen, wenig Ablenkung, „einfacher Zweck zuerst“.
- Entscheidungen, die das Datenmodell ändern, vorher kurz mit Optionen (A/B) und Empfehlung vorlegen – der Nutzer wählt.
- Ehrlich berichten, was getestet wurde und was nicht (z. B. native Tauri-App wurde bisher nie vom Assistenten gestartet; echtes Maus-Drag-and-drop ließ sich im Vorschau-Browser nicht simulieren).

---

## 3. Entwickler-Setup (Agent, Skills, Prüfung)

Alles in `.claude/`:

- **Agent** `tauri-entwickler` (`.claude/agents/tauri-entwickler.md`): Architekturregeln, Code-Stil, Pflicht zum Prüfen; Hooks: nach jedem Edit/Write schneller Check (`verify.sh edit`), beim Beenden voller Check (`verify.sh stop`, blockiert einmal bei Fehlern).
- **Skills:** `/clean` (toten Code entfernen), `/analyse` (ausführliches Review), `/test` (testen, beheben, Tests ergänzen).
- **`.claude/scripts/check.sh`** (Modi `full` | `quick` | `ts` | `rust`): TypeScript, ESLint, Vitest, Vite-Build, rustfmt, clippy (`-D warnings`), `cargo test`. Findet die App unter `app/`.
- **`.claude/hooks/verify.sh`:** Hook-Wrapper (Exit 2 gibt Fehler an den Agenten zurück).
- **`.claude/launch.json`:** startet den Vite-Dev-Server (Port 1420) für die Vorschau.

### Befehle

```bash
bash .claude/scripts/check.sh            # alle Checks
cd app && npm run tauri dev              # native App (Rust-Build beim ersten Mal mehrere Minuten)
cd app && npm run dev                    # nur Frontend im Browser (nutzt Browser-Fallback, siehe unten)
cd app && npm run typecheck | lint | test | build
```

### Umgebung

- macOS, Node v26, npm 11, Rust/cargo **1.99 installiert** (nach der Installation musste ein neues Terminal geöffnet werden bzw. `source "$HOME/.cargo/env"`, sonst „cargo metadata … No such file“ bei `tauri dev`).
- Kein Git-Repository im Projektordner.
- Pakete (Stand): react 19.3, vite 8, vitest 5, typescript 7, eslint 10, @tauri-apps/api/cli 2.12; Rust: tauri 2, rusqlite 0.32 (bundled), uuid, thiserror 2, serde, serde_json.

---

## 4. Projektstruktur

```
Workflow/
├─ CLAUDE.md / claude.md        Projektanweisungen (vom Nutzer gepflegt)
├─ remember.md                  diese Datei
├─ docs/                        fachliche Wahrheit
├─ prototypes/                  HTML-Prototypen (nur Vorschläge)
│   ├─ heute-ansicht.html       Vorlage Heute-Seite (Begrüßung, Fokus-Karte)
│   ├─ aufgaben-ansicht.html    alter 2x2-Kästen-Prototyp
│   ├─ aufgaben-ordner.html     verworfen: Ordnerliste im Seitenkopf
│   └─ aufgaben-kategorien.html ✅ gewählt: Kategorien-Spalte neben dem Menü
├─ Screenshots/                 Aufbau-Konkretisierung
├─ .claude/                     Agent, Skills, Hooks, check.sh, launch.json
└─ app/
   ├─ src/                      React-Frontend
   │   ├─ notes/                NoteEditor (TipTap, lazy), NoteDetail (Titel, Autosave, verknüpfte Aufgaben)
   │   ├─ api/                  types.ts · tauri.ts · memory.ts (Browser-Fallback) · context.tsx · memory.test.ts
   │   ├─ components/           Navigation, QuickCapture, TaskRow, FocusCard, AutoSaveText, ResizeHandle, Segmented, UndoToast
   │   ├─ lib/                  date.ts, greeting.ts, useResizableWidth.ts, usePersistentFlag.ts, useAutosave.ts, OpenNoteContext.tsx
   │   ├─ settings/             SettingsContext, SettingsDialog, options.ts
   │   ├─ views/                HeuteView, AufgabenView, NotizenView, Platzhalter, useToday.ts, useTasks.ts
   │   ├─ App.tsx · main.tsx · styles.css · test-setup.ts
   └─ src-tauri/                Rust-Kern
       ├─ src/db.rs             SQLite, Migrationen, alle Geschäftslogik + Tests
       ├─ src/lib.rs            Tauri-Commands (dünne Wrapper) + Setup
       ├─ src/error.rs          AppError (serialisiert als Text)
       ├─ tauri.conf.json       Fenster 1280×800 (min 1000×600), dragDropEnabled:false, CSP
       └─ capabilities/default.json
```

---

## 5. Architektur und Regeln (verbindlich)

- **Kein SQL und keine Dateipfade in React.** Alle Datenzugriffe über das `Api`-Interface (`app/src/api/types.ts`) → in Tauri `tauri.ts` (`invoke`), im Browser/Tests `memory.ts`. Beide Seiten **und** die Rust-Commands müssen bei Änderungen synchron angepasst werden.
- **Browser-Fallback (`memory.ts`)** spiegelt die Rust-Regeln im Speicher (localStorage-Schlüssel `workflow-dev-store`, `workflow-dev-settings`); wird automatisch genutzt, wenn `__TAURI_INTERNALS__` fehlt. Ermöglicht Test im Browser ohne Rust – **bei Regeländerungen in Rust immer auch hier nachziehen.**
- **Rust:** kein `unwrap()` im Produktivcode, Fehler als `Result<T, AppError>`; Datumsangaben kommen als lokales `YYYY-MM-DD` vom Frontend (keine Zeitzonenlogik in Rust); Zeitstempel sind Unix-Millisekunden.
- **Datenobjekte:** UUID-ID, `version`, `createdAt`, `updatedAt` (Vorbereitung für Sync). Schema **nur über neue Migrationen** ändern (nie bestehende ändern). Weiches Löschen über `deleted_at`.
- **Dev- und Produktivdaten getrennt:** Debug-Builds nutzen `<app_data_dir>/dev/workflow.sqlite3`.
- **Automatische Sicherung:** Vor ausstehenden Migrationen einer bestehenden DB entsteht per `VACUUM INTO` eine Kopie `workflow.sqlite3.backup-v<alteVersion>-<zeitstempel>` neben der DB.

### Datenbank (Migrationen, `PRAGMA user_version`)

1. `tasks`, `daily_plans`
2. `preferences` (Key/Value; Einstellungen als JSON unter Key `settings`)
3. `categories` + Umbau `tasks.status` → `tasks.category_id` (Tabelle neu aufgebaut; alte Status-Werte = IDs der festen Kategorien)
4. `tasks.completed_from` (Herkunftskategorie beim Abhaken; alte erledigte Aufgaben mit Plan-Datum → `Heute`)
5. `notes` (id, title, content = Editor-Dokument als JSON-Text, plain_text für Suche, pinned, page_id, parent_id (noch ungenutzt), version, Zeiten, deleted_at)

### Datenmodell-Kernpunkte

- **Aufgabe:** genau **eine Kategorie** (`categoryId`). Felder u. a. `title`, `plannedDate`, `position`, `completedAt`, `completedFrom`, optional `priority`, `durationMinutes`, `pageId`, `noteId` (die letzten vier noch ungenutzt).
- **Kategorien:** 4 feste (IDs `Inbox`, `Heute`, `Demnaechst`, `Erledigt`; Name „Demnächst“) + eigene (UUID, nur Advanced Mode). Feste sind nicht entfernbar. Namen eindeutig (case-insensitive), nicht leer, ≤ 60 Zeichen.
- **Regeln beim Verschieben (`move_task`):** `Heute` → `plannedDate = heute`; `Erledigt` → Plan-Datum bleibt, `completedAt` gesetzt, `completedFrom` = vorherige Kategorie; alles andere → `plannedDate = null`.
- **Wieder öffnen (`reopen_task`):** zurück nach `completedFrom` (wenn Kategorie noch existiert, sonst `Inbox`); bei `Heute` wird wieder für heute eingeplant.
- **Heute-Ansicht (`get_today`):** „Heute“-Liste = Aufgaben mit `plannedDate = heute` in `Heute`/`Erledigt`; „Offen von gestern“ = Kategorie `Heute` mit `plannedDate < heute` (nie automatische Übernahme).
- **Tagesplan:** `daily_plans` pro Datum mit `focus` und `note` (Tagesnotiz). Wird beim Lesen automatisch angelegt.
- **Notizen:** `content` ist das blockbasierte TipTap/ProseMirror-Dokument als JSON-Text (Rust prüft nur, dass es gültiges JSON ist, ≤ 2 Mio. Zeichen); `plain_text` (≤ 500 000) liefert der Editor mit. Titel = gesetzter Titel, sonst erste nicht-leere Textzeile (≤ 80 Zeichen), sonst „Neue Notiz“. Liste: angeheftet zuerst, dann `updated_at` absteigend; Anheften ändert `updated_at` nicht. Suche per SQL `LIKE` mit Escape (Wildcards `%`/`_` sind normale Zeichen; Groß-/Kleinschreibung nur ASCII). Löschen ist weich. **Aufgabe↔Notiz:** `tasks.note_id`; die Abfragen blenden den Verweis aus, wenn die Notiz gelöscht ist (kommt mit Wiederherstellen zurück).
- **Einstellungen:** `theme` (system/light/dark), `mode` (easy/advanced), `accent` (grau/gruen/blau/violett/rot), `font` (system/serif/mono). Ungültige Werte lehnt Serde ab; unlesbares JSON → Standardwerte.

### Papierkorb (weiches Löschen)

`tasks.deleted_at` / `notes.deleted_at`. `list_trash` (Aufgaben mit Kategoriename + Notizen, neueste zuerst), `trash_count`, `purge_tasks`/`purge_notes` (nur Einträge, die im Papierkorb liegen, werden endgültig gelöscht), `empty_trash`. Wiederherstellen über `restore_tasks` / `restore_note`. Endgültig gelöschte Notizen nehmen den Notiz-Hinweis ihrer Aufgaben für immer mit. Entfernte eigene Kategorien bleiben weich gelöscht (werden nicht gepurged).

### Tauri-Commands (alle in `lib.rs` registriert)

`get_today`, `list_tasks`, `create_task`, `move_task`, `reopen_task`, `delete_task`, `delete_done_tasks`, `restore_tasks`, `list_categories`, `create_category`, `delete_category`, `restore_category`, `update_daily_plan`, `get_settings`, `update_settings`, `list_notes`, `get_note`, `create_note`, `update_note`, `delete_note`, `restore_note`, `create_task_from_note`, `list_trash`, `trash_count`, `purge_tasks`, `purge_notes`, `empty_trash`, `search`.
(Tauri übersetzt JS-camelCase-Argumente automatisch in Rust-snake_case.)

---

## 6. Was umgesetzt ist (Stand)

**Heute-Seite** (`HeuteView.tsx`): drei Spalten (Navigation | Tagesplan | Kontext). Tageszeit-Begrüßung („Gute Nacht/Guten Morgen/Guten Tag/Guten Abend.“) mit Datum darüber; **Fokus-Karte** (`FocusCard`, getönt mit Akzent-Balken sobald ein Fokus eingetragen ist, label „Mein Fokus heute“); „Offen von gestern“ (↑ = nach heute übernehmen, „Demnächst“, Checkbox); „Aufgaben für heute“ (max. 7 sichtbar, dann „Weitere Aufgaben anzeigen“); Aufgabe hinzufügen (Enter); Klick auf Aufgabe → Kontextbereich mit Details/Aktionen (erledigen, auf morgen verschieben, aus Tagesplan entfernen); sonst **Tagesnotiz** mit Autosave (600 ms Pause, bei Blur und beim Schließen); Fehlerbanner bei Speicherproblemen.

**Aufgaben-Seite** (`AufgabenView.tsx`, nach Prototyp `aufgaben-kategorien.html`): Kategorien-Spalte direkt rechts neben dem Menü (Felder mit Anzahl, aktives hervorgehoben, Drop-Ziele) + Aufgabenliste der gewählten Kategorie. Easy: 4 feste Felder. Advanced: „+ Kategorie hinzufügen“, ✕ zum Entfernen eigener Kategorien (Aufgaben → Inbox, mit „Rückgängig“). Verschieben per Drag-and-drop **oder** `⋯`-Menü „Verschieben nach“. Abhaken → Erledigt, Abwählen → **zurück in die Herkunftskategorie** („… zurückgeholt“). In **Erledigt**: ✕ löscht einzeln, „Alle löschen“ löscht alle (weiches Löschen, jeweils mit „Rückgängig“). Easy Mode blendet eigene Kategorien nur aus (Aufgaben erscheinen dann in der Inbox, nichts geht verloren).

**Notizen-Seite** (`NotizenView.tsx`, nach `docs/04`): Notizliste links (Suche, „Angeheftet“, „Zuletzt bearbeitet“, ziehbar 200–420 px, Standard 280) + Editor rechts. Editor = TipTap (`@tiptap/react`, starter-kit mit Überschrift 1/2, fett, kursiv, unterstrichen, Listen, Link, Trennlinie; dazu Highlight, TaskList/TaskItem, Placeholder), **per `React.lazy` nachgeladen** (eigener Chunk ~400 kB, App-Start bleibt ~260 kB). **Freie Schreibfläche: keine Box, keine Werkzeugleiste** (Nutzerwunsch) – Formatierung über Markdown-Kürzel (`# `, `- `, `1. `, `[ ] `), Tastenkürzel (Cmd+B/I/U, Cmd+Shift+H) und das **`/`-Menü** (eigene Implementierung in `NoteEditor.tsx`, öffnet bei `/` am Zeilenanfang oder nach Leerzeichen, Pfeile/Enter/Tab/Esc). Titel sitzt weiter unten, Aktionen (Speicherstatus, Anheften, Löschen – vom Nutzer ausdrücklich gewünscht) stehen oben rechts. **Schreibfokus** (`lib/useTypingMode.ts`): beim Tippen in `.note-main` setzt der Hook `data-typing="true"` auf `<html>`, CSS blendet Notizliste, Aktionen und verknüpfte Aufgaben per Opacity aus (**die Hauptnavigation bleibt sichtbar** und wird nur manuell eingeklappt – Nutzerwunsch) (Platz bleibt, nichts verschiebt sich; Mauszeiger ausgeblendet); Mausbewegung ≥ 3 px oder Klick bringt alles zurück; Fehlerbanner bleibt. Autosave (`useAutosave`: 600 ms, bei Blur, beim Wechsel/Schließen; Status „Lokal gespeichert“, dauerhafte Fehlermeldung bei Fehlern, Text bleibt), Anheften, Löschen mit Rückgängig. **„Als Aufgabe …“** im `/`-Menü macht aus der Text der aktuellen Zeile eine Aufgabe (Heute/Inbox) mit Verknüpfung; unter dem Editor „Verknüpfte Aufgaben“ (abhakbar). An Aufgabenzeilen (Heute- und Aufgaben-Seite) öffnet der Hinweis „Notiz“ die Notiz (`OpenNoteContext`). Schnellerfassung (`Cmd/Ctrl+N`) hat die Umschaltung Aufgabe/Notiz. Links entstehen per Autolink beim Tippen/Einfügen (nur http/https/mailto; es gibt keine Link-Eingabe mehr, `window.prompt` geht in Tauri nicht zuverlässig).

**Notiz-Tabs** (`NotizenView.tsx`): Tab-Leiste oben über Liste und Editor: fester Startpunkt „Notizen“, je geöffneter Notiz ein Tab (✕), „+“ legt eine neue Notiz an. Geöffnete Tabs werden in `localStorage` (`workflow-open-notes`) gemerkt; angezeigt werden `openIds` plus die aktive Notiz (z. B. von außen aus einer Aufgabe geöffnet); gelöschte fallen heraus. **Wichtig:** Jeder Tab-/Notizwechsel läuft über `activate()`, das auch einen nur von außen geöffneten Tab in `openIds` übernimmt (sonst ging er beim Wechseln verloren). Schließen aktiviert den vorherigen Tab, zuletzt „Notizen“. Die Notizliste lädt immer alle Notizen (Tab-Titel); die Suche läuft separat und zeigt bis zum Ergebnis die bisherige Liste. Die Tab-Leiste blendet im Schreibfokus mit aus.

**Globale Suche** (`Ctrl/Cmd + K`, Knopf „Suchen ⌘K“ oben in der Navigation; `components/GlobalSearch.tsx`, Logik im Rust-Kern `db::search`): Dialog oben mit Suchfeld, Filter-Chips und Trefferliste. **Rust:** lädt Aufgaben/Notizen/Tage und gleicht in Rust ab (nicht per SQL-`LIKE`, damit Umlaute ohne Beachtung der Groß-/Kleinschreibung funktionieren: `lower_chars` kleinschreibt Zeichen für Zeichen 1:1, damit Positionen für den Ausschnitt stimmen); **alle Suchbegriffe müssen vorkommen** (UND, getrennt durch Leerzeichen, über Titel ∪ Inhalt); Treffer-Arten `task` / `note` / `day` (Schnellnotiz + Tagesfokus; `id` = Datum); Parameter `scope` (`all`/`title`/`content`; Aufgaben gelten nur als Titel, Tage nur als Inhalt) und `kinds`; Sortierung Titeltreffer zuerst, dann `updated_at`; höchstens 50 Treffer; Suchbegriff ≤ 200 Zeichen. Ausschnitt ≈ 40 Zeichen davor / 90 danach mit „…“. **Frontend:** `Api.search(query, {scope, kinds})`, `memory.ts` spiegelt die Logik; 150 ms Entprellung, bis zum Ergebnis bleibt die bisherige Liste sichtbar; `Highlighted.tsx` markiert Begriffe (RegExp mit `giu`, Sonderzeichen escaped). **Easy:** Filter Alles/Aufgaben/Notizen (Notizen = `note`+`day`); **Advanced:** zusätzlich „Schnellnotizen“ und „Suchen in“ (Titel & Inhalt / Titel / Inhalt). **Öffnen:** Notiz → `openNote` (Notizen-Ansicht, Tab); Aufgabe → App-Zustand `taskTarget {categoryId, taskId, nonce}`, `AufgabenView` bekommt `initialCategoryId`/`highlightTaskId` und wird über `key={nonce}` neu aufgebaut, Zeile bekommt `selected` und wird per `scrollIntoView` ins Bild gerückt; Tag von heute → Heute; früherer Tag → `DayNoteDialog` (Vorschau + „Als Notiz sichern“, bis es das Archiv gibt). **Noch offen:** Fundstelle im Notiztext hervorheben, Filter Datum/Seite/Status/Archiv.

**Papierkorb** (`views/TrashView.tsx`, Eintrag ganz unten in der Navigation über „Einstellungen“, mit Zähler `nav-badge`): listet gelöschte Aufgaben (mit Herkunftskategorie) und Notizen; „Wiederherstellen“; „Endgültig löschen“ und „Papierkorb leeren“ über `ConfirmButton` (zwei Klicks, „Sicher?“, löst sich nach 4 s oder beim Fokusverlust). Der Zähler bleibt über `lib/trackMutations.ts` aktuell: `App.tsx` umhüllt die Api mit einem Proxy, der nach jeder erfolgreichen schreibenden Methode (alles außer `get…`/`list…`/`trashCount`) `dataVersion` erhöht und den Zähler neu lädt – einzelne Aufrufstellen müssen nichts melden.

**Schnellnotiz / Arbeitsnotiz auf Heute** (`components/WorkNotePanel.tsx`, `notes/NotePanel.tsx`): Der rechte Bereich hat oben einen Knopf „Arbeitsnotiz wählen: <Name>“, der ein **zentriertes Auswahlfenster** öffnet (`components/NotePicker.tsx`; weder Dropdown noch Popover unter dem Knopf – Nutzerwunsch; gleiche Overlay-/Dialog-Optik wie die Einstellungen, per `createPortal` in `document.body`): Titel „Arbeitsnotiz wählen“ mit ✕, Suchfeld (filtert Titel und Vorschautext), darunter „Schnellnotiz (heute)“ zuerst, dann die Notizen (★ = angeheftet, Vorschau darunter, ✓ = aktuell); Pfeiltasten/Enter/Escape, Klick neben das Fenster schließt, Fokus kehrt zum Knopf zurück. **„In Notizen öffnen“** steht ganz unten im Bereich (`.note-panel-footer { margin-top: auto }`). Die Auswahl: **Schnellnotiz (heute)** = `daily_plans.note`, jeden Tag neu und leer (Nutzerwunsch), einfaches Textfeld mit Autosave und Knopf „Als Notiz sichern“ (legt die Notiz „Schnellnotiz <Datum>“ an, leert die Schnellnotiz, wählt die neue Notiz). Oder jede vorhandene Notiz: Titel + TipTap-Editor (lazy) mit Autosave, „In Notizen öffnen“, Aufgaben per `/`-Menü. Die Auswahl wird mit Datum in `localStorage` (`workflow-work-note`) gemerkt und gilt nur für diesen Tag; gelöschte Notizen fallen auf die Schnellnotiz zurück. **Fehler behoben:** `useToday.savePlan` übernimmt den gespeicherten Plan jetzt in die Anzeige, sonst zeigte ein später neu aufgebautes Feld veralteten Text.

**„Offen von gestern“** auf Heute ist **einklappbar** (Überschrift ist ein Knopf mit Anzahl, Zustand wird gemerkt, Standard offen).

**Navigation/Layout:** Linke Leiste (von oben: Einklapp-Pfeil, darunter die **Suchleiste** `.search-bar` („⌕ Suchen“ + Kürzel `⌘K`/`Strg K`), darunter **„+ Erfassen“** `.capture-item` (+ Kürzel `⌘N`/`Strg N`, Tooltip, `aria-label="Erfassen"`); beide sind bewusst schlichte, rahmenlose Einträge in gedämpfter Schrift ohne gefüllte Fläche – ein früheres gefülltes „+“-Quadrat wurde als Stilbruch verworfen; Kürzel verschwinden per Container-Query unter ~150 px Inhaltsbreite; dann Heute, Aufgaben, Notizen, Archiv; unten Papierkorb und Einstellungen) – **ziehbar** (140–280 px, Standard 180) und **einklappbar** (Pfeil ←, Zustand wird gemerkt, `inert` wenn eingeklappt). Eingeklappt bleibt eine **36-px-Spalte** (`NAV_RAIL_WIDTH` in `App.tsx`, Klasse `nav-collapsed`) für den Ausklapp-Pfeil `→`; so überlappt er nie Inhalte (früher schwebte er absolut positioniert über „NOTIZEN“). Der Inhalt gleitet per Grid-Transition (`.2s`) in die Mitte des freien Platzes. Rechte Kontext-Leiste auf Heute: ziehbar (240–480 px, Standard 340), einklappbar. Doppelklick auf Griff = Standardbreite; Pfeiltasten am Griff ändern die Breite. Breiten werden in localStorage gemerkt.

**Einstellungen** (Popup in Bildschirmmitte, Zahnrad unten links, `Cmd/Ctrl+,`): Erscheinungsbild Hell/Dunkel/Automatisch (folgt Systemeinstellung live), Akzentfarbe, Schriftart, Easy/Advanced-Schalter, „Bald verfügbar“ (Profil, Benachrichtigungen). Gespeichert in SQLite; zusätzlich lokaler Cache gegen Aufblitzen beim Start. **Der Advanced-Schalter wirkt bisher nur auf die Aufgaben-Seite (eigene Kategorien).**

**Weitere:** Schnellerfassung (`Cmd/Ctrl+N`, neue Aufgabe → Inbox), Undo-Toast (6 s), Platzhalter-Seiten für Notizen und Archiv.

**Tests/Qualität:** Zuletzt alles grün – Frontend-Tests (Vitest/Testing Library, 153 Tests), Rust-Tests (36), clippy, rustfmt, Build.

---

## 7. Wichtige Entscheidungen (mit Begründung)

1. **Eine Aufgabe = genau eine Kategorie („Möglichkeit A“).** Eigene Kategorien ersetzen den Status; Aufgaben in eigenen Kategorien erscheinen nicht automatisch auf Heute (erst Verschieben nach „Heute“ plant sie ein). Alternative B (Status + Kategorie getrennt) wurde verworfen.
2. **Aufgaben-Layout:** Zuerst 2×2-Kästen (unbefriedigend) → Ordnerliste (verworfen) → **Kategorien-Spalte direkt neben dem Hauptmenü** (gewählt).
3. **Wieder öffnen führt zurück zur Herkunftskategorie** (vorher: Inbox). Docs entsprechend geändert.
4. **Erledigte löschen:** einzeln oder „Alle löschen“, **ohne Rückfrage, aber mit Rückgängig** und weichem Löschen (Papierkorb-UI folgt später).
5. **Einstellungen in SQLite statt nur localStorage** (Datenmodell soll später synchronisierbar sein); localStorage nur als Start-Cache.
6. **Datenvertrauen:** automatische DB-Sicherung vor Migrationen (umgesetzt); Export/Import und manuelle Sicherung stehen noch aus.
7. **Editor = TipTap** (blockbasiert passend zu `docs/04`, später Tabellen/Code/LaTeX möglich) statt Eigenbau; per `lazy` geladen, damit der Start schnell bleibt (Performance-Leitplanke aus `docs/02`).
8. **Keine Werkzeugleiste im Editor; „Als Aufgabe“ und Blocktypen über das `/`-Menü** (Nutzerwunsch: aufgeräumte Fläche). Wirkt auf die aktuelle Zeile, nicht als Knopf an jedem To-do.
8b. **Schreibfokus** statt dauerhafter Seitenleisten beim Tippen (Nutzerwunsch).
9. **„Offen von gestern“ bleibt**, wird aber einklappbar (Nutzerwunsch).
10. Abmachung zur **Tab-Leiste** (docs/03) und Notiz-Hinweis an Aufgaben: noch nicht gebaut, weil es Notizen braucht.

---

## 8. Stolperfallen / Gelerntes

- **`overflow: hidden` schneidet Ziehgriffe ab:** Griffe liegen daher vollständig *innerhalb* ihres Bereichs (`right: 0` / `left: 0`, 6 px breit).
- **`dragDropEnabled: false`** in `tauri.conf.json` ist nötig, sonst fängt Tauri Drops ab und HTML5-Drag-and-drop zwischen Feldern funktioniert in der echten App nicht.
- **jsdom und `inert`:** Testing Library behandelt `inert` nicht als unzugänglich → im Test das Attribut prüfen. Auch `globals: true` in der Vitest-Konfiguration ist nötig (sonst kein Auto-Cleanup).
- **ESLint `react-hooks/set-state-in-effect`:** Laden mit `promise.then(...)` plus Cancel-Flag im Effekt statt synchronem `setState`.
- **Zugängliche Namen von Kategorie-Feldern:** Titel und Anzahl müssen durch ein Leerzeichen getrennt sein („Inbox 2“) – Tests suchen mit Regex `^Name \d+$`.
- **Clippy** beanstandet `[x.clone()]` in Tests → `std::slice::from_ref(&x)`.
- **Vorschau-Browser:** Simulierte Mausaktionen lösen kein natives Drag-and-drop aus → Drag-Ereignisse per `DragEvent`/`DataTransfer` direkt auslösen. Das Fenster war zeitweise nur ~330 px breit → `resize_window` auf 1280×800, danach auf `desktop` zurücksetzen. Der Dev-Server auf 1420 gehört dem Nutzer (`tauri dev`) – nicht beenden. Testdaten im Vorschau-Browser nach Tests wieder aus localStorage löschen (`workflow-dev-store`, `workflow-dev-settings`, `workflow-settings-cache`, `workflow-nav-collapsed`).
- **Designregel „überall minimalistisch, kein weißer Rahmen“ (Nutzerwunsch):** Textfelder (`.add-input`, Schnellnotiz-Textarea, Tagesfokus, Kategorie-/Notizsuche, Suche, Erfassen, Notizauswahl) haben **keinen Rahmen, keinen Hintergrund und keinen Fokus-Umriss**; der blinkende Cursor (`caret-color: var(--text)`) zeigt den Fokus. Das globale `:focus-visible` (Umriss für Tastaturbedienung) gilt nur noch für Knöpfe, nicht für `input`/`textarea`/`select`. Die Fokus-Karte hat beim Tippen keinen Akzentrahmen mehr. Umschalter (`Segmented`: Einstellungen, Suche, Erfassen) sind überall schlichte Textumschalter (aktiv = heller, fett, 2-px-Unterstreichung in Akzentfarbe). Der Arbeitsnotiz-Knopf ist ein rahmenloser Text mit ▾. Beibehalten: Rahmen der Dialogfenster (feines Grau), Fokus-Karte der Startseite (Prototyp), gefüllte aktive Kategorie-Kachel. Selektoren in Dialogen stehen als `.dialog .…`, weil `.dialog input` sonst gewinnt; neue Textfelder bitte nach dieser Regel gestalten.
- **Kein Text markieren beim Ziehen von Leisten:** `ResizeHandle` verhindert `mousedown` (`preventDefault`, sonst startet der Browser eine Markierung), löscht beim Start eine bestehende Markierung und setzt während des Ziehens `data-resizing="true"` auf `<html>`; CSS sperrt dann `user-select` überall und erzwingt den `col-resize`-Cursor. Die Sperre wird bei `pointerup`, `pointercancel`, `lostpointercapture` und beim Entfernen des Griffs wieder aufgehoben.
- **Nichts darf die Seite wachsen lassen:** `.app` hat `grid-template-rows: minmax(0, 1fr)`, und jede Ansicht in `.app` bekommt `min-height: 0`; `html, body` sind `overflow: hidden` mit `overscroll-behavior: none`. Ohne das wuchs die Notizansicht bei vielen Notizen auf die Höhe des Inhalts (4334 px gemessen), die ganze Seite scrollte und nahm Navigation und Notizliste mit (Nutzer: „Seitenleiste und Notizen-Navigation sollen nicht scrollbar sein“). **Nur Inhaltsflächen scrollen** (Tagesplan, Notiz-Hauptfläche, Aufgabenliste, Papierkorb, Kontextbereich); Hauptnavigation, Notizliste und Kategorien-Spalte sind `overflow: hidden`. Ist die Notizliste voll, zeigt `useClipped` (`lib/useClipped.ts`) den Hinweis „Weitere Notizen über die Suche finden“ (`.note-clip-hint`); angeheftete und zuletzt bearbeitete stehen oben.
- **TipTap v3:** `useEditor` rendert nicht bei jeder Transaktion neu → Werkzeugleisten-Zustand über `useEditorState`. StarterKit enthält bereits Underline, Link, Heading, HorizontalRule und Listen; TaskList/TaskItem stehen in `@tiptap/extension-list`, Placeholder in `@tiptap/extensions`. In jsdom fehlen `Range.getBoundingClientRect`/`getClientRects`/`elementFromPoint` → Polyfills in `src/test-setup.ts`. `getText({ blockSeparator: "\n" })` liefert einen Zeilenumbruch am Ende → `.trimEnd()`.
- **Vite lädt beim ersten Öffnen der Notizen neue Editor-Pakete evtl. mit einem automatischen Seiten-Reload nach** (Dev-Server „optimized dependencies“); dann steht die App wieder auf Heute – einfach nochmal öffnen.
- **Vorschau-Browser & Tastatur:** Die `type`-Aktion des Browser-Tools sendet nur Eingabe-Ereignisse, **keine `keydown`-Events** → Schreibfokus und `/`-Menü werden damit nicht ausgelöst; echte Tastendrücke mit der `key`-Aktion senden (z. B. `#`, `space`, `/`). `useTypingMode` hört auf `keydown`.
- **Editor-Tests** nutzen die Test-Naht `onEditor` (gibt die TipTap-Instanz heraus) und `insertContent(" /")` statt echtem Tippen; Tasten per `fireEvent.keyDown(editor.view.dom, …)`.
- **Einstellungen laden asynchron:** In Tests, die den Advanced Mode brauchen (`api.updateSettings({mode:"advanced"})`), erst auf das Erscheinen der erweiterten Elemente warten (`findBy…`), bevor gelesen wird. Ergebnislisten nach Filterwechsel auf **Inhalt** prüfen, nicht nur auf die Anzahl (alte Liste kann dieselbe Länge haben).
- **Auswahlfenster-Tests:** Die Notizliste im Arbeitsnotiz-Fenster lädt asynchron – Einträge mit `waitFor` prüfen; der zugängliche Name der Einträge enthält Titel und Vorschau ohne Trennzeichen („QuartalsplanungBudget klären“). Barrierefreier Name des Navigationsknopfs: „Papierkorb 1“ (Leerzeichen vor dem Zähler nötig).
- **Notizen-Tests** ersetzen den Editor per `vi.mock("../notes/NoteEditor")` durch ein Textfeld (stabil); der echte Editor hat eigene Tests (`NoteEditor.test.tsx`).
- **Platzhalter-Text in der Rust-Struktur:** `Task.priority/durationMinutes/pageId/noteId` existieren schon im Schema, werden aber noch nicht genutzt.

---

## 9. Offen / mögliche nächste Schritte

0. **Suche weiter:** Fundstelle im Notiztext hervorheben, Filter Datum/Seite/Status/Archiv (Archiv-Seite fehlt noch), Seite im Treffer.
1. **Notizen weiter:** Tab-Leiste auch für Aufgabenansichten, Seiten (Privat/Arbeit) als Notizfilter, „Als Aufgabe“ direkt an jedem To-do, Advanced-Bausteine (Unterseiten, Tabellen, Zitat, Codeblock, LaTeX, HTML, Textfarben, `[[Seitenlinks]]`, `/`-Menü), Umlaut-Suche ohne Groß-/Kleinschreibung.
2. Papierkorb-Ansicht ist **erledigt**. Offen dazu: entfernte eigene Kategorien im Papierkorb; automatische Löschfrist (bewusst nicht entschieden).
3. **Datenvertrauen:** Export/Import (versioniertes Format), manuelle Sicherung in den Einstellungen.
4. **Eigene Kategorien:** Umbenennen, Reihenfolge per Ziehen; Breite/Einklappen der Kategorien-Spalte (derzeit fest 250 px).
5. **Archiv-Seite**, **globale Suche** (`Cmd/Ctrl+K`), **Seiten** (Privat/Arbeit/…), **Tagesabschluss**, **interaktive Einführung**.
6. **Advanced-Funktionen:** Priorität/Dauer, Zeitblöcke, „Seitenlayout bearbeiten“ auf Heute, Board-Ansicht.
7. „Offen von gestern“ zeigt weiter alle früheren Tage unter dem Titel „von gestern“ (Nutzer: „kann bleiben“, nur einklappbar gewünscht). Ggf. später in „Offen von früher“ umbenennen.
8. Native Tauri-App wurde vom Assistenten **nie gestartet**: einmal `npm run tauri dev` durchspielen (Migrationen 3–5 laufen dort einmalig, Sicherungskopie entsteht; Editor, Autosave und Drag-and-drop mit echter Maus prüfen), vor allem Drag-and-drop mit echter Maus.

---

## 10. Gesprächsverlauf (chronologisch)

1. **Agent bauen.** Nutzer: In `Workflow` liegt eine `Claude.md`; bitte einen Agenten für React/TypeScript/Rust mit Skills `clean`, `analyse`, `test`, der nach jeder Ausführung auf Fehler testet. → Agent `tauri-entwickler`, drei Skills, `check.sh`, Hooks, `CLAUDE.md` gefüllt; Hooks an Beispielprojekt getestet. (Rust fehlte damals.)
2. **Grundgerüst + Startseite.** Nutzer: Gerüst bauen, Details in `docs/`, vorrangig Startseite, Design nebensächlich. → Tauri-Projekt, Rust-Kern (SQLite), Heute-Seite, Tests; im Browser geprüft.
3. **Rust installiert / App startet nicht.** Fehler „cargo metadata … No such file“ → PATH im alten Terminal; neues Terminal bzw. `source "$HOME/.cargo/env"`; Rust-Teil formatiert, Checks grün.
4. **Aufgaben-Seite** gebaut (4 Statusabschnitte, Drag-and-drop, Rückgängig, `list_tasks`, `dragDropEnabled:false`).
5. **Heute-Seite:** Seitenleisten links/rechts **ziehbar mit Min/Max-Breite**; **Begrüßung** nach Prototyp-Screenshot.
6. **Einstellungen:** Zahnrad unten links, Popup mittig (Farbe, Schriftart, Easy/Advanced, Hell/Dunkel/Automatisch, später Profil/Benachrichtigungen); in SQLite persistiert.
7. **Tagesfokus hervorheben** wie im Screenshot (getönte Karte, Akzent-Balken, Label).
8. **Linke Leiste einklappbar** + Wunsch nach neuem Aufgaben-Design (OneNote-Ordner mit Drag-and-drop) → Prototyp `aufgaben-ordner.html`.
9. Nutzer: gefällt nicht; Kategorien sollen als Felder links neben dem Menü stehen, im Advanced eigene Kategorien → Prototyp `aufgaben-kategorien.html` (Eigene-Kategorien-Frage A/B gestellt).
10. Nutzer: **gefällt sehr gut, Möglichkeit A.** → App umgebaut: Datenmodell Kategorien (Migration 3), Backup vor Migrationen, neue Commands, Kategorien-Spalte, Easy/Advanced-Verhalten, Tests; im Browser geprüft.
11. **Aktuelle Anfrage (diese Session):**
    - `remember.md` mit allem Wichtigen und der Konversation anlegen (→ diese Datei).
    - **Abhaken rückgängig → Aufgabe landet wieder in der Kategorie, aus der sie abgehakt wurde;** Docs entsprechend ändern. → umgesetzt (Migration 4 `completed_from`, `reopen_task`, Frontend, Tests, `docs/03` + `docs/01` angepasst).
    - **Erledigte einzeln oder per „Alle löschen“ entfernen.** → umgesetzt (weiches Löschen + Rückgängig; Papierkorb-Ansicht folgt).
    - **Frage: Wie weit funktionieren „Offen von gestern“-Todos auf der Home-Seite, ist die Übernahme per Klick nach Heute implementiert?** → Ja, implementiert und im Browser mit Daten von gestern/vorgestern geprüft: Sektion „Offen von gestern“ (nur sichtbar, wenn es welche gibt), je Zeile Checkbox, ↑ (nach heute übernehmen, sofort in „Aufgaben für heute“), „Demnächst“-Knopf. Keine automatische Übernahme (so verlangt es `docs/01`). Einschränkungen: zeigt nur Aufgaben der Kategorie `Heute` mit älterem Datum (nicht Inbox/Demnächst); Titel sagt immer „von gestern“, auch bei älteren; Sektion ist nicht einklappbar; keine „Auf morgen“-/Entfernen-Aktion in dieser Liste.
12. **Folge-Session:** Nutzer: „Offen von gestern“ kann bleiben, aber **einklappbar** machen; danach **mit Notizen fortfahren**. → Einklappen umgesetzt (Knopf in der Überschrift, gemerkt). Notizen-Seite gebaut: Migration 5, Rust-Commands + 6 Tests, TipTap-Editor (lazy), Autosave, Suche, Anheften, Löschen mit Rückgängig, Aufgabe-aus-Notiz mit Verknüpfung (Hinweis „Notiz“ an Aufgaben), Schnellerfassung für Notizen, Docs (`docs/04` Umsetzungsstand). Im Browser mit dem echten Editor geprüft (Überschrift, Absatz, To-do, Autosave, Aufgabe für Heute, Rücksprung von der Heute-Seite). Alle Checks grün (Frontend 83, Rust 26).
13. **Notizen-Feinschliff:** Nutzer: ganze Fläche freies Feld ohne Boxumrandung, **keine Einstellungsleiste (H1 usw.)**, Titel fängt zu weit oben an → aufgeräumter; beim Tippen sollen **alle Menüs und Seitenleisten verschwinden, bis die Maus bewegt wird**; Anheften/Löschen-Knöpfe sind gut. → Toolbar und Rahmen entfernt, `/`-Menü + Markdown-Kürzel, mehr Weißraum und Titel tiefer, Schreibfokus (`useTypingMode`), Tests (83 Frontend), Docs `docs/04` angepasst. Im Browser mit echten Tastendrücken geprüft (`# `, Text, `/`-Menü, „Als Aufgabe für Heute“, Ausblenden/Einblenden).
14. **Navigation und Schreibfokus korrigiert:** Nutzer: Die **Seitenleiste soll beim Tippen nicht verschwinden** (wird nur manuell ausgeblendet), der Text soll dann **smooth in die Mitte des freien Platzes** rutschen; **Bug:** Beim Ausblenden der Seitenleiste in Notizen rutschte der Pfeil über das Wort „Notizen“ oben links. → Hauptnavigation aus dem Schreibfokus genommen (Notizliste, Aktionen und verknüpfte Aufgaben blenden weiter aus); eingeklappte Navigation behält eine 36-px-Spalte für den Pfeil (kein Überlappen mehr, im Browser nachgemessen); Text zentriert sich im freien Platz (gemessen: Versatz 0 px). Annahme: „die Seitenleiste“ = Hauptnavigation; die Notizliste blendet beim Tippen weiterhin aus und hat keinen manuellen Einklapp-Pfeil.
15. **Tabs, Papierkorb, Schnellnotiz:** Nutzer: Tab-Leiste oben in Notizen (verschwindet beim Tippen); **Papierkorb** ganz unten in der Hauptnavigation über den Einstellungen („wo würdest du es am sinnvollsten platzieren?“ → dort, getrennt durch eine Linie, mit Zähler; Begründung: Hilfsfunktion, kein Arbeitsbereich); die Notiz auf der Startseite soll eine **Schnellnotiz** sein: jeden Tag neu leer, oder man wählt etwas aus. → Notiz-Tabs mit Merken und Schließen-Logik, Papierkorb komplett (Rust: `list_trash`, `trash_count`, `purge_*`, `empty_trash` + 4 Tests; UI mit Bestätigung und Zähler über `trackMutations`), Schnellnotiz/Arbeitsnotiz-Auswahl auf Heute inkl. „Als Notiz sichern“ und Fehlerbehebung `savePlan`. Im Browser durchgespielt (Tabs anlegen/wechseln/schließen, Löschen → Zähler, Papierkorb-Liste, Schnellnotiz speichern, Notiz wählen, als Notiz sichern). Alle Checks grün (Frontend 109, Rust 30).
16. **Seitenleisten nicht scrollbar:** Nutzer: Hauptnavigation und Notizen-Navigation sollen nicht scrollbar sein. Ursache war ein wachsendes App-Raster (siehe Stolperfallen), nicht die Leisten selbst. → Raster auf Fensterhöhe begrenzt, Seite scrollt nie, Notizliste und Kategorien-Spalte `overflow: hidden`, Hinweis auf die Suche bei abgeschnittener Liste (im Browser mit 80 Notizen gemessen: Liste 381 px sichtbar von 4334, Seite nicht scrollbar). Alle Checks grün (Frontend 111, Rust 30).
17. **Notizauswahl als Popup:** Nutzer: Das Dropdown für die Arbeitsnotiz auf der Startseite gefällt nicht, lieber ein kleines Popup. → `NotePicker` (Knopf + Popup mit Suche, Tastatur, Klick-daneben), `WorkNotePanel` nutzt ihn statt `<select>`; 8 neue Komponententests, Heute-Test angepasst; im Browser mit echten Tasten geprüft (Suchen, Enter, Fokus zurück). Alle Checks grün (Frontend 119, Rust 30).
18. **Feinschliff Leisten und Auswahl:** Nutzer: Beim Ziehen der Leistenbreite wird ständig Text blau markiert – es soll nur das Fenster verschoben werden; die Notizauswahl auf der Startseite soll **mittig** und nicht als Dropdown aufgehen; „In Notizen öffnen“ ganz nach unten im Abschnitt. → Markierungssperre im `ResizeHandle` (4 neue Tests; im Browser mit echter Maus quer über die Überschrift gezogen: nichts markiert, Leiste 280 px), `NotePicker` als zentriertes Fenster (Tests angepasst), Footer mit `margin-top: auto` (gemessen: Unterkante 788 von 800 px). Alle Checks grün (Frontend 123, Rust 30).
19. **Globale Suche:** Nutzer: „implementiere zunächst nur die globale Suche mit Ctrl+K“. → Rust `db::search` (+ 6 Tests, Unicode-Kleinschreibung, UND-Suche, Ausschnitt, Filter, Limit), Tauri-Command `search`, `Api.search` + Browser-Fallback, `GlobalSearch` (Ctrl/Cmd+K, Navigationsknopf, Easy/Advanced-Filter, Tastatur, Hervorhebung), `DayNoteDialog`, Navigation zu Notiz/Aufgabe(+Hervorhebung)/Tag, 25 neue Frontend-Tests. Im Browser mit echtem Ctrl+K geprüft (Treffer, Hervorhebung, Aufgabe öffnet „Demnächst“ mit markierter Zeile, frühere Schnellnotiz als Vorschau). Nicht umgesetzt: Archiv, Fundstellen-Hervorhebung in Notizen. Alle Checks grün (Frontend 148, Rust 36).
20. **Navigation oben umgebaut:** Nutzer: Suchleiste „ganz oben drüber“, Erfassen in ein anderes Design (Suchen und Erfassen sollen verschieden aussehen, „vielleicht einfach nur ein +“). → Suchleiste (Eingabefeld-Optik) ganz oben zusammen mit dem Einklapp-Pfeil, darunter ein schlichtes „+“ (Akzentfläche, accessible name „Erfassen“, Tooltip mit Kürzel); Container-Query blendet das Kürzel in der Suchleiste unter ~150 px Inhaltsbreite aus (im Browser bei Standard- und Mindestbreite geprüft). 3 neue Tests (Reihenfolge, Aussehen, Öffnen). Alle Checks grün (Frontend 151, Rust 36).
21. **Suche/Erfassen minimalistisch:** Nutzer: Der Rahmen um das Eingabefeld soll nicht weiß umrandet sein; nur der blinkende Cursor, ohne weißen Rahmen oder anderen Hintergrund. → Eingabefelder in beiden Dialogen rahmen-, hintergrund- und umrisslos, Filter als schlichte Textumschalter. Im Browser per Computed Style geprüft (Rahmen 0 px, Umriss `none`, Hintergrund transparent, Cursorfarbe gesetzt) und angesehen. 2 Klassentests. Alle Checks grün (Frontend 153, Rust 36).
22. **Navigation und Rahmen überall weg:** Nutzer: Suchleiste soll unter dem Einklapp-Pfeil bleiben (nicht auf gleicher Höhe); das „+“ wirkt wie ein Stilbruch – etwas anderes versuchen, sonst ganz weg; Schnellnotiz, Notizauswahl und „Aufgabe hinzufügen“ haben noch den weißen Rahmen – überall minimalistisch wie bei der Suche. → Pfeil eigene Zeile oben, darunter Suchleiste, darunter „+ Erfassen“ als schlichter Eintrag (Alternative zum „+“-Quadrat); alle Textfelder und Umschalter rahmen-/hintergrund-/umrisslos (siehe Designregel); im Browser mit Computed Style für 8 Felder im Fokus geprüft und angesehen. Alle Checks grün (Frontend 153, Rust 36).
