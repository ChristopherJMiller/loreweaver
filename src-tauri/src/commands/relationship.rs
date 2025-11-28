use crate::db::AppState;
use crate::error::AppError;
use ::entity::relationships::{self, Entity as Relationship};
use sea_orm::*;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
pub struct RelationshipResponse {
    pub id: String,
    pub campaign_id: String,
    pub source_type: String,
    pub source_id: String,
    pub target_type: String,
    pub target_id: String,
    pub relationship_type: String,
    pub description: Option<String>,
    pub is_bidirectional: bool,
    pub strength: Option<i32>,
    pub is_public: bool,
    pub created_at: String,
    pub updated_at: String,
}

impl From<relationships::Model> for RelationshipResponse {
    fn from(model: relationships::Model) -> Self {
        Self {
            id: model.id,
            campaign_id: model.campaign_id,
            source_type: model.source_type,
            source_id: model.source_id,
            target_type: model.target_type,
            target_id: model.target_id,
            relationship_type: model.relationship_type,
            description: model.description,
            is_bidirectional: model.is_bidirectional,
            strength: model.strength,
            is_public: model.is_public,
            created_at: model.created_at.to_string(),
            updated_at: model.updated_at.to_string(),
        }
    }
}

// ============ Core implementation functions (testable) ============

#[allow(clippy::too_many_arguments)]
pub async fn create_relationship_impl(
    db: &DatabaseConnection,
    campaign_id: String,
    source_type: String,
    source_id: String,
    target_type: String,
    target_id: String,
    relationship_type: String,
    description: Option<String>,
    is_bidirectional: Option<bool>,
    strength: Option<i32>,
) -> Result<RelationshipResponse, AppError> {
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now();

    let model = relationships::ActiveModel {
        id: Set(id),
        campaign_id: Set(campaign_id),
        source_type: Set(source_type),
        source_id: Set(source_id),
        target_type: Set(target_type),
        target_id: Set(target_id),
        relationship_type: Set(relationship_type),
        description: Set(description),
        is_bidirectional: Set(is_bidirectional.unwrap_or(false)),
        strength: Set(strength),
        is_public: Set(true),
        created_at: Set(now),
        updated_at: Set(now),
    };

    let result = model.insert(db).await?;
    Ok(result.into())
}

pub async fn get_relationship_impl(
    db: &DatabaseConnection,
    id: String,
) -> Result<RelationshipResponse, AppError> {
    let rel = Relationship::find_by_id(&id)
        .one(db)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Relationship {} not found", id)))?;

    Ok(rel.into())
}

pub async fn list_relationships_impl(
    db: &DatabaseConnection,
    campaign_id: String,
) -> Result<Vec<RelationshipResponse>, AppError> {
    let rels = Relationship::find()
        .filter(relationships::Column::CampaignId.eq(&campaign_id))
        .order_by_desc(relationships::Column::CreatedAt)
        .all(db)
        .await?;

    Ok(rels.into_iter().map(|r| r.into()).collect())
}

pub async fn get_entity_relationships_impl(
    db: &DatabaseConnection,
    entity_type: String,
    entity_id: String,
) -> Result<Vec<RelationshipResponse>, AppError> {
    let rels = Relationship::find()
        .filter(
            Condition::any()
                .add(
                    Condition::all()
                        .add(relationships::Column::SourceType.eq(&entity_type))
                        .add(relationships::Column::SourceId.eq(&entity_id)),
                )
                .add(
                    Condition::all()
                        .add(relationships::Column::TargetType.eq(&entity_type))
                        .add(relationships::Column::TargetId.eq(&entity_id)),
                ),
        )
        .all(db)
        .await?;

    Ok(rels.into_iter().map(|r| r.into()).collect())
}

#[allow(clippy::too_many_arguments)]
pub async fn update_relationship_impl(
    db: &DatabaseConnection,
    id: String,
    relationship_type: Option<String>,
    description: Option<String>,
    is_bidirectional: Option<bool>,
    strength: Option<i32>,
    is_public: Option<bool>,
) -> Result<RelationshipResponse, AppError> {
    let rel = Relationship::find_by_id(&id)
        .one(db)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Relationship {} not found", id)))?;

    let mut active: relationships::ActiveModel = rel.into();

    if let Some(rt) = relationship_type {
        active.relationship_type = Set(rt);
    }
    if let Some(d) = description {
        active.description = Set(Some(d));
    }
    if let Some(bi) = is_bidirectional {
        active.is_bidirectional = Set(bi);
    }
    if let Some(s) = strength {
        active.strength = Set(Some(s));
    }
    if let Some(p) = is_public {
        active.is_public = Set(p);
    }
    active.updated_at = Set(chrono::Utc::now());

    let result = active.update(db).await?;
    Ok(result.into())
}

pub async fn delete_relationship_impl(
    db: &DatabaseConnection,
    id: String,
) -> Result<bool, AppError> {
    let result = Relationship::delete_by_id(&id).exec(db).await?;
    Ok(result.rows_affected > 0)
}

// ============ Tauri command wrappers ============

#[tauri::command(rename_all = "snake_case")]
pub async fn create_relationship(
    state: State<'_, AppState>,
    campaign_id: String,
    source_type: String,
    source_id: String,
    target_type: String,
    target_id: String,
    relationship_type: String,
    description: Option<String>,
    is_bidirectional: Option<bool>,
    strength: Option<i32>,
) -> Result<RelationshipResponse, AppError> {
    create_relationship_impl(
        &state.db,
        campaign_id,
        source_type,
        source_id,
        target_type,
        target_id,
        relationship_type,
        description,
        is_bidirectional,
        strength,
    )
    .await
}

#[tauri::command(rename_all = "snake_case")]
pub async fn get_relationship(
    state: State<'_, AppState>,
    id: String,
) -> Result<RelationshipResponse, AppError> {
    get_relationship_impl(&state.db, id).await
}

#[tauri::command(rename_all = "snake_case")]
pub async fn list_relationships(
    state: State<'_, AppState>,
    campaign_id: String,
) -> Result<Vec<RelationshipResponse>, AppError> {
    list_relationships_impl(&state.db, campaign_id).await
}

#[tauri::command(rename_all = "snake_case")]
pub async fn get_entity_relationships(
    state: State<'_, AppState>,
    entity_type: String,
    entity_id: String,
) -> Result<Vec<RelationshipResponse>, AppError> {
    get_entity_relationships_impl(&state.db, entity_type, entity_id).await
}

#[tauri::command(rename_all = "snake_case")]
pub async fn update_relationship(
    state: State<'_, AppState>,
    id: String,
    relationship_type: Option<String>,
    description: Option<String>,
    is_bidirectional: Option<bool>,
    strength: Option<i32>,
    is_public: Option<bool>,
) -> Result<RelationshipResponse, AppError> {
    update_relationship_impl(
        &state.db,
        id,
        relationship_type,
        description,
        is_bidirectional,
        strength,
        is_public,
    )
    .await
}

#[tauri::command(rename_all = "snake_case")]
pub async fn delete_relationship(state: State<'_, AppState>, id: String) -> Result<bool, AppError> {
    delete_relationship_impl(&state.db, id).await
}
