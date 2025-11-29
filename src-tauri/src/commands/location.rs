use crate::commands::validation::CreateLocationInput;
use crate::db::AppState;
use crate::error::AppError;
use ::entity::locations::{self, Entity as Location};
use sea_orm::*;
use serde::{Deserialize, Serialize};
use tauri::State;
use validator::Validate;

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

// ============ Core implementation functions (testable) ============

pub async fn create_location_impl(
    db: &DatabaseConnection,
    input: CreateLocationInput,
) -> Result<LocationResponse, AppError> {
    // Validate input
    input.validate()?;

    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now();

    let model = locations::ActiveModel {
        id: Set(id),
        campaign_id: Set(input.campaign_id),
        parent_id: Set(input.parent_id),
        name: Set(input.name),
        location_type: Set(input.location_type),
        description: Set(input.description),
        detail_level: Set(0),
        gm_notes: Set(None),
        created_at: Set(now),
        updated_at: Set(now),
    };

    let result = model.insert(db).await?;
    Ok(result.into())
}

pub async fn get_location_impl(
    db: &DatabaseConnection,
    id: String,
) -> Result<LocationResponse, AppError> {
    let location = Location::find_by_id(&id)
        .one(db)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Location {} not found", id)))?;

    Ok(location.into())
}

pub async fn list_locations_impl(
    db: &DatabaseConnection,
    campaign_id: String,
) -> Result<Vec<LocationResponse>, AppError> {
    let locations = Location::find()
        .filter(locations::Column::CampaignId.eq(&campaign_id))
        .order_by_asc(locations::Column::Name)
        .all(db)
        .await?;

    Ok(locations.into_iter().map(|l| l.into()).collect())
}

pub async fn get_location_children_impl(
    db: &DatabaseConnection,
    parent_id: String,
) -> Result<Vec<LocationResponse>, AppError> {
    let locations = Location::find()
        .filter(locations::Column::ParentId.eq(&parent_id))
        .order_by_asc(locations::Column::Name)
        .all(db)
        .await?;

    Ok(locations.into_iter().map(|l| l.into()).collect())
}

#[allow(clippy::too_many_arguments)]
pub async fn update_location_impl(
    db: &DatabaseConnection,
    id: String,
    name: Option<String>,
    location_type: Option<String>,
    parent_id: Option<String>,
    description: Option<String>,
    detail_level: Option<i32>,
    gm_notes: Option<String>,
) -> Result<LocationResponse, AppError> {
    let location = Location::find_by_id(&id)
        .one(db)
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

    let result = active.update(db).await?;
    Ok(result.into())
}

pub async fn delete_location_impl(db: &DatabaseConnection, id: String) -> Result<bool, AppError> {
    let result = Location::delete_by_id(&id).exec(db).await?;
    Ok(result.rows_affected > 0)
}

// ============ Tauri command wrappers ============

#[tauri::command(rename_all = "snake_case")]
pub async fn create_location(
    state: State<'_, AppState>,
    campaign_id: String,
    name: String,
    location_type: Option<String>,
    parent_id: Option<String>,
    description: Option<String>,
) -> Result<LocationResponse, AppError> {
    let input = CreateLocationInput {
        campaign_id,
        name,
        location_type: location_type.unwrap_or_else(|| "settlement".to_string()),
        parent_id,
        description,
    };
    create_location_impl(&state.db, input).await
}

#[tauri::command(rename_all = "snake_case")]
pub async fn get_location(
    state: State<'_, AppState>,
    id: String,
) -> Result<LocationResponse, AppError> {
    get_location_impl(&state.db, id).await
}

#[tauri::command(rename_all = "snake_case")]
pub async fn list_locations(
    state: State<'_, AppState>,
    campaign_id: String,
) -> Result<Vec<LocationResponse>, AppError> {
    list_locations_impl(&state.db, campaign_id).await
}

#[tauri::command(rename_all = "snake_case")]
pub async fn get_location_children(
    state: State<'_, AppState>,
    parent_id: String,
) -> Result<Vec<LocationResponse>, AppError> {
    get_location_children_impl(&state.db, parent_id).await
}

#[tauri::command(rename_all = "snake_case")]
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
    update_location_impl(
        &state.db,
        id,
        name,
        location_type,
        parent_id,
        description,
        detail_level,
        gm_notes,
    )
    .await
}

#[tauri::command(rename_all = "snake_case")]
pub async fn delete_location(state: State<'_, AppState>, id: String) -> Result<bool, AppError> {
    delete_location_impl(&state.db, id).await
}
