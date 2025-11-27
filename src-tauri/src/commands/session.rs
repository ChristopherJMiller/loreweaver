use crate::db::AppState;
use crate::error::AppError;
use ::entity::sessions::{self, Entity as Session};
use sea_orm::*;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
pub struct SessionResponse {
    pub id: String,
    pub campaign_id: String,
    pub session_number: i32,
    pub date: Option<String>,
    pub title: Option<String>,
    pub planned_content: Option<String>,
    pub notes: Option<String>,
    pub summary: Option<String>,
    pub highlights: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

impl From<sessions::Model> for SessionResponse {
    fn from(model: sessions::Model) -> Self {
        Self {
            id: model.id,
            campaign_id: model.campaign_id,
            session_number: model.session_number,
            date: model.date.map(|d| d.to_string()),
            title: model.title,
            planned_content: model.planned_content,
            notes: model.notes,
            summary: model.summary,
            highlights: model.highlights,
            created_at: model.created_at.to_string(),
            updated_at: model.updated_at.to_string(),
        }
    }
}

#[tauri::command]
pub async fn create_session(
    state: State<'_, AppState>,
    campaign_id: String,
    session_number: i32,
    title: Option<String>,
    date: Option<String>,
) -> Result<SessionResponse, AppError> {
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now();

    let parsed_date = date.and_then(|d| chrono::NaiveDate::parse_from_str(&d, "%Y-%m-%d").ok());

    let model = sessions::ActiveModel {
        id: Set(id),
        campaign_id: Set(campaign_id),
        session_number: Set(session_number),
        date: Set(parsed_date),
        title: Set(title),
        planned_content: Set(None),
        notes: Set(None),
        summary: Set(None),
        highlights: Set(None),
        created_at: Set(now),
        updated_at: Set(now),
    };

    let result = model.insert(&state.db).await?;
    Ok(result.into())
}

#[tauri::command]
pub async fn get_session(
    state: State<'_, AppState>,
    id: String,
) -> Result<SessionResponse, AppError> {
    let session = Session::find_by_id(&id)
        .one(&state.db)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Session {} not found", id)))?;

    Ok(session.into())
}

#[tauri::command]
pub async fn list_sessions(
    state: State<'_, AppState>,
    campaign_id: String,
) -> Result<Vec<SessionResponse>, AppError> {
    let sessions = Session::find()
        .filter(sessions::Column::CampaignId.eq(&campaign_id))
        .order_by_asc(sessions::Column::SessionNumber)
        .all(&state.db)
        .await?;

    Ok(sessions.into_iter().map(|s| s.into()).collect())
}

#[tauri::command]
pub async fn update_session(
    state: State<'_, AppState>,
    id: String,
    session_number: Option<i32>,
    title: Option<String>,
    date: Option<String>,
    planned_content: Option<String>,
    notes: Option<String>,
    summary: Option<String>,
    highlights: Option<String>,
) -> Result<SessionResponse, AppError> {
    let session = Session::find_by_id(&id)
        .one(&state.db)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Session {} not found", id)))?;

    let mut active: sessions::ActiveModel = session.into();

    if let Some(sn) = session_number {
        active.session_number = Set(sn);
    }
    if let Some(t) = title {
        active.title = Set(Some(t));
    }
    if let Some(d) = date {
        let parsed = chrono::NaiveDate::parse_from_str(&d, "%Y-%m-%d").ok();
        active.date = Set(parsed);
    }
    if let Some(pc) = planned_content {
        active.planned_content = Set(Some(pc));
    }
    if let Some(n) = notes {
        active.notes = Set(Some(n));
    }
    if let Some(s) = summary {
        active.summary = Set(Some(s));
    }
    if let Some(h) = highlights {
        active.highlights = Set(Some(h));
    }
    active.updated_at = Set(chrono::Utc::now());

    let result = active.update(&state.db).await?;
    Ok(result.into())
}

#[tauri::command]
pub async fn delete_session(state: State<'_, AppState>, id: String) -> Result<bool, AppError> {
    let result = Session::delete_by_id(&id).exec(&state.db).await?;
    Ok(result.rows_affected > 0)
}
