use crate::db::AppState;
use crate::error::AppError;
use ::entity::characters::{self, Entity as Character};
use sea_orm::*;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
pub struct CharacterResponse {
    pub id: String,
    pub campaign_id: String,
    pub name: String,
    pub lineage: Option<String>,
    pub occupation: Option<String>,
    pub is_alive: bool,
    pub description: Option<String>,
    pub personality: Option<String>,
    pub motivations: Option<String>,
    pub secrets: Option<String>,
    pub voice_notes: Option<String>,
    pub stat_block_json: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

impl From<characters::Model> for CharacterResponse {
    fn from(model: characters::Model) -> Self {
        Self {
            id: model.id,
            campaign_id: model.campaign_id,
            name: model.name,
            lineage: model.lineage,
            occupation: model.occupation,
            is_alive: model.is_alive,
            description: model.description,
            personality: model.personality,
            motivations: model.motivations,
            secrets: model.secrets,
            voice_notes: model.voice_notes,
            stat_block_json: model.stat_block_json,
            created_at: model.created_at.to_string(),
            updated_at: model.updated_at.to_string(),
        }
    }
}

// ============ Core implementation functions (testable) ============

pub async fn create_character_impl(
    db: &DatabaseConnection,
    campaign_id: String,
    name: String,
    lineage: Option<String>,
    occupation: Option<String>,
    description: Option<String>,
) -> Result<CharacterResponse, AppError> {
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now();

    let model = characters::ActiveModel {
        id: Set(id),
        campaign_id: Set(campaign_id),
        name: Set(name),
        lineage: Set(lineage),
        occupation: Set(occupation),
        is_alive: Set(true),
        description: Set(description),
        personality: Set(None),
        motivations: Set(None),
        secrets: Set(None),
        voice_notes: Set(None),
        stat_block_json: Set(None),
        created_at: Set(now),
        updated_at: Set(now),
    };

    let result = model.insert(db).await?;
    Ok(result.into())
}

pub async fn get_character_impl(
    db: &DatabaseConnection,
    id: String,
) -> Result<CharacterResponse, AppError> {
    let character = Character::find_by_id(&id)
        .one(db)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Character {} not found", id)))?;

    Ok(character.into())
}

pub async fn list_characters_impl(
    db: &DatabaseConnection,
    campaign_id: String,
) -> Result<Vec<CharacterResponse>, AppError> {
    let characters = Character::find()
        .filter(characters::Column::CampaignId.eq(&campaign_id))
        .order_by_asc(characters::Column::Name)
        .all(db)
        .await?;

    Ok(characters.into_iter().map(|c| c.into()).collect())
}

#[allow(clippy::too_many_arguments)]
pub async fn update_character_impl(
    db: &DatabaseConnection,
    id: String,
    name: Option<String>,
    lineage: Option<String>,
    occupation: Option<String>,
    is_alive: Option<bool>,
    description: Option<String>,
    personality: Option<String>,
    motivations: Option<String>,
    secrets: Option<String>,
    voice_notes: Option<String>,
    stat_block_json: Option<String>,
) -> Result<CharacterResponse, AppError> {
    let character = Character::find_by_id(&id)
        .one(db)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Character {} not found", id)))?;

    let mut active: characters::ActiveModel = character.into();

    if let Some(n) = name {
        active.name = Set(n);
    }
    if let Some(l) = lineage {
        active.lineage = Set(Some(l));
    }
    if let Some(o) = occupation {
        active.occupation = Set(Some(o));
    }
    if let Some(a) = is_alive {
        active.is_alive = Set(a);
    }
    if let Some(d) = description {
        active.description = Set(Some(d));
    }
    if let Some(p) = personality {
        active.personality = Set(Some(p));
    }
    if let Some(m) = motivations {
        active.motivations = Set(Some(m));
    }
    if let Some(s) = secrets {
        active.secrets = Set(Some(s));
    }
    if let Some(v) = voice_notes {
        active.voice_notes = Set(Some(v));
    }
    if let Some(sb) = stat_block_json {
        active.stat_block_json = Set(Some(sb));
    }
    active.updated_at = Set(chrono::Utc::now());

    let result = active.update(db).await?;
    Ok(result.into())
}

pub async fn delete_character_impl(
    db: &DatabaseConnection,
    id: String,
) -> Result<bool, AppError> {
    let result = Character::delete_by_id(&id).exec(db).await?;
    Ok(result.rows_affected > 0)
}

// ============ Tauri command wrappers ============

#[tauri::command(rename_all = "snake_case")]
pub async fn create_character(
    state: State<'_, AppState>,
    campaign_id: String,
    name: String,
    lineage: Option<String>,
    occupation: Option<String>,
    description: Option<String>,
) -> Result<CharacterResponse, AppError> {
    create_character_impl(&state.db, campaign_id, name, lineage, occupation, description).await
}

#[tauri::command(rename_all = "snake_case")]
pub async fn get_character(
    state: State<'_, AppState>,
    id: String,
) -> Result<CharacterResponse, AppError> {
    get_character_impl(&state.db, id).await
}

#[tauri::command(rename_all = "snake_case")]
pub async fn list_characters(
    state: State<'_, AppState>,
    campaign_id: String,
) -> Result<Vec<CharacterResponse>, AppError> {
    list_characters_impl(&state.db, campaign_id).await
}

#[tauri::command(rename_all = "snake_case")]
pub async fn update_character(
    state: State<'_, AppState>,
    id: String,
    name: Option<String>,
    lineage: Option<String>,
    occupation: Option<String>,
    is_alive: Option<bool>,
    description: Option<String>,
    personality: Option<String>,
    motivations: Option<String>,
    secrets: Option<String>,
    voice_notes: Option<String>,
    stat_block_json: Option<String>,
) -> Result<CharacterResponse, AppError> {
    update_character_impl(
        &state.db, id, name, lineage, occupation, is_alive,
        description, personality, motivations, secrets, voice_notes, stat_block_json,
    ).await
}

#[tauri::command(rename_all = "snake_case")]
pub async fn delete_character(state: State<'_, AppState>, id: String) -> Result<bool, AppError> {
    delete_character_impl(&state.db, id).await
}

