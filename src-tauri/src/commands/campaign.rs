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

// ============ Core implementation functions (testable) ============

pub async fn create_campaign_impl(
    db: &DatabaseConnection,
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

    let result = model.insert(db).await?;
    Ok(result.into())
}

pub async fn get_campaign_impl(
    db: &DatabaseConnection,
    id: String,
) -> Result<CampaignResponse, AppError> {
    let campaign = Campaign::find_by_id(&id)
        .one(db)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Campaign {} not found", id)))?;

    Ok(campaign.into())
}

pub async fn list_campaigns_impl(
    db: &DatabaseConnection,
) -> Result<Vec<CampaignResponse>, AppError> {
    let campaigns = Campaign::find()
        .order_by_desc(campaigns::Column::UpdatedAt)
        .all(db)
        .await?;

    Ok(campaigns.into_iter().map(|c| c.into()).collect())
}

pub async fn update_campaign_impl(
    db: &DatabaseConnection,
    id: String,
    name: Option<String>,
    description: Option<String>,
    system: Option<String>,
    settings_json: Option<String>,
) -> Result<CampaignResponse, AppError> {
    let campaign = Campaign::find_by_id(&id)
        .one(db)
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

    let result = active.update(db).await?;
    Ok(result.into())
}

pub async fn delete_campaign_impl(db: &DatabaseConnection, id: String) -> Result<bool, AppError> {
    let result = Campaign::delete_by_id(&id).exec(db).await?;
    Ok(result.rows_affected > 0)
}

// ============ Tauri command wrappers ============

#[tauri::command(rename_all = "snake_case")]
pub async fn create_campaign(
    state: State<'_, AppState>,
    name: String,
    description: Option<String>,
    system: Option<String>,
) -> Result<CampaignResponse, AppError> {
    create_campaign_impl(&state.db, name, description, system).await
}

#[tauri::command(rename_all = "snake_case")]
pub async fn get_campaign(
    state: State<'_, AppState>,
    id: String,
) -> Result<CampaignResponse, AppError> {
    get_campaign_impl(&state.db, id).await
}

#[tauri::command(rename_all = "snake_case")]
pub async fn list_campaigns(state: State<'_, AppState>) -> Result<Vec<CampaignResponse>, AppError> {
    list_campaigns_impl(&state.db).await
}

#[tauri::command(rename_all = "snake_case")]
pub async fn update_campaign(
    state: State<'_, AppState>,
    id: String,
    name: Option<String>,
    description: Option<String>,
    system: Option<String>,
    settings_json: Option<String>,
) -> Result<CampaignResponse, AppError> {
    update_campaign_impl(&state.db, id, name, description, system, settings_json).await
}

#[tauri::command(rename_all = "snake_case")]
pub async fn delete_campaign(state: State<'_, AppState>, id: String) -> Result<bool, AppError> {
    delete_campaign_impl(&state.db, id).await
}
