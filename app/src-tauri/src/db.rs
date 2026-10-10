use std::fs;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

use rusqlite::{params, Connection, OptionalExtension, Row};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::error::AppError;

const MAX_TITLE_CHARS: usize = 500;
const MAX_FOCUS_CHARS: usize = 500;
const MAX_NOTE_CHARS: usize = 100_000;
const MAX_CATEGORY_CHARS: usize = 60;
const MAX_NOTE_TITLE_CHARS: usize = 200;
const MAX_NOTE_CONTENT_CHARS: usize = 2_000_000;
const MAX_NOTE_PLAIN_CHARS: usize = 500_000;
const MAX_SEARCH_QUERY_CHARS: usize = 200;
const MAX_SEARCH_HITS: usize = 50;

/// Feste Kategorien. Ihre IDs sind stabil und bedeuten fachlich etwas (Heute, Erledigt).
pub const CAT_INBOX: &str = "Inbox";
pub const CAT_TODAY: &str = "Heute";
pub const CAT_DONE: &str = "Erledigt";

/// Versionierte Migrationen. Bestehende Eintraege nie aendern, nur neue anhaengen.
const MIGRATIONS: &[&str] = &[
    "
CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Inbox', 'Heute', 'Demnaechst', 'Erledigt')),
    priority TEXT CHECK (priority IN ('Hoch', 'Normal', 'Niedrig')),
    duration_minutes INTEGER,
    page_id TEXT,
    note_id TEXT,
    planned_date TEXT,
    position INTEGER NOT NULL,
    version INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    completed_at INTEGER,
    deleted_at INTEGER
);
CREATE INDEX idx_tasks_status ON tasks (status);
CREATE INDEX idx_tasks_planned_date ON tasks (planned_date);
CREATE TABLE daily_plans (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL UNIQUE,
    focus TEXT NOT NULL DEFAULT '',
    note TEXT NOT NULL DEFAULT '',
    version INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);
",
    "
CREATE TABLE preferences (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
);
",
    // Kategorien ersetzen den festen Status: Eine Aufgabe liegt in genau einer Kategorie.
    // Die alten Statuswerte sind zugleich die IDs der festen Kategorien.
    "
CREATE TABLE categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    is_system INTEGER NOT NULL DEFAULT 0,
    position INTEGER NOT NULL,
    version INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
);
INSERT INTO categories (id, name, is_system, position, version, created_at, updated_at) VALUES
    ('Inbox', 'Inbox', 1, 1, 1, CAST(strftime('%s', 'now') AS INTEGER) * 1000, CAST(strftime('%s', 'now') AS INTEGER) * 1000),
    ('Heute', 'Heute', 1, 2, 1, CAST(strftime('%s', 'now') AS INTEGER) * 1000, CAST(strftime('%s', 'now') AS INTEGER) * 1000),
    ('Demnaechst', 'Demnächst', 1, 3, 1, CAST(strftime('%s', 'now') AS INTEGER) * 1000, CAST(strftime('%s', 'now') AS INTEGER) * 1000),
    ('Erledigt', 'Erledigt', 1, 4, 1, CAST(strftime('%s', 'now') AS INTEGER) * 1000, CAST(strftime('%s', 'now') AS INTEGER) * 1000);
CREATE TABLE tasks_new (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category_id TEXT NOT NULL REFERENCES categories (id),
    priority TEXT CHECK (priority IN ('Hoch', 'Normal', 'Niedrig')),
    duration_minutes INTEGER,
    page_id TEXT,
    note_id TEXT,
    planned_date TEXT,
    position INTEGER NOT NULL,
    version INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    completed_at INTEGER,
    deleted_at INTEGER
);
INSERT INTO tasks_new (id, title, category_id, priority, duration_minutes, page_id, note_id,
    planned_date, position, version, created_at, updated_at, completed_at, deleted_at)
SELECT id, title, status, priority, duration_minutes, page_id, note_id,
    planned_date, position, version, created_at, updated_at, completed_at, deleted_at
FROM tasks;
DROP TABLE tasks;
ALTER TABLE tasks_new RENAME TO tasks;
CREATE INDEX idx_tasks_category ON tasks (category_id);
CREATE INDEX idx_tasks_planned_date ON tasks (planned_date);
",
    // Erledigte Aufgaben merken sich ihre Herkunftskategorie, damit "Wieder oeffnen" dorthin zurueckfuehrt.
    "
ALTER TABLE tasks ADD COLUMN completed_from TEXT;
UPDATE tasks SET completed_from = 'Heute' WHERE category_id = 'Erledigt' AND planned_date IS NOT NULL;
",
    // Notizen: `content` ist das blockbasierte Editor-Dokument als JSON, `plain_text` dient der Suche.
    "
CREATE TABLE notes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    plain_text TEXT NOT NULL DEFAULT '',
    pinned INTEGER NOT NULL DEFAULT 0,
    page_id TEXT,
    parent_id TEXT,
    version INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
);
CREATE INDEX idx_notes_updated_at ON notes (updated_at);
",
];

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Theme {
    #[default]
    System,
    Light,
    Dark,
}

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Mode {
    #[default]
    Easy,
    Advanced,
}

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Accent {
    #[default]
    Grau,
    Gruen,
    Blau,
    Violett,
    Rot,
}

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Font {
    #[default]
    System,
    Serif,
    Mono,
}

/// Persoenliche Einstellungen. Fehlende Felder (aeltere Staende) fallen auf Standardwerte zurueck.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(default)]
pub struct Settings {
    pub theme: Theme,
    pub mode: Mode,
    pub accent: Accent,
    pub font: Font,
}

