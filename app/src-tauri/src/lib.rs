mod db;
mod error;

use std::sync::Mutex;

use rusqlite::Connection;
use tauri::{Manager, State};

use db::{
    Category, DailyPlan, HitKind, Note, NotePatch, NoteSummary, SearchHit, SearchScope, Settings,
    SettingsPatch, Task, TodayView, Trash,
};
use error::AppError;

struct AppState {
    db: Mutex<Connection>,
}

fn with_db<T>(
    state: &AppState,
    f: impl FnOnce(&Connection) -> Result<T, AppError>,
) -> Result<T, AppError> {
    let conn = state.db.lock().map_err(|_| AppError::Lock)?;
    f(&conn)
}

#[tauri::command]
async fn get_today(state: State<'_, AppState>, date: String) -> Result<TodayView, AppError> {
    with_db(&state, |conn| db::get_today(conn, &date))
}

#[tauri::command]
async fn get_settings(state: State<'_, AppState>) -> Result<Settings, AppError> {
    with_db(&state, db::get_settings)
}

#[tauri::command]
async fn update_settings(
    state: State<'_, AppState>,
    patch: SettingsPatch,
) -> Result<Settings, AppError> {
    with_db(&state, |conn| db::update_settings(conn, patch))
}

#[tauri::command]
async fn list_tasks(state: State<'_, AppState>) -> Result<Vec<Task>, AppError> {
    with_db(&state, db::list_tasks)
}

#[tauri::command]
async fn reopen_task(
    state: State<'_, AppState>,
    id: String,
    date: String,
) -> Result<Task, AppError> {
    with_db(&state, |conn| db::reopen_task(conn, &id, &date))
}

#[tauri::command]
async fn delete_task(state: State<'_, AppState>, id: String) -> Result<(), AppError> {
    with_db(&state, |conn| db::delete_task(conn, &id))
}

#[tauri::command]
async fn delete_done_tasks(state: State<'_, AppState>) -> Result<Vec<String>, AppError> {
    with_db(&state, db::delete_done_tasks)
}

#[tauri::command]
async fn restore_tasks(state: State<'_, AppState>, ids: Vec<String>) -> Result<(), AppError> {
    with_db(&state, |conn| db::restore_tasks(conn, &ids))
}

#[tauri::command]
async fn list_notes(
    state: State<'_, AppState>,
    query: Option<String>,
) -> Result<Vec<NoteSummary>, AppError> {
    with_db(&state, |conn| db::list_notes(conn, query.as_deref()))
}

#[tauri::command]
async fn get_note(state: State<'_, AppState>, id: String) -> Result<Note, AppError> {
    with_db(&state, |conn| db::get_note(conn, &id))
}

#[tauri::command]
async fn create_note(state: State<'_, AppState>, title: Option<String>) -> Result<Note, AppError> {
    with_db(&state, |conn| db::create_note(conn, title.as_deref()))
}

#[tauri::command]
async fn update_note(
    state: State<'_, AppState>,
    id: String,
    patch: NotePatch,
) -> Result<Note, AppError> {
    with_db(&state, |conn| db::update_note(conn, &id, patch))
}

#[tauri::command]
async fn delete_note(state: State<'_, AppState>, id: String) -> Result<(), AppError> {
    with_db(&state, |conn| db::delete_note(conn, &id))
}

#[tauri::command]
async fn restore_note(state: State<'_, AppState>, id: String) -> Result<(), AppError> {
    with_db(&state, |conn| db::restore_note(conn, &id))
}

#[tauri::command]
async fn create_task_from_note(
    state: State<'_, AppState>,
    note_id: String,
    title: String,
    category_id: String,
    date: String,
) -> Result<Task, AppError> {
    with_db(&state, |conn| {
        db::create_task_from_note(conn, &note_id, &title, &category_id, &date)
    })
}

