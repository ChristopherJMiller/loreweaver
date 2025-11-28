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

// ============ Core implementation functions (testable) ============

pub async fn search_entities_impl(
    db: &DatabaseConnection,
    campaign_id: String,
    query: String,
    entity_types: Option<Vec<String>>,
    limit: Option<u64>,
) -> Result<Vec<SearchResult>, AppError> {
    let limit = limit.unwrap_or(50);
    let _ = entity_types; // TODO: Implement entity type filtering

    // Build the FTS5 query with prefix matching
    let fts_query = build_fts_query(&query);

    let backend = db.get_database_backend();

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
            [fts_query.into(), campaign_id.into(), (limit as i64).into()],
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

// ============ Tauri command wrappers ============

#[tauri::command(rename_all = "snake_case")]
pub async fn search_entities(
    state: State<'_, AppState>,
    campaign_id: String,
    query: String,
    entity_types: Option<Vec<String>>,
    limit: Option<u64>,
) -> Result<Vec<SearchResult>, AppError> {
    search_entities_impl(&state.db, campaign_id, query, entity_types, limit).await
}

/// Build FTS5 query string from user input
/// - Splits on whitespace
/// - Removes quotes (FTS5 special character)
/// - Adds prefix matching with *
fn build_fts_query(query: &str) -> String {
    query
        .split_whitespace()
        .map(|word| format!("{}*", word.replace('"', "")))
        .collect::<Vec<_>>()
        .join(" ")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_fts_query_adds_prefix_wildcard() {
        let result = build_fts_query("gandalf wizard");
        assert_eq!(result, "gandalf* wizard*");
    }

    #[test]
    fn test_fts_query_removes_quotes() {
        // Quotes are FTS5 special characters that could break queries
        let result = build_fts_query(r#"gandalf "the grey""#);
        assert_eq!(result, "gandalf* the* grey*");
    }

    #[test]
    fn test_fts_query_handles_empty_string() {
        let result = build_fts_query("");
        assert_eq!(result, "");
    }

    #[test]
    fn test_fts_query_handles_whitespace_only() {
        let result = build_fts_query("   ");
        assert_eq!(result, "");
    }

    #[test]
    fn test_fts_query_normalizes_multiple_spaces() {
        let result = build_fts_query("gandalf    wizard");
        assert_eq!(result, "gandalf* wizard*");
    }

    #[test]
    fn test_fts_query_single_word() {
        let result = build_fts_query("dragon");
        assert_eq!(result, "dragon*");
    }
}