#[derive(Debug, Clone, Copy, Default, Deserialize)]
pub struct SettingsPatch {
    pub theme: Option<Theme>,
    pub mode: Option<Mode>,
    pub accent: Option<Accent>,
    pub font: Option<Font>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Task {
    pub id: String,
    pub title: String,
    pub category_id: String,
    pub priority: Option<String>,
    pub duration_minutes: Option<i64>,
    pub page_id: Option<String>,
    pub note_id: Option<String>,
    pub planned_date: Option<String>,
    pub position: i64,
    pub version: i64,
    pub created_at: i64,
    pub updated_at: i64,
    pub completed_at: Option<i64>,
    /// Kategorie, aus der die Aufgabe abgehakt wurde (nur bei erledigten Aufgaben).
    pub completed_from: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Category {
    pub id: String,
    pub name: String,
    pub is_system: bool,
    pub position: i64,
    pub version: i64,
    pub created_at: i64,
    pub updated_at: i64,
}

/// Eintrag der Notizliste (ohne den eigentlichen Inhalt).
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NoteSummary {
    pub id: String,
    /// Gesetzter Titel oder, falls leer, die erste nicht-leere Textzeile.
    pub title: String,
    pub excerpt: String,
    pub pinned: bool,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Note {
    pub id: String,
    pub title: String,
    pub content: String,
    pub plain_text: String,
    pub pinned: bool,
    pub page_id: Option<String>,
    pub version: i64,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NotePatch {
    pub title: Option<String>,
    pub content: Option<String>,
    pub plain_text: Option<String>,
    pub pinned: Option<bool>,
}

/// Art eines Suchtreffers.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum HitKind {
    Task,
    Note,
    /// Schnellnotiz (und Tagesfokus) eines Tages.
    Day,
}

/// Wo die Suche nach Treffern schaut.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SearchScope {
    /// Titel und Inhalt.
    #[default]
    All,
    Title,
    Content,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchHit {
    pub kind: HitKind,
    /// ID der Aufgabe bzw. Notiz; bei Tagen das Datum (YYYY-MM-DD).
    pub id: String,
    pub title: String,
    /// Textausschnitt um die Fundstelle (leer bei Aufgaben).
    pub excerpt: String,
    pub category_id: Option<String>,
    pub category_name: Option<String>,
    /// Plan-Datum einer Aufgabe bzw. Datum eines Tages.
    pub date: Option<String>,
    pub title_match: bool,
    pub updated_at: i64,
}

/// Eine geloeschte Aufgabe im Papierkorb.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TrashedTask {
    pub id: String,
    pub title: String,
    pub category_id: String,
    /// Name der Kategorie, in der die Aufgabe lag (auch wenn diese inzwischen entfernt wurde).
    pub category_name: Option<String>,
    pub deleted_at: i64,
}

/// Eine geloeschte Notiz im Papierkorb.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TrashedNote {
    pub id: String,
    pub title: String,
    pub excerpt: String,
    pub deleted_at: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Trash {
    pub tasks: Vec<TrashedTask>,
    pub notes: Vec<TrashedNote>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DailyPlan {
    pub id: String,
    pub date: String,
    pub focus: String,
    pub note: String,
    pub version: i64,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TodayView {
    pub plan: DailyPlan,
    pub tasks: Vec<Task>,
    pub carryover: Vec<Task>,
}

const TASK_COLUMNS: &str = "id, title, category_id, priority, duration_minutes, page_id, \
     (SELECT n.id FROM notes n WHERE n.id = tasks.note_id AND n.deleted_at IS NULL) AS note_id, \
     planned_date, position, version, created_at, updated_at, completed_at, completed_from";

fn task_from_row(row: &Row<'_>) -> rusqlite::Result<Task> {
    Ok(Task {
        id: row.get(0)?,
        title: row.get(1)?,
        category_id: row.get(2)?,
        priority: row.get(3)?,
        duration_minutes: row.get(4)?,
        page_id: row.get(5)?,
        note_id: row.get(6)?,
        planned_date: row.get(7)?,
        position: row.get(8)?,
        version: row.get(9)?,
        created_at: row.get(10)?,
        updated_at: row.get(11)?,
        completed_at: row.get(12)?,
        completed_from: row.get(13)?,
    })
}

fn category_from_row(row: &Row<'_>) -> rusqlite::Result<Category> {
    Ok(Category {
        id: row.get(0)?,
        name: row.get(1)?,
        is_system: row.get(2)?,
        position: row.get(3)?,
        version: row.get(4)?,
        created_at: row.get(5)?,
        updated_at: row.get(6)?,
    })
}

const CATEGORY_COLUMNS: &str = "id, name, is_system, position, version, created_at, updated_at";

fn plan_from_row(row: &Row<'_>) -> rusqlite::Result<DailyPlan> {
    Ok(DailyPlan {
        id: row.get(0)?,
        date: row.get(1)?,
        focus: row.get(2)?,
        note: row.get(3)?,
        version: row.get(4)?,
        created_at: row.get(5)?,
        updated_at: row.get(6)?,
    })
}

pub fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

/// Oeffnet (und erzeugt bei Bedarf) die Datenbank. Vor ausstehenden Migrationen einer
/// bestehenden Datenbank entsteht eine Sicherungskopie neben der Datenbankdatei.
pub fn open(path: &Path) -> Result<Connection, AppError> {
    if let Some(dir) = path.parent() {
        fs::create_dir_all(dir).map_err(|e| AppError::Storage(e.to_string()))?;
    }
    let mut conn = Connection::open(path)?;
    conn.execute_batch("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;")?;
    backup_before_migration(&conn, path)?;
    migrate(&mut conn)?;
    Ok(conn)
}

fn schema_version(conn: &Connection) -> Result<usize, AppError> {
    Ok(conn.query_row("PRAGMA user_version", [], |row| row.get(0))?)
}

fn backup_before_migration(conn: &Connection, path: &Path) -> Result<(), AppError> {
    let current = schema_version(conn)?;
    // Neue Datenbanken (0) haben nichts zu sichern, aktuelle brauchen keine Migration.
    if current == 0 || current >= MIGRATIONS.len() {
        return Ok(());
    }
    let file_name = path
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or_else(|| AppError::Storage("Ungueltiger Datenbankname".into()))?;
    let target = path.with_file_name(format!("{file_name}.backup-v{current}-{}", now_ms()));
    let target = target
        .to_str()
        .ok_or_else(|| AppError::Storage("Ungueltiger Sicherungspfad".into()))?;
    // VACUUM INTO liefert auch im WAL-Betrieb eine konsistente Kopie.
    conn.execute("VACUUM INTO ?1", [target])?;
    Ok(())
}

pub fn migrate(conn: &mut Connection) -> Result<(), AppError> {
    migrate_to(conn, MIGRATIONS.len())
}

fn migrate_to(conn: &mut Connection, target: usize) -> Result<(), AppError> {
    let current = schema_version(conn)?;
    for (index, sql) in MIGRATIONS.iter().enumerate().take(target).skip(current) {
        let tx = conn.transaction()?;
        tx.execute_batch(sql)?;
        tx.execute_batch(&format!("PRAGMA user_version = {}", index + 1))?;
        tx.commit()?;
    }
    Ok(())
}

/// Erwartet ein lokales Datum im Format YYYY-MM-DD.
fn validate_date(date: &str) -> Result<(), AppError> {
    let bytes = date.as_bytes();
    let well_formed = bytes.len() == 10
        && bytes.iter().enumerate().all(|(i, b)| match i {
            4 | 7 => *b == b'-',
            _ => b.is_ascii_digit(),
        });
    if well_formed {
        Ok(())
    } else {
        Err(AppError::Invalid(format!(
            "Datum muss YYYY-MM-DD sein: {date}"
        )))
    }
}

fn check_len(value: &str, max: usize, name: &str) -> Result<(), AppError> {
    if value.chars().count() > max {
        Err(AppError::Invalid(format!(
            "{name} ist laenger als {max} Zeichen"
        )))
    } else {
        Ok(())
    }
}

fn get_task(conn: &Connection, id: &str) -> Result<Task, AppError> {
    conn.query_row(
        &format!("SELECT {TASK_COLUMNS} FROM tasks WHERE id = ?1 AND deleted_at IS NULL"),
        [id],
        task_from_row,
    )
    .optional()?
    .ok_or_else(|| AppError::NotFound(format!("Aufgabe {id}")))
}

pub fn get_or_create_plan(conn: &Connection, date: &str) -> Result<DailyPlan, AppError> {
    validate_date(date)?;
    let now = now_ms();
    conn.execute(
        "INSERT OR IGNORE INTO daily_plans (id, date, version, created_at, updated_at) \
         VALUES (?1, ?2, 1, ?3, ?3)",
        params![Uuid::new_v4().to_string(), date, now],
    )?;
    Ok(conn.query_row(
        "SELECT id, date, focus, note, version, created_at, updated_at \
         FROM daily_plans WHERE date = ?1",
        [date],
        plan_from_row,
    )?)
}

pub fn get_today(conn: &Connection, date: &str) -> Result<TodayView, AppError> {
    let plan = get_or_create_plan(conn, date)?;

    let mut stmt = conn.prepare(&format!(
        "SELECT {TASK_COLUMNS} FROM tasks \
         WHERE deleted_at IS NULL AND planned_date = ?1 AND category_id IN ('Heute', 'Erledigt') \
         ORDER BY position"
    ))?;
    let tasks = stmt
        .query_map([date], task_from_row)?
        .collect::<Result<Vec<_>, _>>()?;

    let mut stmt = conn.prepare(&format!(
        "SELECT {TASK_COLUMNS} FROM tasks \
         WHERE deleted_at IS NULL AND category_id = 'Heute' AND planned_date < ?1 \
         ORDER BY planned_date, position"
    ))?;
    let carryover = stmt
        .query_map([date], task_from_row)?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(TodayView {
        plan,
        tasks,
        carryover,
    })
}

pub fn get_settings(conn: &Connection) -> Result<Settings, AppError> {
    let raw: Option<String> = conn
        .query_row(
            "SELECT value FROM preferences WHERE key = 'settings'",
            [],
            |row| row.get(0),
        )
        .optional()?;
    // Einstellungen sind unkritisch: unlesbare Werte fallen auf die Standardwerte zurueck.
    Ok(raw
        .and_then(|json| serde_json::from_str(&json).ok())
        .unwrap_or_default())
}

pub fn update_settings(conn: &Connection, patch: SettingsPatch) -> Result<Settings, AppError> {
    let mut settings = get_settings(conn)?;
    settings.theme = patch.theme.unwrap_or(settings.theme);
    settings.mode = patch.mode.unwrap_or(settings.mode);
    settings.accent = patch.accent.unwrap_or(settings.accent);
    settings.font = patch.font.unwrap_or(settings.font);
    let json = serde_json::to_string(&settings).map_err(|e| AppError::Storage(e.to_string()))?;
    conn.execute(
        "INSERT INTO preferences (key, value, updated_at) VALUES ('settings', ?1, ?2) \
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
        params![json, now_ms()],
    )?;
    Ok(settings)
}

pub fn list_tasks(conn: &Connection) -> Result<Vec<Task>, AppError> {
    let mut stmt = conn.prepare(&format!(
        "SELECT {TASK_COLUMNS} FROM tasks WHERE deleted_at IS NULL ORDER BY position"
    ))?;
    let tasks = stmt
        .query_map([], task_from_row)?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(tasks)
}

fn display_title(title: &str, plain_text: &str) -> String {
    let title = title.trim();
    if !title.is_empty() {
        return title.to_string();
    }
    plain_text
        .lines()
        .map(str::trim)
        .find(|line| !line.is_empty())
        .map(|line| line.chars().take(80).collect())
        .unwrap_or_else(|| "Neue Notiz".to_string())
}

fn excerpt(plain_text: &str) -> String {
    plain_text
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
        .chars()
        .take(120)
        .collect()
}

fn escape_like(query: &str) -> String {
    query
        .replace('\\', "\\\\")
        .replace('%', "\\%")
        .replace('_', "\\_")
}

const NOTE_COLUMNS: &str =
    "id, title, content, plain_text, pinned, page_id, version, created_at, updated_at";

fn note_from_row(row: &Row<'_>) -> rusqlite::Result<Note> {
    Ok(Note {
        id: row.get(0)?,
        title: row.get(1)?,
        content: row.get(2)?,
        plain_text: row.get(3)?,
        pinned: row.get(4)?,
        page_id: row.get(5)?,
        version: row.get(6)?,
        created_at: row.get(7)?,
        updated_at: row.get(8)?,
    })
}

/// Notizliste: angeheftete zuerst, dann zuletzt bearbeitete. Die Suche prueft Titel und Text
/// (Gross-/Kleinschreibung wird nur fuer ASCII-Zeichen ignoriert).
pub fn list_notes(conn: &Connection, query: Option<&str>) -> Result<Vec<NoteSummary>, AppError> {
    let pattern = query
        .map(str::trim)
        .filter(|q| !q.is_empty())
        .map(|q| format!("%{}%", escape_like(q)));
    let mut stmt = conn.prepare(
        "SELECT id, title, plain_text, pinned, created_at, updated_at FROM notes \
         WHERE deleted_at IS NULL \
           AND (?1 IS NULL OR title LIKE ?1 ESCAPE '\\' OR plain_text LIKE ?1 ESCAPE '\\') \
         ORDER BY pinned DESC, updated_at DESC",
    )?;
    let notes = stmt
        .query_map([pattern], |row| {
            let title: String = row.get(1)?;
            let plain_text: String = row.get(2)?;
            Ok(NoteSummary {
                id: row.get(0)?,
                title: display_title(&title, &plain_text),
                excerpt: excerpt(&plain_text),
                pinned: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(notes)
}

pub fn get_note(conn: &Connection, id: &str) -> Result<Note, AppError> {
    conn.query_row(
        &format!("SELECT {NOTE_COLUMNS} FROM notes WHERE id = ?1 AND deleted_at IS NULL"),
        [id],
        note_from_row,
    )
    .optional()?
    .ok_or_else(|| AppError::NotFound(format!("Notiz {id}")))
}

pub fn create_note(conn: &Connection, title: Option<&str>) -> Result<Note, AppError> {
    let title = title.map(str::trim).unwrap_or_default();
    check_len(title, MAX_NOTE_TITLE_CHARS, "Titel")?;
    let id = Uuid::new_v4().to_string();
    let now = now_ms();
    conn.execute(
        "INSERT INTO notes (id, title, version, created_at, updated_at) VALUES (?1, ?2, 1, ?3, ?3)",
        params![id, title, now],
    )?;
    get_note(conn, &id)
}

/// Aendert nur die uebergebenen Felder. Anheften aendert die Bearbeitungszeit nicht,
/// damit die Sortierung nach "zuletzt bearbeitet" erhalten bleibt.
pub fn update_note(conn: &Connection, id: &str, patch: NotePatch) -> Result<Note, AppError> {
    if let Some(title) = &patch.title {
        check_len(title, MAX_NOTE_TITLE_CHARS, "Titel")?;
    }
    if let Some(content) = &patch.content {
        check_len(content, MAX_NOTE_CONTENT_CHARS, "Inhalt")?;
        if !content.is_empty() {
            serde_json::from_str::<serde_json::Value>(content).map_err(|e| {
                AppError::Invalid(format!("Inhalt ist kein gueltiges Dokument: {e}"))
            })?;
        }
    }
    if let Some(plain_text) = &patch.plain_text {
        check_len(plain_text, MAX_NOTE_PLAIN_CHARS, "Text")?;
    }
    let existing = get_note(conn, id)?;
    let text_changed =
        patch.title.is_some() || patch.content.is_some() || patch.plain_text.is_some();
    let updated_at = if text_changed {
        now_ms()
    } else {
        existing.updated_at
    };
    conn.execute(
        "UPDATE notes SET title = ?1, content = ?2, plain_text = ?3, pinned = ?4, \
         version = version + 1, updated_at = ?5 WHERE id = ?6",
        params![
            patch
                .title
                .as_deref()
                .map(str::trim)
                .unwrap_or(&existing.title),
            patch.content.as_deref().unwrap_or(&existing.content),
            patch.plain_text.as_deref().unwrap_or(&existing.plain_text),
            patch.pinned.unwrap_or(existing.pinned),
            updated_at,
            id
        ],
    )?;
    get_note(conn, id)
}

/// Loescht eine Notiz in den Papierkorb (weiches Loeschen). Verknuepfte Aufgaben bleiben
/// bestehen und verlieren nur sichtbar den Notizhinweis.
pub fn delete_note(conn: &Connection, id: &str) -> Result<(), AppError> {
    let now = now_ms();
    let changed = conn.execute(
        "UPDATE notes SET deleted_at = ?1, version = version + 1, updated_at = ?1 \
         WHERE id = ?2 AND deleted_at IS NULL",
        params![now, id],
    )?;
    if changed == 0 {
        return Err(AppError::NotFound(format!("Notiz {id}")));
    }
    Ok(())
}

pub fn restore_note(conn: &Connection, id: &str) -> Result<(), AppError> {
    let changed = conn.execute(
        "UPDATE notes SET deleted_at = NULL, version = version + 1 \
         WHERE id = ?1 AND deleted_at IS NOT NULL",
        [id],
    )?;
    if changed == 0 {
        return Err(AppError::NotFound(format!("Geloeschte Notiz {id}")));
    }
    Ok(())
}

/// Legt eine verbindliche Aufgabe an, die mit der Notiz verknuepft ist.
pub fn create_task_from_note(
    conn: &Connection,
    note_id: &str,
    title: &str,
    category_id: &str,
    date: &str,
) -> Result<Task, AppError> {
    get_note(conn, note_id)?;
    let tx = conn.unchecked_transaction()?;
    let task = create_task(&tx, title, category_id, date)?;
    tx.execute(
        "UPDATE tasks SET note_id = ?1 WHERE id = ?2",
        params![note_id, task.id],
    )?;
    tx.commit()?;
    get_task(conn, &task.id)
}

pub fn list_categories(conn: &Connection) -> Result<Vec<Category>, AppError> {
    let mut stmt = conn.prepare(&format!(
        "SELECT {CATEGORY_COLUMNS} FROM categories WHERE deleted_at IS NULL ORDER BY position"
    ))?;
    let categories = stmt
        .query_map([], category_from_row)?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(categories)
}

fn ensure_category(conn: &Connection, id: &str) -> Result<(), AppError> {
    let exists: Option<i64> = conn
        .query_row(
            "SELECT 1 FROM categories WHERE id = ?1 AND deleted_at IS NULL",
            [id],
            |row| row.get(0),
        )
        .optional()?;
    exists
        .map(|_| ())
        .ok_or_else(|| AppError::NotFound(format!("Kategorie {id}")))
}

pub fn create_category(conn: &Connection, name: &str) -> Result<Category, AppError> {
    let name = name.trim();
    if name.is_empty() {
        return Err(AppError::Invalid("Der Name darf nicht leer sein".into()));
    }
    check_len(name, MAX_CATEGORY_CHARS, "Name")?;
    let duplicates: i64 = conn.query_row(
        "SELECT COUNT(*) FROM categories WHERE deleted_at IS NULL AND lower(name) = lower(?1)",
        [name],
        |row| row.get(0),
    )?;
    if duplicates > 0 {
        return Err(AppError::Invalid(format!(
            "Es gibt bereits eine Kategorie \"{name}\""
        )));
    }
    let id = Uuid::new_v4().to_string();
    let now = now_ms();
    conn.execute(
        "INSERT INTO categories (id, name, is_system, position, version, created_at, updated_at) \
         VALUES (?1, ?2, 0, (SELECT COALESCE(MAX(position), 0) + 1 FROM categories), 1, ?3, ?3)",
        params![id, name, now],
    )?;
    Ok(conn.query_row(
        &format!("SELECT {CATEGORY_COLUMNS} FROM categories WHERE id = ?1"),
        [&id],
        category_from_row,
    )?)
}

/// Entfernt eine eigene Kategorie. Ihre Aufgaben wandern in die Inbox; deren IDs werden
/// zurueckgegeben, damit das Entfernen rueckgaengig gemacht werden kann.
pub fn delete_category(conn: &Connection, id: &str) -> Result<Vec<String>, AppError> {
    ensure_category(conn, id)?;
    let is_system: bool = conn.query_row(
        "SELECT is_system FROM categories WHERE id = ?1",
        [id],
        |row| row.get(0),
    )?;
    if is_system {
        return Err(AppError::Invalid(
            "Feste Kategorien koennen nicht entfernt werden".into(),
        ));
    }
    let tx = conn.unchecked_transaction()?;
    let moved = {
        let mut stmt =
            tx.prepare("SELECT id FROM tasks WHERE category_id = ?1 AND deleted_at IS NULL")?;
        let ids = stmt
            .query_map([id], |row| row.get::<_, String>(0))?
            .collect::<Result<Vec<_>, _>>()?;
        ids
    };
    let now = now_ms();
    tx.execute(
        "UPDATE tasks SET category_id = ?1, planned_date = NULL, completed_at = NULL, \
         version = version + 1, updated_at = ?2 WHERE category_id = ?3 AND deleted_at IS NULL",
        params![CAT_INBOX, now, id],
    )?;
    tx.execute(
        "UPDATE categories SET deleted_at = ?1, version = version + 1, updated_at = ?1 WHERE id = ?2",
        params![now, id],
    )?;
    tx.commit()?;
    Ok(moved)
}

/// Macht `delete_category` rueckgaengig. Aufgaben, die inzwischen anderswohin verschoben
/// wurden, bleiben dort.
pub fn restore_category(conn: &Connection, id: &str, task_ids: &[String]) -> Result<(), AppError> {
    let tx = conn.unchecked_transaction()?;
    let now = now_ms();
    let restored = tx.execute(
        "UPDATE categories SET deleted_at = NULL, version = version + 1, updated_at = ?1 \
         WHERE id = ?2 AND deleted_at IS NOT NULL AND is_system = 0",
        params![now, id],
    )?;
    if restored == 0 {
        return Err(AppError::NotFound(format!("Entfernte Kategorie {id}")));
    }
    for task_id in task_ids {
        tx.execute(
            "UPDATE tasks SET category_id = ?1, version = version + 1, updated_at = ?2 \
             WHERE id = ?3 AND category_id = ?4 AND deleted_at IS NULL",
            params![id, now, task_id, CAT_INBOX],
        )?;
    }
    tx.commit()?;
    Ok(())
}

pub fn create_task(
    conn: &Connection,
    title: &str,
    category_id: &str,
    date: &str,
) -> Result<Task, AppError> {
    validate_date(date)?;
    let title = title.trim();
    if title.is_empty() {
        return Err(AppError::Invalid("Der Titel darf nicht leer sein".into()));
    }
    check_len(title, MAX_TITLE_CHARS, "Titel")?;
    ensure_category(conn, category_id)?;

    let id = Uuid::new_v4().to_string();
    let now = now_ms();
    let planned = (category_id == CAT_TODAY).then_some(date);
    let position: i64 = conn.query_row(
        "SELECT COALESCE(MAX(position), 0) + 1 FROM tasks",
        [],
        |r| r.get(0),
    )?;
    conn.execute(
        "INSERT INTO tasks (id, title, category_id, planned_date, position, version, created_at, updated_at) \
         VALUES (?1, ?2, ?3, ?4, ?5, 1, ?6, ?6)",
        params![id, title, category_id, planned, position, now],
    )?;
    get_task(conn, &id)
}

pub fn move_task(
    conn: &Connection,
    id: &str,
    category_id: &str,
    date: &str,
) -> Result<Task, AppError> {
    validate_date(date)?;
    ensure_category(conn, category_id)?;
    let existing = get_task(conn, id)?;
    let now = now_ms();
    let planned = match category_id {
        CAT_TODAY => Some(date.to_string()),
        CAT_DONE => existing.planned_date,
        _ => None,
    };
    let completed = (category_id == CAT_DONE).then_some(now);
    let completed_from = if category_id == CAT_DONE {
        if existing.category_id == CAT_DONE {
            existing.completed_from
        } else {
            Some(existing.category_id)
        }
    } else {
        None
    };
    conn.execute(
        "UPDATE tasks SET category_id = ?1, planned_date = ?2, completed_at = ?3, \
         completed_from = ?4, version = version + 1, updated_at = ?5 WHERE id = ?6",
        params![category_id, planned, completed, completed_from, now, id],
    )?;
    get_task(conn, id)
}

/// Holt eine erledigte Aufgabe dorthin zurueck, wo sie abgehakt wurde. Gibt es diese
/// Kategorie nicht mehr (oder ist die Herkunft unbekannt), landet die Aufgabe in der Inbox.
pub fn reopen_task(conn: &Connection, id: &str, date: &str) -> Result<Task, AppError> {
    let existing = get_task(conn, id)?;
    if existing.category_id != CAT_DONE {
        return Err(AppError::Invalid("Die Aufgabe ist nicht erledigt".into()));
    }
    let target = existing
        .completed_from
        .filter(|from| ensure_category(conn, from).is_ok())
        .unwrap_or_else(|| CAT_INBOX.to_string());
    move_task(conn, id, &target, date)
}

/// Loescht eine Aufgabe in den Papierkorb (weiches Loeschen, wiederherstellbar).
pub fn delete_task(conn: &Connection, id: &str) -> Result<(), AppError> {
    let now = now_ms();
    let changed = conn.execute(
        "UPDATE tasks SET deleted_at = ?1, version = version + 1, updated_at = ?1 \
         WHERE id = ?2 AND deleted_at IS NULL",
        params![now, id],
    )?;
    if changed == 0 {
        return Err(AppError::NotFound(format!("Aufgabe {id}")));
    }
    Ok(())
}

/// Loescht alle erledigten Aufgaben in den Papierkorb und liefert ihre IDs zurueck.
pub fn delete_done_tasks(conn: &Connection) -> Result<Vec<String>, AppError> {
    let tx = conn.unchecked_transaction()?;
    let ids = {
        let mut stmt =
            tx.prepare("SELECT id FROM tasks WHERE category_id = ?1 AND deleted_at IS NULL")?;
        let ids = stmt
            .query_map([CAT_DONE], |row| row.get::<_, String>(0))?
            .collect::<Result<Vec<_>, _>>()?;
        ids
    };
    let now = now_ms();
    tx.execute(
        "UPDATE tasks SET deleted_at = ?1, version = version + 1, updated_at = ?1 \
         WHERE category_id = ?2 AND deleted_at IS NULL",
        params![now, CAT_DONE],
    )?;
    tx.commit()?;
    Ok(ids)
}

/// Holt geloeschte Aufgaben aus dem Papierkorb zurueck. Existiert ihre Kategorie nicht mehr,
/// landen sie in der Inbox.
pub fn restore_tasks(conn: &Connection, ids: &[String]) -> Result<(), AppError> {
    let tx = conn.unchecked_transaction()?;
    let now = now_ms();
    for id in ids {
        tx.execute(
            "UPDATE tasks SET deleted_at = NULL, version = version + 1, updated_at = ?1 \
             WHERE id = ?2 AND deleted_at IS NOT NULL",
            params![now, id],
        )?;
        tx.execute(
            "UPDATE tasks SET category_id = ?1, planned_date = NULL WHERE id = ?2 \
             AND category_id NOT IN (SELECT id FROM categories WHERE deleted_at IS NULL)",
            params![CAT_INBOX, id],
        )?;
    }
    tx.commit()?;
    Ok(())
}

/// Alle geloeschten Aufgaben und Notizen, zuletzt geloeschte zuerst.
pub fn list_trash(conn: &Connection) -> Result<Trash, AppError> {
    let mut stmt = conn.prepare(
        "SELECT t.id, t.title, t.category_id, c.name, t.deleted_at FROM tasks t \
         LEFT JOIN categories c ON c.id = t.category_id \
         WHERE t.deleted_at IS NOT NULL ORDER BY t.deleted_at DESC",
    )?;
    let tasks = stmt
        .query_map([], |row| {
            Ok(TrashedTask {
                id: row.get(0)?,
                title: row.get(1)?,
                category_id: row.get(2)?,
                category_name: row.get(3)?,
                deleted_at: row.get(4)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    let mut stmt = conn.prepare(
        "SELECT id, title, plain_text, deleted_at FROM notes \
         WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC",
    )?;
    let notes = stmt
        .query_map([], |row| {
            let title: String = row.get(1)?;
            let plain_text: String = row.get(2)?;
            Ok(TrashedNote {
                id: row.get(0)?,
                title: display_title(&title, &plain_text),
                excerpt: excerpt(&plain_text),
                deleted_at: row.get(3)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(Trash { tasks, notes })
}

/// Anzahl der Eintraege im Papierkorb (fuer die Anzeige in der Navigation).
pub fn trash_count(conn: &Connection) -> Result<i64, AppError> {
    Ok(conn.query_row(
        "SELECT (SELECT COUNT(*) FROM tasks WHERE deleted_at IS NOT NULL) \
              + (SELECT COUNT(*) FROM notes WHERE deleted_at IS NOT NULL)",
        [],
        |row| row.get(0),
    )?)
}

/// Loescht Aufgaben endgueltig. Nur Aufgaben im Papierkorb werden angefasst.
pub fn purge_tasks(conn: &Connection, ids: &[String]) -> Result<usize, AppError> {
    let tx = conn.unchecked_transaction()?;
    let mut removed = 0;
    for id in ids {
        removed += tx.execute(
            "DELETE FROM tasks WHERE id = ?1 AND deleted_at IS NOT NULL",
            [id],
        )?;
    }
    tx.commit()?;
    Ok(removed)
}

/// Loescht Notizen endgueltig. Nur Notizen im Papierkorb werden angefasst; verknuepfte
/// Aufgaben bleiben bestehen und verlieren den Notizhinweis fuer immer.
pub fn purge_notes(conn: &Connection, ids: &[String]) -> Result<usize, AppError> {
    let tx = conn.unchecked_transaction()?;
    let mut removed = 0;
    for id in ids {
        removed += tx.execute(
            "DELETE FROM notes WHERE id = ?1 AND deleted_at IS NOT NULL",
            [id],
        )?;
    }
    tx.commit()?;
    Ok(removed)
}

/// Leert den Papierkorb endgueltig und liefert die Anzahl der entfernten Eintraege.
pub fn empty_trash(conn: &Connection) -> Result<usize, AppError> {
    let tx = conn.unchecked_transaction()?;
    let tasks = tx.execute("DELETE FROM tasks WHERE deleted_at IS NOT NULL", [])?;
    let notes = tx.execute("DELETE FROM notes WHERE deleted_at IS NOT NULL", [])?;
    tx.commit()?;
    Ok(tasks + notes)
}

/// Kleinbuchstaben, Zeichen fuer Zeichen (1:1), damit Positionen in Original und Kleinschreibung
/// uebereinstimmen. Anders als SQLite-`LIKE` funktioniert das auch fuer Umlaute.
fn lower_chars(text: &str) -> Vec<char> {
    text.chars()
        .map(|c| c.to_lowercase().next().unwrap_or(c))
        .collect()
}

fn find_term(haystack: &[char], term: &[char]) -> Option<usize> {
    if term.is_empty() || haystack.len() < term.len() {
        return None;
    }
    (0..=haystack.len() - term.len()).find(|&i| haystack[i..i + term.len()] == *term)
}

/// Textausschnitt um die Fundstelle, Zeilenumbrueche werden zu Leerzeichen.
fn snippet(original: &[char], at: usize, term_len: usize) -> String {
    let start = at.saturating_sub(40);
    let end = (at + term_len + 90).min(original.len());
    let body: String = original[start..end].iter().collect();
    let body = body.split_whitespace().collect::<Vec<_>>().join(" ");
    format!(
        "{}{}{}",
        if start > 0 { "… " } else { "" },
        body,
        if end < original.len() { " …" } else { "" }
    )
}

/// Globale Suche ueber Aufgabentitel, Notiztitel, Notizinhalte sowie Schnellnotizen und Tagesfokus.
/// Alle Suchbegriffe (durch Leerzeichen getrennt) muessen vorkommen; Titeltreffer stehen vor
/// Inhaltstreffern, innerhalb davon die zuletzt geaenderten zuerst.
pub fn search(
    conn: &Connection,
    query: &str,
    scope: SearchScope,
    kinds: &[HitKind],
) -> Result<Vec<SearchHit>, AppError> {
    check_len(query, MAX_SEARCH_QUERY_CHARS, "Suchbegriff")?;
    let terms: Vec<Vec<char>> = query.split_whitespace().map(lower_chars).collect();
    if terms.is_empty() {
        return Ok(Vec::new());
    }
    let wants = |kind: HitKind| kinds.is_empty() || kinds.contains(&kind);
    let in_title = scope != SearchScope::Content;
    let in_content = scope != SearchScope::Title;
    let all_found = |a: &[char], b: &[char]| {
        terms
            .iter()
            .all(|t| find_term(a, t).is_some() || find_term(b, t).is_some())
    };
    let mut hits: Vec<SearchHit> = Vec::new();

    if wants(HitKind::Task) && in_title {
        let mut stmt = conn.prepare(
            "SELECT t.id, t.title, t.category_id, c.name, t.planned_date, t.updated_at FROM tasks t \
             LEFT JOIN categories c ON c.id = t.category_id WHERE t.deleted_at IS NULL",
        )?;
        let rows = stmt.query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, Option<String>>(3)?,
                row.get::<_, Option<String>>(4)?,
                row.get::<_, i64>(5)?,
            ))
        })?;
        for row in rows {
            let (id, title, category_id, category_name, date, updated_at) = row?;
            if all_found(&lower_chars(&title), &[]) {
                hits.push(SearchHit {
                    kind: HitKind::Task,
                    id,
                    title,
                    excerpt: String::new(),
                    category_id: Some(category_id),
                    category_name,
                    date,
                    title_match: true,
                    updated_at,
                });
            }
        }
    }

    if wants(HitKind::Note) {
        let mut stmt = conn.prepare(
            "SELECT id, title, plain_text, updated_at FROM notes WHERE deleted_at IS NULL",
        )?;
        let rows = stmt.query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, i64>(3)?,
            ))
        })?;
        for row in rows {
            let (id, raw_title, plain_text, updated_at) = row?;
            let title = display_title(&raw_title, &plain_text);
            let title_chars = lower_chars(&title);
            let text_chars = lower_chars(&plain_text);
            let none: &[char] = &[];
            let matched = match scope {
                SearchScope::All => all_found(&title_chars, &text_chars),
                SearchScope::Title => all_found(&title_chars, none),
                SearchScope::Content => all_found(&text_chars, none),
            };
            if !matched {
                continue;
            }
            let title_match =
                in_title && terms.iter().all(|t| find_term(&title_chars, t).is_some());
            let first_in_text = terms
                .iter()
                .find_map(|t| find_term(&text_chars, t).map(|at| (at, t.len())));
            let excerpt = match first_in_text {
                Some((at, len)) if in_content => {
                    snippet(&plain_text.chars().collect::<Vec<_>>(), at, len)
                }
                _ => excerpt(&plain_text),
            };
            hits.push(SearchHit {
                kind: HitKind::Note,
                id,
                title,
                excerpt,
                category_id: None,
                category_name: None,
                date: None,
                title_match,
                updated_at,
            });
        }
    }

    if wants(HitKind::Day) && in_content {
        let mut stmt = conn.prepare(
            "SELECT date, focus, note, updated_at FROM daily_plans WHERE focus <> '' OR note <> ''",
        )?;
        let rows = stmt.query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, i64>(3)?,
            ))
        })?;
        for row in rows {
            let (date, focus, note, updated_at) = row?;
            let text = if focus.is_empty() {
                note
            } else {
                format!("{focus}\n{note}")
            };
            let text_chars = lower_chars(&text);
            if !all_found(&text_chars, &[]) {
                continue;
            }
            let (at, len) = terms
                .iter()
                .find_map(|t| find_term(&text_chars, t).map(|at| (at, t.len())))
                .unwrap_or((0, 0));
            hits.push(SearchHit {
                kind: HitKind::Day,
                id: date.clone(),
                title: date.clone(),
                excerpt: snippet(&text.chars().collect::<Vec<_>>(), at, len),
                category_id: None,
                category_name: None,
                date: Some(date),
                title_match: false,
                updated_at,
            });
        }
    }

    hits.sort_by(|a, b| {
        b.title_match
            .cmp(&a.title_match)
            .then(b.updated_at.cmp(&a.updated_at))
    });
    hits.truncate(MAX_SEARCH_HITS);
    Ok(hits)
}

pub fn update_daily_plan(
    conn: &Connection,
    date: &str,
    focus: Option<&str>,
    note: Option<&str>,
) -> Result<DailyPlan, AppError> {
    if let Some(focus) = focus {
        check_len(focus, MAX_FOCUS_CHARS, "Fokus")?;
    }
    if let Some(note) = note {
        check_len(note, MAX_NOTE_CHARS, "Notiz")?;
    }
    get_or_create_plan(conn, date)?;
    conn.execute(
        "UPDATE daily_plans SET focus = COALESCE(?1, focus), note = COALESCE(?2, note), \
         version = version + 1, updated_at = ?3 WHERE date = ?4",
        params![focus, note, now_ms(), date],
    )?;
    get_or_create_plan(conn, date)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_db() -> Connection {
        let mut conn = Connection::open_in_memory().expect("In-Memory-Datenbank");
        migrate(&mut conn).expect("Migration");
        conn
    }

    #[test]
    fn migration_is_idempotent() {
        let mut conn = test_db();
        migrate(&mut conn).expect("zweite Migration");
        let version: usize = conn
            .query_row("PRAGMA user_version", [], |r| r.get(0))
            .expect("user_version");
        assert_eq!(version, MIGRATIONS.len());
    }

    #[test]
    fn new_today_task_is_planned_for_the_date() {
        let conn = test_db();
        create_task(&conn, "  Bericht ", "Heute", "2026-10-04").expect("anlegen");
        let view = get_today(&conn, "2026-10-04").expect("laden");
        assert_eq!(view.tasks.len(), 1);
        assert_eq!(view.tasks[0].title, "Bericht");
        assert!(view.carryover.is_empty());
    }

    #[test]
    fn rejects_empty_title_and_bad_date() {
        let conn = test_db();
        assert!(create_task(&conn, "   ", "Inbox", "2026-10-04").is_err());
        assert!(create_task(&conn, "x", "Inbox", "04.10.2026").is_err());
        assert!(get_today(&conn, "morgen").is_err());
    }

    #[test]
    fn yesterdays_open_tasks_are_carryover_only() {
        let conn = test_db();
        create_task(&conn, "Alt", "Heute", "2026-10-03").expect("anlegen");
        let view = get_today(&conn, "2026-10-04").expect("laden");
        assert!(view.tasks.is_empty());
        assert_eq!(view.carryover.len(), 1);
    }

    #[test]
    fn status_changes_update_plan_date_and_version() {
        let conn = test_db();
        let task = create_task(&conn, "A", "Heute", "2026-10-04").expect("anlegen");
        let done = move_task(&conn, &task.id, "Erledigt", "2026-10-04").expect("erledigen");
        assert_eq!(done.planned_date.as_deref(), Some("2026-10-04"));
        assert!(done.completed_at.is_some());
        assert_eq!(
            get_today(&conn, "2026-10-04").expect("laden").tasks.len(),
            1
        );

        let later = move_task(&conn, &task.id, "Demnaechst", "2026-10-04").expect("verschieben");
        assert_eq!(later.planned_date, None);
        assert_eq!(later.completed_at, None);
        assert_eq!(later.version, 3);
        assert!(get_today(&conn, "2026-10-04")
            .expect("laden")
            .tasks
            .is_empty());
    }

    #[test]
    fn list_tasks_returns_all_statuses_in_order() {
        let conn = test_db();
        create_task(&conn, "Eins", "Inbox", "2026-10-04").expect("anlegen");
        let two = create_task(&conn, "Zwei", "Heute", "2026-10-04").expect("anlegen");
        move_task(&conn, &two.id, "Erledigt", "2026-10-04").expect("erledigen");
        let titles: Vec<String> = list_tasks(&conn)
            .expect("laden")
            .into_iter()
            .map(|t| t.title)
            .collect();
        assert_eq!(titles, ["Eins", "Zwei"]);
    }

    #[test]
    fn settings_default_then_patch_persists_only_given_fields() {
        let conn = test_db();
        assert_eq!(get_settings(&conn).expect("laden"), Settings::default());

        let patch = SettingsPatch {
            theme: Some(Theme::Dark),
            accent: Some(Accent::Gruen),
            ..SettingsPatch::default()
        };
        update_settings(&conn, patch).expect("speichern");
        let patch = SettingsPatch {
            mode: Some(Mode::Advanced),
            ..SettingsPatch::default()
        };
        let settings = update_settings(&conn, patch).expect("speichern");

        assert_eq!(settings, get_settings(&conn).expect("laden"));
        assert_eq!(settings.theme, Theme::Dark);
        assert_eq!(settings.accent, Accent::Gruen);
        assert_eq!(settings.mode, Mode::Advanced);
        assert_eq!(settings.font, Font::System);
    }

    #[test]
    fn corrupt_settings_fall_back_to_defaults() {
        let conn = test_db();
        conn.execute(
            "INSERT INTO preferences (key, value, updated_at) VALUES ('settings', 'kaputt', 0)",
            [],
        )
        .expect("einfuegen");
        assert_eq!(get_settings(&conn).expect("laden"), Settings::default());
    }

    #[test]
    fn unknown_task_is_not_found() {
        let conn = test_db();
        let result = move_task(&conn, "gibt-es-nicht", "Heute", "2026-10-04");
        assert!(matches!(result, Err(AppError::NotFound(_))));
    }

    #[test]
    fn plan_patch_updates_only_given_fields() {
        let conn = test_db();
        update_daily_plan(&conn, "2026-10-04", Some("Release"), None).expect("Fokus");
        let plan = update_daily_plan(&conn, "2026-10-04", None, Some("Idee")).expect("Notiz");
        assert_eq!(plan.focus, "Release");
        assert_eq!(plan.note, "Idee");
        assert_eq!(plan.version, 3);
    }

    #[test]
    fn system_categories_are_seeded() {
        let conn = test_db();
        let names: Vec<String> = list_categories(&conn)
            .expect("laden")
            .into_iter()
            .map(|c| c.name)
            .collect();
        assert_eq!(names, ["Inbox", "Heute", "Demnächst", "Erledigt"]);
    }

    #[test]
    fn custom_category_lifecycle() {
        let conn = test_db();
        let kunde = create_category(&conn, "  Kunde A ").expect("anlegen");
        assert_eq!(kunde.name, "Kunde A");
        assert!(!kunde.is_system);
        assert!(create_category(&conn, "kunde a").is_err(), "Duplikat");
        assert!(create_category(&conn, "  ").is_err(), "leer");

        let task = create_task(&conn, "Angebot", &kunde.id, "2026-10-04").expect("anlegen");
        assert_eq!(task.category_id, kunde.id);
        assert_eq!(task.planned_date, None);

        let moved = delete_category(&conn, &kunde.id).expect("entfernen");
        assert_eq!(moved, std::slice::from_ref(&task.id));
        assert_eq!(list_categories(&conn).expect("laden").len(), 4);
        assert_eq!(list_tasks(&conn).expect("laden")[0].category_id, "Inbox");
        assert!(create_task(&conn, "x", &kunde.id, "2026-10-04").is_err());

        restore_category(&conn, &kunde.id, &moved).expect("wiederherstellen");
        assert_eq!(list_categories(&conn).expect("laden").len(), 5);
        assert_eq!(list_tasks(&conn).expect("laden")[0].category_id, kunde.id);
    }

    #[test]
    fn restore_keeps_tasks_that_were_moved_elsewhere() {
        let conn = test_db();
        let kunde = create_category(&conn, "Kunde A").expect("anlegen");
        let task = create_task(&conn, "A", &kunde.id, "2026-10-04").expect("anlegen");
        let moved = delete_category(&conn, &kunde.id).expect("entfernen");
        move_task(&conn, &task.id, "Demnaechst", "2026-10-04").expect("verschieben");
        restore_category(&conn, &kunde.id, &moved).expect("wiederherstellen");
        assert_eq!(
            list_tasks(&conn).expect("laden")[0].category_id,
            "Demnaechst"
        );
    }

    #[test]
    fn system_categories_cannot_be_deleted() {
        let conn = test_db();
        assert!(matches!(
            delete_category(&conn, "Heute"),
            Err(AppError::Invalid(_))
        ));
        assert!(matches!(
            delete_category(&conn, "gibt-es-nicht"),
            Err(AppError::NotFound(_))
        ));
    }

    #[test]
    fn tasks_reject_unknown_categories() {
        let conn = test_db();
        assert!(create_task(&conn, "x", "gibt-es-nicht", "2026-10-04").is_err());
        let task = create_task(&conn, "x", "Inbox", "2026-10-04").expect("anlegen");
        assert!(move_task(&conn, &task.id, "gibt-es-nicht", "2026-10-04").is_err());
    }

    #[test]
    fn upgrade_keeps_tasks_and_creates_a_backup() {
        let dir = std::env::temp_dir().join(format!("workflow-test-{}", Uuid::new_v4()));
        fs::create_dir_all(&dir).expect("Ordner");
        let path = dir.join("workflow.sqlite3");

        // Datenbank im Stand vor den Kategorien (Migration 2) mit einer Aufgabe.
        {
            let mut old = Connection::open(&path).expect("oeffnen");
            migrate_to(&mut old, 2).expect("alte Migrationen");
            old.execute(
                "INSERT INTO tasks (id, title, status, planned_date, position, version, created_at, updated_at) \
                 VALUES ('t1', 'Alt', 'Heute', '2026-10-03', 1, 1, 0, 0)",
                [],
            )
            .expect("einfuegen");
        }

        let conn = open(&path).expect("Upgrade");
        let tasks = list_tasks(&conn).expect("laden");
        assert_eq!(tasks.len(), 1);
        assert_eq!(tasks[0].category_id, "Heute");
        assert_eq!(tasks[0].planned_date.as_deref(), Some("2026-10-03"));

        let backups: Vec<String> = fs::read_dir(&dir)
            .expect("lesen")
            .filter_map(|e| e.ok()?.file_name().into_string().ok())
            .filter(|name| name.starts_with("workflow.sqlite3.backup-v2-"))
            .collect();
        assert_eq!(backups.len(), 1, "genau eine Sicherung: {backups:?}");

        // Eine bereits aktuelle Datenbank erzeugt keine weitere Sicherung.
        drop(conn);
        open(&path).expect("erneut oeffnen");
        let count = fs::read_dir(&dir)
            .expect("lesen")
            .filter_map(|e| e.ok()?.file_name().into_string().ok())
            .filter(|name| name.contains(".backup-"))
            .count();
        assert_eq!(count, 1);

        fs::remove_dir_all(&dir).expect("aufraeumen");
    }

    #[test]
    fn reopening_returns_a_task_to_where_it_was_checked_off() {
        let conn = test_db();
        let upcoming = create_task(&conn, "Später", "Demnaechst", "2026-10-04").expect("anlegen");
        let kunde = create_category(&conn, "Kunde A").expect("anlegen");
        let custom = create_task(&conn, "Angebot", &kunde.id, "2026-10-04").expect("anlegen");
        let today = create_task(&conn, "Heute", "Heute", "2026-10-04").expect("anlegen");

        for task in [&upcoming, &custom, &today] {
            let done = move_task(&conn, &task.id, "Erledigt", "2026-10-04").expect("abhaken");
            assert_eq!(
                done.completed_from.as_deref(),
                Some(task.category_id.as_str())
            );
        }

        let back = reopen_task(&conn, &upcoming.id, "2026-10-05").expect("oeffnen");
        assert_eq!(back.category_id, "Demnaechst");
        assert_eq!((back.completed_at, back.completed_from), (None, None));

        let back = reopen_task(&conn, &custom.id, "2026-10-05").expect("oeffnen");
        assert_eq!(back.category_id, kunde.id);

        let back = reopen_task(&conn, &today.id, "2026-10-05").expect("oeffnen");
        assert_eq!(back.category_id, "Heute");
        assert_eq!(back.planned_date.as_deref(), Some("2026-10-05"));
    }

    #[test]
    fn reopening_falls_back_to_inbox_when_the_origin_is_gone() {
        let conn = test_db();
        let kunde = create_category(&conn, "Kunde A").expect("anlegen");
        let task = create_task(&conn, "A", &kunde.id, "2026-10-04").expect("anlegen");
        move_task(&conn, &task.id, "Erledigt", "2026-10-04").expect("abhaken");
        delete_category(&conn, &kunde.id).expect("entfernen");

        let back = reopen_task(&conn, &task.id, "2026-10-04").expect("oeffnen");
        assert_eq!(back.category_id, "Inbox");
        assert!(
            reopen_task(&conn, &task.id, "2026-10-04").is_err(),
            "nicht mehr erledigt"
        );
    }

    #[test]
    fn deleting_done_tasks_is_soft_and_can_be_undone() {
        let conn = test_db();
        let a = create_task(&conn, "A", "Heute", "2026-10-04").expect("anlegen");
        let b = create_task(&conn, "B", "Inbox", "2026-10-04").expect("anlegen");
        let open = create_task(&conn, "Offen", "Inbox", "2026-10-04").expect("anlegen");
        move_task(&conn, &a.id, "Erledigt", "2026-10-04").expect("abhaken");
        move_task(&conn, &b.id, "Erledigt", "2026-10-04").expect("abhaken");

        delete_task(&conn, &a.id).expect("einzeln loeschen");
        assert!(delete_task(&conn, &a.id).is_err(), "schon geloescht");
        let rest = delete_done_tasks(&conn).expect("alle loeschen");
        assert_eq!(rest, std::slice::from_ref(&b.id));
        let titles: Vec<String> = list_tasks(&conn)
            .expect("laden")
            .into_iter()
            .map(|t| t.title)
            .collect();
        assert_eq!(titles, std::slice::from_ref(&open.title));

        restore_tasks(&conn, &[a.id.clone(), b.id.clone()]).expect("wiederherstellen");
        let tasks = list_tasks(&conn).expect("laden");
        assert_eq!(tasks.len(), 3);
        assert!(tasks.iter().filter(|t| t.category_id == "Erledigt").count() == 2);
    }

    #[test]
    fn upgrade_marks_existing_done_tasks_planned_for_a_day_as_from_today() {
        let mut conn = Connection::open_in_memory().expect("Datenbank");
        migrate_to(&mut conn, 3).expect("Migrationen bis 3");
        conn.execute_batch(
            "INSERT INTO tasks (id, title, category_id, planned_date, position, version, created_at, updated_at) \
             VALUES ('a', 'A', 'Erledigt', '2026-10-03', 1, 1, 0, 0), ('b', 'B', 'Erledigt', NULL, 2, 1, 0, 0);",
        )
        .expect("einfuegen");
        migrate(&mut conn).expect("Migration 4");
        let from = |id: &str| get_task(&conn, id).expect("laden").completed_from;
        assert_eq!(from("a").as_deref(), Some("Heute"));
        assert_eq!(from("b"), None);
    }

    #[test]
    fn notes_are_pinned_first_then_by_last_edit() {
        let conn = test_db();
        let a = create_note(&conn, Some("Alt")).expect("anlegen");
        std::thread::sleep(std::time::Duration::from_millis(3));
        let b = create_note(&conn, Some("Neu")).expect("anlegen");
        let titles = |c: &Connection| -> Vec<String> {
            list_notes(c, None)
                .expect("laden")
                .into_iter()
                .map(|n| n.title)
                .collect()
        };
        assert_eq!(titles(&conn), ["Neu", "Alt"]);

        let before = get_note(&conn, &a.id).expect("laden").updated_at;
        let pinned = update_note(
            &conn,
            &a.id,
            NotePatch {
                pinned: Some(true),
                ..NotePatch::default()
            },
        )
        .expect("anheften");
        assert!(pinned.pinned);
        assert_eq!(
            pinned.updated_at, before,
            "Anheften aendert die Bearbeitungszeit nicht"
        );
        assert_eq!(titles(&conn), ["Alt", "Neu"]);
        assert_ne!(a.id, b.id);
    }

    #[test]
    fn note_title_falls_back_to_the_first_text_line() {
        let conn = test_db();
        let note = create_note(&conn, None).expect("anlegen");
        assert_eq!(
            list_notes(&conn, None).expect("laden")[0].title,
            "Neue Notiz"
        );

        update_note(
            &conn,
            &note.id,
            NotePatch {
                content: Some("{\"type\":\"doc\"}".into()),
                plain_text: Some("\n  Meeting mit Lisa  \nZweite Zeile".into()),
                ..NotePatch::default()
            },
        )
        .expect("speichern");
        let summary = &list_notes(&conn, None).expect("laden")[0];
        assert_eq!(summary.title, "Meeting mit Lisa");
        assert_eq!(summary.excerpt, "Meeting mit Lisa Zweite Zeile");

        update_note(
            &conn,
            &note.id,
            NotePatch {
                title: Some("  Eigener Titel ".into()),
                ..NotePatch::default()
            },
        )
        .expect("Titel");
        assert_eq!(
            list_notes(&conn, None).expect("laden")[0].title,
            "Eigener Titel"
        );
    }

    #[test]
    fn note_search_finds_title_and_text_and_treats_wildcards_literally() {
        let conn = test_db();
        let a = create_note(&conn, Some("Quartalsplanung")).expect("anlegen");
        let b = create_note(&conn, Some("Idee")).expect("anlegen");
        update_note(
            &conn,
            &b.id,
            NotePatch {
                plain_text: Some("Rabatt 50% auf alles".into()),
                ..NotePatch::default()
            },
        )
        .expect("speichern");
        let search = |q: &str| -> Vec<String> {
            list_notes(&conn, Some(q))
                .expect("suchen")
                .into_iter()
                .map(|n| n.id)
                .collect()
        };
        assert_eq!(search("quartal"), std::slice::from_ref(&a.id));
        assert_eq!(search("50%"), std::slice::from_ref(&b.id));
        assert!(
            search("%").len() == 1,
            "% ist ein normales Zeichen, kein Platzhalter"
        );
        assert!(
            search("_").is_empty(),
            "_ ist ein normales Zeichen, kein Platzhalter"
        );
        assert_eq!(search("  ").len(), 2, "leere Suche zeigt alles");
    }

    #[test]
    fn invalid_note_content_is_rejected() {
        let conn = test_db();
        let note = create_note(&conn, None).expect("anlegen");
        let bad = NotePatch {
            content: Some("{kaputt".into()),
            ..NotePatch::default()
        };
        assert!(matches!(
            update_note(&conn, &note.id, bad),
            Err(AppError::Invalid(_))
        ));
        let long = NotePatch {
            title: Some("x".repeat(201)),
            ..NotePatch::default()
        };
        assert!(update_note(&conn, &note.id, long).is_err());
        assert!(matches!(
            update_note(&conn, "gibt-es-nicht", NotePatch::default()),
            Err(AppError::NotFound(_))
        ));
    }

    #[test]
    fn notes_can_be_deleted_and_restored() {
        let conn = test_db();
        let note = create_note(&conn, Some("A")).expect("anlegen");
        delete_note(&conn, &note.id).expect("loeschen");
        assert!(list_notes(&conn, None).expect("laden").is_empty());
        assert!(get_note(&conn, &note.id).is_err());
        assert!(delete_note(&conn, &note.id).is_err(), "schon geloescht");
        restore_note(&conn, &note.id).expect("wiederherstellen");
        assert_eq!(list_notes(&conn, None).expect("laden").len(), 1);
        assert!(restore_note(&conn, &note.id).is_err(), "nicht geloescht");
    }

    #[test]
    fn tasks_from_notes_are_linked_and_the_link_hides_with_the_note() {
        let conn = test_db();
        let note = create_note(&conn, Some("Meeting")).expect("anlegen");
        let task = create_task_from_note(&conn, &note.id, "Folien senden", "Heute", "2026-10-04")
            .expect("Aufgabe");
        assert_eq!(task.note_id.as_deref(), Some(note.id.as_str()));
        assert_eq!(task.category_id, "Heute");
        assert_eq!(task.planned_date.as_deref(), Some("2026-10-04"));
        assert_eq!(
            get_today(&conn, "2026-10-04").expect("laden").tasks.len(),
            1
        );

        delete_note(&conn, &note.id).expect("loeschen");
        assert_eq!(list_tasks(&conn).expect("laden")[0].note_id, None);
        restore_note(&conn, &note.id).expect("wiederherstellen");
        assert_eq!(
            list_tasks(&conn).expect("laden")[0].note_id.as_deref(),
            Some(note.id.as_str())
        );

        assert!(create_task_from_note(&conn, "gibt-es-nicht", "x", "Inbox", "2026-10-04").is_err());
        assert_eq!(
            list_tasks(&conn).expect("laden").len(),
            1,
            "keine halbe Aufgabe"
        );
    }

    #[test]
    fn trash_lists_deleted_tasks_and_notes_newest_first() {
        let conn = test_db();
        assert_eq!(trash_count(&conn).expect("zaehlen"), 0);
        let a = create_task(&conn, "Alt", "Inbox", "2026-10-04").expect("anlegen");
        let kunde = create_category(&conn, "Kunde A").expect("anlegen");
        let b = create_task(&conn, "Neu", &kunde.id, "2026-10-04").expect("anlegen");
        let note = create_note(&conn, Some("Meeting")).expect("anlegen");
        delete_task(&conn, &a.id).expect("loeschen");
        std::thread::sleep(std::time::Duration::from_millis(3));
        delete_task(&conn, &b.id).expect("loeschen");
        delete_note(&conn, &note.id).expect("loeschen");

        let trash = list_trash(&conn).expect("laden");
        let titles: Vec<&str> = trash.tasks.iter().map(|t| t.title.as_str()).collect();
        assert_eq!(titles, ["Neu", "Alt"]);
        assert_eq!(trash.tasks[0].category_name.as_deref(), Some("Kunde A"));
        assert_eq!(trash.tasks[1].category_name.as_deref(), Some("Inbox"));
        assert_eq!(trash.notes.len(), 1);
        assert_eq!(trash.notes[0].title, "Meeting");
        assert_eq!(trash_count(&conn).expect("zaehlen"), 3);
        assert!(list_tasks(&conn).expect("laden").is_empty());
    }

    #[test]
    fn purge_only_removes_items_that_are_in_the_trash() {
        let conn = test_db();
        let live = create_task(&conn, "Aktiv", "Inbox", "2026-10-04").expect("anlegen");
        let gone = create_task(&conn, "Weg", "Inbox", "2026-10-04").expect("anlegen");
        let live_note = create_note(&conn, Some("Aktiv")).expect("anlegen");
        let gone_note = create_note(&conn, Some("Weg")).expect("anlegen");
        delete_task(&conn, &gone.id).expect("loeschen");
        delete_note(&conn, &gone_note.id).expect("loeschen");

        let ids = [live.id.clone(), gone.id.clone()];
        assert_eq!(purge_tasks(&conn, &ids).expect("entfernen"), 1);
        let note_ids = [live_note.id.clone(), gone_note.id.clone()];
        assert_eq!(purge_notes(&conn, &note_ids).expect("entfernen"), 1);

        assert_eq!(
            list_tasks(&conn).expect("laden").len(),
            1,
            "aktive Aufgabe bleibt"
        );
        assert_eq!(
            list_notes(&conn, None).expect("laden").len(),
            1,
            "aktive Notiz bleibt"
        );
        assert_eq!(trash_count(&conn).expect("zaehlen"), 0);
        assert!(
            restore_tasks(&conn, &[gone.id]).is_ok(),
            "nichts mehr zum Wiederherstellen"
        );
        assert_eq!(list_tasks(&conn).expect("laden").len(), 1);
    }

    #[test]
    fn emptying_the_trash_keeps_everything_else() {
        let conn = test_db();
        create_task(&conn, "Bleibt", "Inbox", "2026-10-04").expect("anlegen");
        create_note(&conn, Some("Bleibt")).expect("anlegen");
        let task = create_task(&conn, "Weg", "Inbox", "2026-10-04").expect("anlegen");
        let note = create_note(&conn, Some("Weg")).expect("anlegen");
        delete_task(&conn, &task.id).expect("loeschen");
        delete_note(&conn, &note.id).expect("loeschen");

        assert_eq!(empty_trash(&conn).expect("leeren"), 2);
        assert_eq!(trash_count(&conn).expect("zaehlen"), 0);
        assert_eq!(list_tasks(&conn).expect("laden").len(), 1);
        assert_eq!(list_notes(&conn, None).expect("laden").len(), 1);
        assert_eq!(empty_trash(&conn).expect("leeren"), 0);
    }

    #[test]
    fn purging_a_note_removes_the_link_from_its_tasks_for_good() {
        let conn = test_db();
        let note = create_note(&conn, Some("Meeting")).expect("anlegen");
        let task = create_task_from_note(&conn, &note.id, "Folien", "Inbox", "2026-10-04")
            .expect("Aufgabe");
        delete_note(&conn, &note.id).expect("loeschen");
        purge_notes(&conn, std::slice::from_ref(&note.id)).expect("entfernen");
        assert_eq!(get_task(&conn, &task.id).expect("laden").note_id, None);
        assert!(restore_note(&conn, &note.id).is_err());
    }

    fn ids(hits: &[SearchHit]) -> Vec<String> {
        hits.iter().map(|h| h.title.clone()).collect()
    }

    #[test]
    fn search_finds_tasks_notes_and_day_notes_ignoring_case_even_for_umlauts() {
        let conn = test_db();
        create_task(&conn, "Äpfel kaufen", "Inbox", "2026-10-04").expect("anlegen");
        let note = create_note(&conn, Some("Einkauf")).expect("anlegen");
        update_note(
            &conn,
            &note.id,
            NotePatch {
                plain_text: Some("Liste: Brot, ÄPFEL und Käse".into()),
                ..NotePatch::default()
            },
        )
        .expect("speichern");
        update_daily_plan(
            &conn,
            "2026-10-03",
            None,
            Some("Morgen äpfel nicht vergessen"),
        )
        .expect("Plan");

        let hits = search(&conn, "äpfel", SearchScope::All, &[]).expect("suchen");
        assert_eq!(hits.len(), 3);
        let kinds: Vec<HitKind> = hits.iter().map(|h| h.kind).collect();
        assert!(kinds.contains(&HitKind::Task));
        assert!(kinds.contains(&HitKind::Note));
        assert!(kinds.contains(&HitKind::Day));
        assert_eq!(
            search(&conn, "ÄPFEL", SearchScope::All, &[])
                .expect("suchen")
                .len(),
            3
        );
    }

    #[test]
    fn search_needs_all_terms_and_ignores_empty_queries() {
        let conn = test_db();
        let note = create_note(&conn, Some("Quartalsplanung")).expect("anlegen");
        update_note(
            &conn,
            &note.id,
            NotePatch {
                plain_text: Some("Budget mit Lisa klaeren".into()),
                ..NotePatch::default()
            },
        )
        .expect("speichern");

        assert_eq!(
            search(&conn, "quartal lisa", SearchScope::All, &[])
                .expect("suchen")
                .len(),
            1
        );
        assert!(search(&conn, "quartal bob", SearchScope::All, &[])
            .expect("suchen")
            .is_empty());
        assert!(search(&conn, "   ", SearchScope::All, &[])
            .expect("suchen")
            .is_empty());
        assert!(search(&conn, "", SearchScope::All, &[])
            .expect("suchen")
            .is_empty());
        assert!(search(&conn, &"x".repeat(201), SearchScope::All, &[]).is_err());
    }

    #[test]
    fn search_shows_an_excerpt_around_the_match_and_ranks_title_matches_first() {
        let conn = test_db();
        let long = format!(
            "{} Newsletter {}",
            "Vorlauf ".repeat(30),
            "Nachlauf ".repeat(30)
        );
        let in_text = create_note(&conn, Some("Ideen")).expect("anlegen");
        update_note(
            &conn,
            &in_text.id,
            NotePatch {
                plain_text: Some(long),
                ..NotePatch::default()
            },
        )
        .expect("speichern");
        std::thread::sleep(std::time::Duration::from_millis(3));
        create_note(&conn, Some("Newsletter-Plan")).expect("anlegen");

        let hits = search(&conn, "newsletter", SearchScope::All, &[]).expect("suchen");
        assert_eq!(ids(&hits), ["Newsletter-Plan", "Ideen"]);
        assert!(hits[0].title_match);
        assert!(!hits[1].title_match);
        let excerpt = &hits[1].excerpt;
        assert!(
            excerpt.contains("Newsletter"),
            "Fundstelle im Ausschnitt: {excerpt}"
        );
        assert!(excerpt.starts_with('…') && excerpt.ends_with('…'));
        assert!(excerpt.chars().count() < 160, "Ausschnitt ist kurz");
    }

    #[test]
    fn search_scope_and_kind_filters_work() {
        let conn = test_db();
        create_task(&conn, "Budget pruefen", "Inbox", "2026-10-04").expect("anlegen");
        let note = create_note(&conn, Some("Notiz")).expect("anlegen");
        update_note(
            &conn,
            &note.id,
            NotePatch {
                plain_text: Some("Budget im Text".into()),
                ..NotePatch::default()
            },
        )
        .expect("speichern");
        let titled = create_note(&conn, Some("Budget")).expect("anlegen");
        update_daily_plan(&conn, "2026-10-04", Some("Budget klaeren"), None).expect("Plan");

        let all = search(&conn, "budget", SearchScope::All, &[]).expect("suchen");
        assert_eq!(all.len(), 4);
        let title = search(&conn, "budget", SearchScope::Title, &[]).expect("suchen");
        assert_eq!(title.len(), 2, "Aufgabentitel und Notiztitel");
        assert!(title.iter().all(|h| h.title_match));
        let content = search(&conn, "budget", SearchScope::Content, &[]).expect("suchen");
        assert_eq!(content.len(), 2, "Notizinhalt und Tag");
        assert!(content.iter().all(|h| h.kind != HitKind::Task));
        let tasks_only =
            search(&conn, "budget", SearchScope::All, &[HitKind::Task]).expect("suchen");
        assert_eq!(tasks_only.len(), 1);
        let notes_and_days = search(
            &conn,
            "budget",
            SearchScope::All,
            &[HitKind::Note, HitKind::Day],
        )
        .expect("suchen");
        assert_eq!(notes_and_days.len(), 3);
        assert_ne!(note.id, titled.id);
    }

    #[test]
    fn search_skips_deleted_items_and_carries_navigation_data() {
        let conn = test_db();
        let kunde = create_category(&conn, "Kunde A").expect("anlegen");
        let task =
            create_task(&conn, "Angebot schreiben", &kunde.id, "2026-10-04").expect("anlegen");
        let gone = create_task(&conn, "Angebot loeschen", "Inbox", "2026-10-04").expect("anlegen");
        let note = create_note(&conn, Some("Angebot Notiz")).expect("anlegen");
        delete_task(&conn, &gone.id).expect("loeschen");

        let hits = search(&conn, "angebot", SearchScope::All, &[]).expect("suchen");
        assert_eq!(hits.len(), 2);
        let hit = hits
            .iter()
            .find(|h| h.kind == HitKind::Task)
            .expect("Aufgabe");
        assert_eq!(hit.id, task.id);
        assert_eq!(hit.category_id.as_deref(), Some(kunde.id.as_str()));
        assert_eq!(hit.category_name.as_deref(), Some("Kunde A"));

        delete_note(&conn, &note.id).expect("loeschen");
        assert_eq!(
            search(&conn, "angebot", SearchScope::All, &[])
                .expect("suchen")
                .len(),
            1
        );
    }

    #[test]
    fn search_limits_the_number_of_hits_and_day_hits_carry_the_date() {
        let conn = test_db();
        for i in 0..60 {
            create_task(&conn, &format!("Treffer {i}"), "Inbox", "2026-10-04").expect("anlegen");
        }
        assert_eq!(
            search(&conn, "treffer", SearchScope::All, &[])
                .expect("suchen")
                .len(),
            MAX_SEARCH_HITS
        );

        update_daily_plan(&conn, "2026-10-02", None, Some("Gedanke zum Roadtrip")).expect("Plan");
        let day = search(&conn, "roadtrip", SearchScope::All, &[]).expect("suchen");
        assert_eq!(day.len(), 1);
        assert_eq!(day[0].date.as_deref(), Some("2026-10-02"));
        assert_eq!(day[0].id, "2026-10-02");
    }
}
