use serde::Serialize;
use validator::ValidationErrors;

/// Application error types for Tauri commands
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(#[from] sea_orm::DbErr),

    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Validation error: {0}")]
    Validation(String),

    #[error("Internal error: {0}")]
    Internal(String),
}

impl From<ValidationErrors> for AppError {
    fn from(errors: ValidationErrors) -> Self {
        // Format validation errors into a readable message
        let messages: Vec<String> = errors
            .field_errors()
            .iter()
            .flat_map(|(field, errs)| {
                errs.iter().map(move |e| {
                    e.message
                        .as_ref()
                        .map(|m| format!("{}: {}", field, m))
                        .unwrap_or_else(|| format!("{}: invalid", field))
                })
            })
            .collect();
        AppError::Validation(messages.join(", "))
    }
}

// Implement Serialize for Tauri to return errors to frontend
impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
