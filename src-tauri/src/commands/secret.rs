use crate::db::AppState;
use crate::error::AppError;
use ::entity::secrets::{self, Entity as Secret};
use sea_orm::*;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
pub struct SecretResponse {
    pub id: String,
    pub campaign_id: String,
    pub title: String,
    pub content: String,
    pub related_entity_type: Option<String>,
    pub related_entity_id: Option<String>,
    pub known_by: Option<String>,
    pub revealed: bool,
    pub revealed_in_session: Option<i32>,
    pub created_at: String,
    pub updated_at: String,
}

impl From<secrets::Model> for SecretResponse {
    fn from(model: secrets::Model) -> Self {
        Self {
            id: model.id,
            campaign_id: model.campaign_id,
            title: model.title,
            content: model.content,
            related_entity_type: model.related_entity_type,
            related_entity_id: model.related_entity_id,
            known_by: model.known_by,
            revealed: model.revealed,
            revealed_in_session: model.revealed_in_session,
            created_at: model.created_at.to_string(),
            updated_at: model.updated_at.to_string(),
        }
    }
}

#[tauri::command]
pub async fn create_secret(
    state: State<'_, AppState>,
    campaign_id: String,
    title: String,
    content: String,
    related_entity_type: Option<String>,
    related_entity_id: Option<String>,
) -> Result<SecretResponse, AppError> {
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now();

    let model = secrets::ActiveModel {
        id: Set(id),
        campaign_id: Set(campaign_id),
        title: Set(title),
        content: Set(content),
        related_entity_type: Set(related_entity_type),
        related_entity_id: Set(related_entity_id),
        known_by: Set(None),
        revealed: Set(false),
        revealed_in_session: Set(None),
        created_at: Set(now),
        updated_at: Set(now),
    };

    let result = model.insert(&state.db).await?;
    Ok(result.into())
}

#[tauri::command]
pub async fn get_secret(
    state: State<'_, AppState>,
    id: String,
) -> Result<SecretResponse, AppError> {
    let secret = Secret::find_by_id(&id)
        .one(&state.db)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Secret {} not found", id)))?;

    Ok(secret.into())
}

#[tauri::command]
pub async fn list_secrets(
    state: State<'_, AppState>,
    campaign_id: String,
) -> Result<Vec<SecretResponse>, AppError> {
    let secrets = Secret::find()
        .filter(secrets::Column::CampaignId.eq(&campaign_id))
        .order_by_desc(secrets::Column::CreatedAt)
        .all(&state.db)
        .await?;

    Ok(secrets.into_iter().map(|s| s.into()).collect())
}

#[tauri::command]
pub async fn update_secret(
    state: State<'_, AppState>,
    id: String,
    title: Option<String>,
    content: Option<String>,
    related_entity_type: Option<String>,
    related_entity_id: Option<String>,
    known_by: Option<String>,
    revealed: Option<bool>,
    revealed_in_session: Option<i32>,
) -> Result<SecretResponse, AppError> {
    let secret = Secret::find_by_id(&id)
        .one(&state.db)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Secret {} not found", id)))?;

    let mut active: secrets::ActiveModel = secret.into();

    if let Some(t) = title {
        active.title = Set(t);
    }
    if let Some(c) = content {
        active.content = Set(c);
    }
    if let Some(ret) = related_entity_type {
        active.related_entity_type = Set(Some(ret));
    }
    if let Some(rei) = related_entity_id {
        active.related_entity_id = Set(Some(rei));
    }
    if let Some(kb) = known_by {
        active.known_by = Set(Some(kb));
    }
    if let Some(r) = revealed {
        active.revealed = Set(r);
    }
    if let Some(ris) = revealed_in_session {
        active.revealed_in_session = Set(Some(ris));
    }
    active.updated_at = Set(chrono::Utc::now());

    let result = active.update(&state.db).await?;
    Ok(result.into())
}

#[tauri::command]
pub async fn delete_secret(state: State<'_, AppState>, id: String) -> Result<bool, AppError> {
    let result = Secret::delete_by_id(&id).exec(&state.db).await?;
    Ok(result.rows_affected > 0)
}
