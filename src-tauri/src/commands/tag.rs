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

// ============ Core implementation functions (testable) ============

pub async fn create_tag_impl(
    db: &DatabaseConnection,
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

    let result = model.insert(db).await?;
    Ok(result.into())
}

pub async fn get_tag_impl(
    db: &DatabaseConnection,
    id: String,
) -> Result<TagResponse, AppError> {
    let tag = Tag::find_by_id(&id)
        .one(db)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Tag {} not found", id)))?;

    Ok(tag.into())
}

pub async fn list_tags_impl(
    db: &DatabaseConnection,
    campaign_id: String,
) -> Result<Vec<TagResponse>, AppError> {
    let tags = Tag::find()
        .filter(tags::Column::CampaignId.eq(&campaign_id))
        .order_by_asc(tags::Column::Name)
        .all(db)
        .await?;

    Ok(tags.into_iter().map(|t| t.into()).collect())
}

pub async fn delete_tag_impl(
    db: &DatabaseConnection,
    id: String,
) -> Result<bool, AppError> {
    let result = Tag::delete_by_id(&id).exec(db).await?;
    Ok(result.rows_affected > 0)
}

pub async fn add_entity_tag_impl(
    db: &DatabaseConnection,
    tag_id: String,
    entity_type: String,
    entity_id: String,
) -> Result<bool, AppError> {
    let model = entity_tags::ActiveModel {
        tag_id: Set(tag_id),
        entity_type: Set(entity_type),
        entity_id: Set(entity_id),
    };

    model.insert(db).await?;
    Ok(true)
}

pub async fn remove_entity_tag_impl(
    db: &DatabaseConnection,
    tag_id: String,
    entity_type: String,
    entity_id: String,
) -> Result<bool, AppError> {
    let result = EntityTag::delete_many()
        .filter(entity_tags::Column::TagId.eq(&tag_id))
        .filter(entity_tags::Column::EntityType.eq(&entity_type))
        .filter(entity_tags::Column::EntityId.eq(&entity_id))
        .exec(db)
        .await?;

    Ok(result.rows_affected > 0)
}

pub async fn get_entity_tags_impl(
    db: &DatabaseConnection,
    entity_type: String,
    entity_id: String,
) -> Result<Vec<TagResponse>, AppError> {
    let entity_tag_records = EntityTag::find()
        .filter(entity_tags::Column::EntityType.eq(&entity_type))
        .filter(entity_tags::Column::EntityId.eq(&entity_id))
        .all(db)
        .await?;

    let tag_ids: Vec<String> = entity_tag_records.iter().map(|et| et.tag_id.clone()).collect();

    if tag_ids.is_empty() {
        return Ok(vec![]);
    }

    let tags = Tag::find()
        .filter(tags::Column::Id.is_in(tag_ids))
        .order_by_asc(tags::Column::Name)
        .all(db)
        .await?;

    Ok(tags.into_iter().map(|t| t.into()).collect())
}

// ============ Tauri command wrappers ============

#[tauri::command]
pub async fn create_tag(
    state: State<'_, AppState>,
    campaign_id: String,
    name: String,
    color: Option<String>,
) -> Result<TagResponse, AppError> {
    create_tag_impl(&state.db, campaign_id, name, color).await
}

#[tauri::command]
pub async fn get_tag(state: State<'_, AppState>, id: String) -> Result<TagResponse, AppError> {
    get_tag_impl(&state.db, id).await
}

#[tauri::command]
pub async fn list_tags(
    state: State<'_, AppState>,
    campaign_id: String,
) -> Result<Vec<TagResponse>, AppError> {
    list_tags_impl(&state.db, campaign_id).await
}

#[tauri::command]
pub async fn delete_tag(state: State<'_, AppState>, id: String) -> Result<bool, AppError> {
    delete_tag_impl(&state.db, id).await
}

#[tauri::command]
pub async fn add_entity_tag(
    state: State<'_, AppState>,
    tag_id: String,
    entity_type: String,
    entity_id: String,
) -> Result<bool, AppError> {
    add_entity_tag_impl(&state.db, tag_id, entity_type, entity_id).await
}

#[tauri::command]
pub async fn remove_entity_tag(
    state: State<'_, AppState>,
    tag_id: String,
    entity_type: String,
    entity_id: String,
) -> Result<bool, AppError> {
    remove_entity_tag_impl(&state.db, tag_id, entity_type, entity_id).await
}

#[tauri::command]
pub async fn get_entity_tags(
    state: State<'_, AppState>,
    entity_type: String,
    entity_id: String,
) -> Result<Vec<TagResponse>, AppError> {
    get_entity_tags_impl(&state.db, entity_type, entity_id).await
}

