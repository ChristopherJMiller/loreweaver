use crate::db::AppState;
use crate::error::AppError;
use sea_orm::*;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchResult {
    pub entity_type: String,
    pub entity_id: String,
    pub name: String,
    pub snippet: Option<String>,
    pub rank: f64,
}

/// Search across all entities using FTS5 full-text search
#[tauri::command]
pub async fn search_entities(
    state: State<'_, AppState>,
    campaign_id: String,
    query: String,
    entity_types: Option<Vec<String>>,
    limit: Option<u64>,
) -> Result<Vec<SearchResult>, AppError> {
    let limit = limit.unwrap_or(50);
    let _ = entity_types; // TODO: Implement entity type filtering

    // Build the FTS5 query
    // Escape special FTS5 characters and add prefix matching
    let fts_query = query
        .split_whitespace()
        .map(|word| format!("{}*", word.replace('"', "")))
        .collect::<Vec<_>>()
        .join(" ");

    let db = &state.db;
    let backend = db.get_database_backend();

    // Note: Using raw SQL with parameter binding for FTS5 query
    let results: Vec<SearchResult> = db
        .query_all(Statement::from_sql_and_values(
            backend,
            r#"
            SELECT
                entity_type,
                entity_id,
                name,
                snippet(search_index, 3, '<mark>', '</mark>', '...', 32) as snippet,
                rank
            FROM search_index
            WHERE search_index MATCH $1
            AND campaign_id = $2
            ORDER BY rank
            LIMIT $3
            "#,
            [
                fts_query.into(),
                campaign_id.into(),
                (limit as i64).into(),
            ],
        ))
        .await?
        .into_iter()
        .filter_map(|row| {
            Some(SearchResult {
                entity_type: row.try_get("", "entity_type").ok()?,
                entity_id: row.try_get("", "entity_id").ok()?,
                name: row.try_get("", "name").ok()?,
                snippet: row.try_get("", "snippet").ok(),
                rank: row.try_get("", "rank").ok()?,
            })
        })
        .collect();

    Ok(results)
}
