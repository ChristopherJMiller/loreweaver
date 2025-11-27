use crate::db::AppState;
use crate::error::AppError;
use ::entity::players::{self, Entity as Player};
use sea_orm::*;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
pub struct PlayerResponse {
    pub id: String,
    pub campaign_id: String,
    pub name: String,
    pub preferences: Option<String>,
    pub boundaries: Option<String>,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

impl From<players::Model> for PlayerResponse {
    fn from(model: players::Model) -> Self {
        Self {
            id: model.id,
            campaign_id: model.campaign_id,
            name: model.name,
            preferences: model.preferences,
            boundaries: model.boundaries,
            notes: model.notes,
            created_at: model.created_at.to_string(),
            updated_at: model.updated_at.to_string(),
        }
    }
}

#[tauri::command]
pub async fn create_player(
    state: State<'_, AppState>,
    campaign_id: String,
    name: String,
    preferences: Option<String>,
    boundaries: Option<String>,
) -> Result<PlayerResponse, AppError> {
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now();

    let model = players::ActiveModel {
        id: Set(id),
        campaign_id: Set(campaign_id),
        name: Set(name),
        preferences: Set(preferences),
        boundaries: Set(boundaries),
        notes: Set(None),
        created_at: Set(now),
        updated_at: Set(now),
    };

    let result = model.insert(&state.db).await?;
    Ok(result.into())
}

#[tauri::command]
pub async fn get_player(
    state: State<'_, AppState>,
    id: String,
) -> Result<PlayerResponse, AppError> {
    let player = Player::find_by_id(&id)
        .one(&state.db)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Player {} not found", id)))?;

    Ok(player.into())
}

#[tauri::command]
pub async fn list_players(
    state: State<'_, AppState>,
    campaign_id: String,
) -> Result<Vec<PlayerResponse>, AppError> {
    let players = Player::find()
        .filter(players::Column::CampaignId.eq(&campaign_id))
        .order_by_asc(players::Column::Name)
        .all(&state.db)
        .await?;

    Ok(players.into_iter().map(|p| p.into()).collect())
}

#[tauri::command]
pub async fn update_player(
    state: State<'_, AppState>,
    id: String,
    name: Option<String>,
    preferences: Option<String>,
    boundaries: Option<String>,
    notes: Option<String>,
) -> Result<PlayerResponse, AppError> {
    let player = Player::find_by_id(&id)
        .one(&state.db)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Player {} not found", id)))?;

    let mut active: players::ActiveModel = player.into();

    if let Some(n) = name {
        active.name = Set(n);
    }
    if let Some(p) = preferences {
        active.preferences = Set(Some(p));
    }
    if let Some(b) = boundaries {
        active.boundaries = Set(Some(b));
    }
    if let Some(no) = notes {
        active.notes = Set(Some(no));
    }
    active.updated_at = Set(chrono::Utc::now());

    let result = active.update(&state.db).await?;
    Ok(result.into())
}

#[tauri::command]
pub async fn delete_player(state: State<'_, AppState>, id: String) -> Result<bool, AppError> {
    let result = Player::delete_by_id(&id).exec(&state.db).await?;
    Ok(result.rows_affected > 0)
}
