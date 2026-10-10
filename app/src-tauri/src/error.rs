use serde::{Serialize, Serializer};

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("Datenbankfehler: {0}")]
    Db(#[from] rusqlite::Error),
    #[error("Ungueltige Eingabe: {0}")]
    Invalid(String),
    #[error("Nicht gefunden: {0}")]
    NotFound(String),
    #[error("Speicherort nicht nutzbar: {0}")]
    Storage(String),
    #[error("Interner Fehler: Datenbanksperre nicht verfuegbar")]
    Lock,
}

/// Fehler gehen als lesbarer Text an die Oberflaeche.
impl Serialize for AppError {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.to_string())
    }
}
