use crate::db::AppState;
use crate::error::AppError;
use ::entity::heroes::{self, Entity as Hero};
use sea_orm::*;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
pub struct HeroResponse {
    pub id: String,
    pub campaign_id: String,
    pub player_id: Option<String>,
    pub name: String,
    pub lineage: Option<String>,
    pub classes: Option<String>,
    pub description: Option<String>,
    pub backstory: Option<String>,
    pub goals: Option<String>,
    pub bonds: Option<String>,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

impl From<heroes::Model> for HeroResponse {
    fn from(model: heroes::Model) -> Self {
        Self {
            id: model.id,
            campaign_id: model.campaign_id,
            player_id: model.player_id,
            name: model.name,
            lineage: model.lineage,
            classes: model.classes,
            description: model.description,
            backstory: model.backstory,
            goals: model.goals,
            bonds: model.bonds,
            is_active: model.is_active,
            created_at: model.created_at.to_string(),
            updated_at: model.updated_at.to_string(),
        }
    }
}

#[tauri::command]
pub async fn create_hero(
    state: State<'_, AppState>,
    campaign_id: String,
    name: String,
    player_id: Option<String>,
    lineage: Option<String>,
    classes: Option<String>,
    description: Option<String>,
) -> Result<HeroResponse, AppError> {
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now();

    let model = heroes::ActiveModel {
        id: Set(id),
        campaign_id: Set(campaign_id),
        player_id: Set(player_id),
        name: Set(name),
        lineage: Set(lineage),
        classes: Set(classes),
        description: Set(description),
        backstory: Set(None),
        goals: Set(None),
        bonds: Set(None),
        is_active: Set(true),
        created_at: Set(now),
        updated_at: Set(now),
    };

    let result = model.insert(&state.db).await?;
    Ok(result.into())
}

#[tauri::command]
pub async fn get_hero(
    state: State<'_, AppState>,
    id: String,
) -> Result<HeroResponse, AppError> {
    let hero = Hero::find_by_id(&id)
        .one(&state.db)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Hero {} not found", id)))?;

    Ok(hero.into())
}

#[tauri::command]
pub async fn list_heroes(
    state: State<'_, AppState>,
    campaign_id: String,
) -> Result<Vec<HeroResponse>, AppError> {
    let heroes = Hero::find()
        .filter(heroes::Column::CampaignId.eq(&campaign_id))
        .order_by_asc(heroes::Column::Name)
        .all(&state.db)
        .await?;

    Ok(heroes.into_iter().map(|h| h.into()).collect())
}

#[tauri::command]
pub async fn update_hero(
    state: State<'_, AppState>,
    id: String,
    name: Option<String>,
    player_id: Option<String>,
    lineage: Option<String>,
    classes: Option<String>,
    description: Option<String>,
    backstory: Option<String>,
    goals: Option<String>,
    bonds: Option<String>,
    is_active: Option<bool>,
) -> Result<HeroResponse, AppError> {
    let hero = Hero::find_by_id(&id)
        .one(&state.db)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Hero {} not found", id)))?;

    let mut active: heroes::ActiveModel = hero.into();

    if let Some(n) = name {
        active.name = Set(n);
    }
    if let Some(pid) = player_id {
        active.player_id = Set(Some(pid));
    }
    if let Some(l) = lineage {
        active.lineage = Set(Some(l));
    }
    if let Some(c) = classes {
        active.classes = Set(Some(c));
    }
    if let Some(d) = description {
        active.description = Set(Some(d));
    }
    if let Some(b) = backstory {
        active.backstory = Set(Some(b));
    }
    if let Some(g) = goals {
        active.goals = Set(Some(g));
    }
    if let Some(bo) = bonds {
        active.bonds = Set(Some(bo));
    }
    if let Some(a) = is_active {
        active.is_active = Set(a);
    }
    active.updated_at = Set(chrono::Utc::now());

    let result = active.update(&state.db).await?;
    Ok(result.into())
}

#[tauri::command]
pub async fn delete_hero(state: State<'_, AppState>, id: String) -> Result<bool, AppError> {
    let result = Hero::delete_by_id(&id).exec(&state.db).await?;
    Ok(result.rows_affected > 0)
}
