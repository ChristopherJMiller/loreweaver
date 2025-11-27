use crate::db::AppState;
use crate::error::AppError;
use ::entity::entity_tags::{self, Entity as EntityTag};
use ::entity::tags::{self, Entity as Tag};
use sea_orm::*;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
pub struct TagResponse {
    pub id: String,
    pub campaign_id: String,
    pub name: String,
    pub color: Option<String>,
    pub created_at: String,
}

impl From<tags::Model> for TagResponse {
    fn from(model: tags::Model) -> Self {
        Self {
            id: model.id,
            campaign_id: model.campaign_id,
            name: model.name,
            color: model.color,
            created_at: model.created_at.to_string(),
        }
    }
}

#[tauri::command]
pub async fn create_tag(
    state: State<'_, AppState>,
    campaign_id: String,
    name: String,
    color: Option<String>,
) -> Result<TagResponse, AppError> {
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now();

    let model = tags::ActiveModel {
        id: Set(id),
        campaign_id: Set(campaign_id),
        name: Set(name),
        color: Set(color),
        created_at: Set(now),
    };

    let result = model.insert(&state.db).await?;
    Ok(result.into())
}

#[tauri::command]
pub async fn get_tag(state: State<'_, AppState>, id: String) -> Result<TagResponse, AppError> {
    let tag = Tag::find_by_id(&id)
        .one(&state.db)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Tag {} not found", id)))?;

    Ok(tag.into())
}

#[tauri::command]
pub async fn list_tags(
    state: State<'_, AppState>,
    campaign_id: String,
) -> Result<Vec<TagResponse>, AppError> {
    let tags = Tag::find()
        .filter(tags::Column::CampaignId.eq(&campaign_id))
        .order_by_asc(tags::Column::Name)
        .all(&state.db)
        .await?;

    Ok(tags.into_iter().map(|t| t.into()).collect())
}

#[tauri::command]
pub async fn delete_tag(state: State<'_, AppState>, id: String) -> Result<bool, AppError> {
    let result = Tag::delete_by_id(&id).exec(&state.db).await?;
    Ok(result.rows_affected > 0)
}

/// Add a tag to an entity
#[tauri::command]
pub async fn add_entity_tag(
    state: State<'_, AppState>,
    tag_id: String,
    entity_type: String,
    entity_id: String,
) -> Result<bool, AppError> {
    let model = entity_tags::ActiveModel {
        tag_id: Set(tag_id),
        entity_type: Set(entity_type),
        entity_id: Set(entity_id),
    };

    model.insert(&state.db).await?;
    Ok(true)
}

/// Remove a tag from an entity
#[tauri::command]
pub async fn remove_entity_tag(
    state: State<'_, AppState>,
    tag_id: String,
    entity_type: String,
    entity_id: String,
) -> Result<bool, AppError> {
    let result = EntityTag::delete_many()
        .filter(entity_tags::Column::TagId.eq(&tag_id))
        .filter(entity_tags::Column::EntityType.eq(&entity_type))
        .filter(entity_tags::Column::EntityId.eq(&entity_id))
        .exec(&state.db)
        .await?;

    Ok(result.rows_affected > 0)
}

/// Get all tags for an entity
#[tauri::command]
pub async fn get_entity_tags(
    state: State<'_, AppState>,
    entity_type: String,
    entity_id: String,
) -> Result<Vec<TagResponse>, AppError> {
    // First get the entity_tags junction records
    let entity_tag_records = EntityTag::find()
        .filter(entity_tags::Column::EntityType.eq(&entity_type))
        .filter(entity_tags::Column::EntityId.eq(&entity_id))
        .all(&state.db)
        .await?;

    // Extract tag IDs
    let tag_ids: Vec<String> = entity_tag_records.iter().map(|et| et.tag_id.clone()).collect();

    if tag_ids.is_empty() {
        return Ok(vec![]);
    }

    // Fetch the actual tags
    let tags = Tag::find()
        .filter(tags::Column::Id.is_in(tag_ids))
        .order_by_asc(tags::Column::Name)
        .all(&state.db)
        .await?;

    Ok(tags.into_iter().map(|t| t.into()).collect())
}
