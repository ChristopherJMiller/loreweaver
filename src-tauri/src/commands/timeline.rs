use crate::db::AppState;
use crate::error::AppError;
use ::entity::timeline_events::{self, Entity as TimelineEvent};
use sea_orm::*;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
pub struct TimelineEventResponse {
    pub id: String,
    pub campaign_id: String,
    pub date_display: String,
    pub sort_order: i64,
    pub title: String,
    pub description: Option<String>,
    pub significance: String,
    pub is_public: bool,
    pub created_at: String,
    pub updated_at: String,
}

impl From<timeline_events::Model> for TimelineEventResponse {
    fn from(model: timeline_events::Model) -> Self {
        Self {
            id: model.id,
            campaign_id: model.campaign_id,
            date_display: model.date_display,
            sort_order: model.sort_order,
            title: model.title,
            description: model.description,
            significance: model.significance,
            is_public: model.is_public,
            created_at: model.created_at.to_string(),
            updated_at: model.updated_at.to_string(),
        }
    }
}

#[tauri::command]
pub async fn create_timeline_event(
    state: State<'_, AppState>,
    campaign_id: String,
    title: String,
    date_display: String,
    sort_order: Option<i64>,
    description: Option<String>,
    significance: Option<String>,
) -> Result<TimelineEventResponse, AppError> {
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now();

    let model = timeline_events::ActiveModel {
        id: Set(id),
        campaign_id: Set(campaign_id),
        date_display: Set(date_display),
        sort_order: Set(sort_order.unwrap_or(0)),
        title: Set(title),
        description: Set(description),
        significance: Set(significance.unwrap_or_else(|| "local".to_string())),
        is_public: Set(true),
        created_at: Set(now),
        updated_at: Set(now),
    };

    let result = model.insert(&state.db).await?;
    Ok(result.into())
}

#[tauri::command]
pub async fn get_timeline_event(
    state: State<'_, AppState>,
    id: String,
) -> Result<TimelineEventResponse, AppError> {
    let event = TimelineEvent::find_by_id(&id)
        .one(&state.db)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Timeline event {} not found", id)))?;

    Ok(event.into())
}

#[tauri::command]
pub async fn list_timeline_events(
    state: State<'_, AppState>,
    campaign_id: String,
) -> Result<Vec<TimelineEventResponse>, AppError> {
    let events = TimelineEvent::find()
        .filter(timeline_events::Column::CampaignId.eq(&campaign_id))
        .order_by_asc(timeline_events::Column::SortOrder)
        .all(&state.db)
        .await?;

    Ok(events.into_iter().map(|e| e.into()).collect())
}

#[tauri::command]
pub async fn update_timeline_event(
    state: State<'_, AppState>,
    id: String,
    title: Option<String>,
    date_display: Option<String>,
    sort_order: Option<i64>,
    description: Option<String>,
    significance: Option<String>,
    is_public: Option<bool>,
) -> Result<TimelineEventResponse, AppError> {
    let event = TimelineEvent::find_by_id(&id)
        .one(&state.db)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Timeline event {} not found", id)))?;

    let mut active: timeline_events::ActiveModel = event.into();

    if let Some(t) = title {
        active.title = Set(t);
    }
    if let Some(dd) = date_display {
        active.date_display = Set(dd);
    }
    if let Some(so) = sort_order {
        active.sort_order = Set(so);
    }
    if let Some(d) = description {
        active.description = Set(Some(d));
    }
    if let Some(s) = significance {
        active.significance = Set(s);
    }
    if let Some(p) = is_public {
        active.is_public = Set(p);
    }
    active.updated_at = Set(chrono::Utc::now());

    let result = active.update(&state.db).await?;
    Ok(result.into())
}

#[tauri::command]
pub async fn delete_timeline_event(state: State<'_, AppState>, id: String) -> Result<bool, AppError> {
    let result = TimelineEvent::delete_by_id(&id).exec(&state.db).await?;
    Ok(result.rows_affected > 0)
}
