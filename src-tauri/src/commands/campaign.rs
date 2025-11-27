use crate::db::AppState;
use crate::error::AppError;
use ::entity::campaigns::{self, Entity as Campaign};
use sea_orm::*;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
pub struct CampaignResponse {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub system: Option<String>,
    pub settings_json: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

impl From<campaigns::Model> for CampaignResponse {
    fn from(model: campaigns::Model) -> Self {
        Self {
            id: model.id,
            name: model.name,
            description: model.description,
            system: model.system,
            settings_json: model.settings_json,
            created_at: model.created_at.to_string(),
            updated_at: model.updated_at.to_string(),
        }
    }
}

#[tauri::command]
pub async fn create_campaign(
    state: State<'_, AppState>,
    name: String,
    description: Option<String>,
    system: Option<String>,
) -> Result<CampaignResponse, AppError> {
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now();

    let model = campaigns::ActiveModel {
        id: Set(id),
        name: Set(name),
        description: Set(description),
        system: Set(system),
        settings_json: Set(None),
        created_at: Set(now),
        updated_at: Set(now),
    };

    let result = model.insert(&state.db).await?;
    Ok(result.into())
}

#[tauri::command]
pub async fn get_campaign(
    state: State<'_, AppState>,
    id: String,
) -> Result<CampaignResponse, AppError> {
    let campaign = Campaign::find_by_id(&id)
        .one(&state.db)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Campaign {} not found", id)))?;

    Ok(campaign.into())
}

#[tauri::command]
pub async fn list_campaigns(state: State<'_, AppState>) -> Result<Vec<CampaignResponse>, AppError> {
    let campaigns = Campaign::find()
        .order_by_desc(campaigns::Column::UpdatedAt)
        .all(&state.db)
        .await?;

    Ok(campaigns.into_iter().map(|c| c.into()).collect())
}

#[tauri::command]
pub async fn update_campaign(
    state: State<'_, AppState>,
    id: String,
    name: Option<String>,
    description: Option<String>,
    system: Option<String>,
    settings_json: Option<String>,
) -> Result<CampaignResponse, AppError> {
    let campaign = Campaign::find_by_id(&id)
        .one(&state.db)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Campaign {} not found", id)))?;

    let mut active: campaigns::ActiveModel = campaign.into();

    if let Some(n) = name {
        active.name = Set(n);
    }
    if let Some(d) = description {
        active.description = Set(Some(d));
    }
    if let Some(s) = system {
        active.system = Set(Some(s));
    }
    if let Some(sj) = settings_json {
        active.settings_json = Set(Some(sj));
    }
    active.updated_at = Set(chrono::Utc::now());

    let result = active.update(&state.db).await?;
    Ok(result.into())
}

#[tauri::command]
pub async fn delete_campaign(state: State<'_, AppState>, id: String) -> Result<bool, AppError> {
    let result = Campaign::delete_by_id(&id).exec(&state.db).await?;
    Ok(result.rows_affected > 0)
}