#[tauri::command]
async fn list_trash(state: State<'_, AppState>) -> Result<Trash, AppError> {
    with_db(&state, db::list_trash)
}

#[tauri::command]
async fn trash_count(state: State<'_, AppState>) -> Result<i64, AppError> {
    with_db(&state, db::trash_count)
}

#[tauri::command]
async fn purge_tasks(state: State<'_, AppState>, ids: Vec<String>) -> Result<usize, AppError> {
    with_db(&state, |conn| db::purge_tasks(conn, &ids))
}

#[tauri::command]
async fn purge_notes(state: State<'_, AppState>, ids: Vec<String>) -> Result<usize, AppError> {
    with_db(&state, |conn| db::purge_notes(conn, &ids))
}

#[tauri::command]
async fn empty_trash(state: State<'_, AppState>) -> Result<usize, AppError> {
    with_db(&state, db::empty_trash)
}

#[tauri::command]
async fn search(
    state: State<'_, AppState>,
    query: String,
    scope: Option<SearchScope>,
    kinds: Option<Vec<HitKind>>,
) -> Result<Vec<SearchHit>, AppError> {
    with_db(&state, |conn| {
        db::search(
            conn,
            &query,
            scope.unwrap_or_default(),
            kinds.as_deref().unwrap_or(&[]),
        )
    })
}

#[tauri::command]
async fn list_categories(state: State<'_, AppState>) -> Result<Vec<Category>, AppError> {
    with_db(&state, db::list_categories)
}

#[tauri::command]
async fn create_category(state: State<'_, AppState>, name: String) -> Result<Category, AppError> {
    with_db(&state, |conn| db::create_category(conn, &name))
}

#[tauri::command]
async fn delete_category(state: State<'_, AppState>, id: String) -> Result<Vec<String>, AppError> {
    with_db(&state, |conn| db::delete_category(conn, &id))
}

#[tauri::command]
async fn restore_category(
    state: State<'_, AppState>,
    id: String,
    task_ids: Vec<String>,
) -> Result<(), AppError> {
    with_db(&state, |conn| db::restore_category(conn, &id, &task_ids))
}

#[tauri::command]
async fn create_task(
    state: State<'_, AppState>,
    title: String,
    category_id: String,
    date: String,
) -> Result<Task, AppError> {
    with_db(&state, |conn| {
        db::create_task(conn, &title, &category_id, &date)
    })
}

#[tauri::command]
async fn move_task(
    state: State<'_, AppState>,
    id: String,
    category_id: String,
    date: String,
) -> Result<Task, AppError> {
    with_db(&state, |conn| db::move_task(conn, &id, &category_id, &date))
}

#[tauri::command]
async fn update_daily_plan(
    state: State<'_, AppState>,
    date: String,
    focus: Option<String>,
    note: Option<String>,
) -> Result<DailyPlan, AppError> {
    with_db(&state, |conn| {
        db::update_daily_plan(conn, &date, focus.as_deref(), note.as_deref())
    })
}

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let mut dir = app.path().app_data_dir()?;
            // Test- und Produktionsdaten bleiben getrennt.
            if cfg!(debug_assertions) {
                dir.push("dev");
            }
            let conn = db::open(&dir.join("workflow.sqlite3"))?;
            app.manage(AppState {
                db: Mutex::new(conn),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_today,
            list_tasks,
            get_settings,
            update_settings,
            create_task,
            move_task,
            reopen_task,
            delete_task,
            delete_done_tasks,
            restore_tasks,
            list_notes,
            get_note,
            create_note,
            update_note,
            delete_note,
            restore_note,
            create_task_from_note,
            list_trash,
            trash_count,
            purge_tasks,
            purge_notes,
            empty_trash,
            search,
            list_categories,
            create_category,
            delete_category,
            restore_category,
            update_daily_plan
        ])
        .run(tauri::generate_context!())
        .expect("Workflow konnte nicht gestartet werden");
}
