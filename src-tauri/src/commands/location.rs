use crate::db::AppState;
use crate::error::AppError;
use ::entity::locations::{self, Entity as Location};
use sea_orm::*;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
pub struct LocationResponse {
    pub id: String,
    pub campaign_id: String,
    pub parent_id: Option<String>,
    pub name: String,
    pub location_type: String,
    pub description: Option<String>,
    pub detail_level: i32,
    pub gm_notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

impl From<locations::Model> for LocationResponse {
    fn from(model: locations::Model) -> Self {
        Self {
            id: model.id,
            campaign_id: model.campaign_id,
            parent_id: model.parent_id,
            name: model.name,
            location_type: model.location_type,
            description: model.description,
            detail_level: model.detail_level,
            gm_notes: model.gm_notes,
            created_at: model.created_at.to_string(),
            updated_at: model.updated_at.to_string(),
        }
    }
}

#[tauri::command]
pub async fn create_location(
    state: State<'_, AppState>,
    campaign_id: String,
    name: String,
    location_type: Option<String>,
    parent_id: Option<String>,
    description: Option<String>,
) -> Result<LocationResponse, AppError> {
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now();

    let model = locations::ActiveModel {
        id: Set(id),
        campaign_id: Set(campaign_id),
        parent_id: Set(parent_id),
        name: Set(name),
        location_type: Set(location_type.unwrap_or_else(|| "settlement".to_string())),
        description: Set(description),
        detail_level: Set(0),
        gm_notes: Set(None),
        created_at: Set(now),
        updated_at: Set(now),
    };

    let result = model.insert(&state.db).await?;
    Ok(result.into())
}

#[tauri::command]
pub async fn get_location(
    state: State<'_, AppState>,
    id: String,
) -> Result<LocationResponse, AppError> {
    let location = Location::find_by_id(&id)
        .one(&state.db)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Location {} not found", id)))?;

    Ok(location.into())
}

#[tauri::command]
pub async fn list_locations(
    state: State<'_, AppState>,
    campaign_id: String,
) -> Result<Vec<LocationResponse>, AppError> {
    let locations = Location::find()
        .filter(locations::Column::CampaignId.eq(&campaign_id))
        .order_by_asc(locations::Column::Name)
        .all(&state.db)
        .await?;

    Ok(locations.into_iter().map(|l| l.into()).collect())
}

#[tauri::command]
pub async fn get_location_children(
    state: State<'_, AppState>,
    parent_id: String,
) -> Result<Vec<LocationResponse>, AppError> {
    let locations = Location::find()
        .filter(locations::Column::ParentId.eq(&parent_id))
        .order_by_asc(locations::Column::Name)
        .all(&state.db)
        .await?;

    Ok(locations.into_iter().map(|l| l.into()).collect())
}

#[tauri::command]
pub async fn update_location(
    state: State<'_, AppState>,
    id: String,
    name: Option<String>,
    location_type: Option<String>,
    parent_id: Option<String>,
    description: Option<String>,
    detail_level: Option<i32>,
    gm_notes: Option<String>,
) -> Result<LocationResponse, AppError> {
    let location = Location::find_by_id(&id)
        .one(&state.db)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Location {} not found", id)))?;

    let mut active: locations::ActiveModel = location.into();

    if let Some(n) = name {
        active.name = Set(n);
    }
    if let Some(lt) = location_type {
        active.location_type = Set(lt);
    }
    if let Some(pid) = parent_id {
        active.parent_id = Set(Some(pid));
    }
    if let Some(d) = description {
        active.description = Set(Some(d));
    }
    if let Some(dl) = detail_level {
        active.detail_level = Set(dl);
    }
    if let Some(gm) = gm_notes {
        active.gm_notes = Set(Some(gm));
    }
    active.updated_at = Set(chrono::Utc::now());

    let result = active.update(&state.db).await?;
    Ok(result.into())
}

#[tauri::command]
pub async fn delete_location(state: State<'_, AppState>, id: String) -> Result<bool, AppError> {
    let result = Location::delete_by_id(&id).exec(&state.db).await?;
    Ok(result.rows_affected > 0)
}
