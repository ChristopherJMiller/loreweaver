use crate::db::AppState;
use crate::error::AppError;
use ::entity::quests::{self, Entity as Quest};
use sea_orm::*;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
pub struct QuestResponse {
    pub id: String,
    pub campaign_id: String,
    pub name: String,
    pub status: String,
    pub plot_type: String,
    pub description: Option<String>,
    pub hook: Option<String>,
    pub objectives: Option<String>,
    pub complications: Option<String>,
    pub resolution: Option<String>,
    pub reward: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

impl From<quests::Model> for QuestResponse {
    fn from(model: quests::Model) -> Self {
        Self {
            id: model.id,
            campaign_id: model.campaign_id,
            name: model.name,
            status: model.status,
            plot_type: model.plot_type,
            description: model.description,
            hook: model.hook,
            objectives: model.objectives,
            complications: model.complications,
            resolution: model.resolution,
            reward: model.reward,
            created_at: model.created_at.to_string(),
            updated_at: model.updated_at.to_string(),
        }
    }
}

#[tauri::command]
pub async fn create_quest(
    state: State<'_, AppState>,
    campaign_id: String,
    name: String,
    plot_type: Option<String>,
    description: Option<String>,
    hook: Option<String>,
) -> Result<QuestResponse, AppError> {
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now();

    let model = quests::ActiveModel {
        id: Set(id),
        campaign_id: Set(campaign_id),
        name: Set(name),
        status: Set("planned".to_string()),
        plot_type: Set(plot_type.unwrap_or_else(|| "side".to_string())),
        description: Set(description),
        hook: Set(hook),
        objectives: Set(None),
        complications: Set(None),
        resolution: Set(None),
        reward: Set(None),
        created_at: Set(now),
        updated_at: Set(now),
    };

    let result = model.insert(&state.db).await?;
    Ok(result.into())
}

#[tauri::command]
pub async fn get_quest(
    state: State<'_, AppState>,
    id: String,
) -> Result<QuestResponse, AppError> {
    let quest = Quest::find_by_id(&id)
        .one(&state.db)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Quest {} not found", id)))?;

    Ok(quest.into())
}

#[tauri::command]
pub async fn list_quests(
    state: State<'_, AppState>,
    campaign_id: String,
) -> Result<Vec<QuestResponse>, AppError> {
    let quests = Quest::find()
        .filter(quests::Column::CampaignId.eq(&campaign_id))
        .order_by_asc(quests::Column::Name)
        .all(&state.db)
        .await?;

    Ok(quests.into_iter().map(|q| q.into()).collect())
}

#[tauri::command]
pub async fn update_quest(
    state: State<'_, AppState>,
    id: String,
    name: Option<String>,
    status: Option<String>,
    plot_type: Option<String>,
    description: Option<String>,
    hook: Option<String>,
    objectives: Option<String>,
    complications: Option<String>,
    resolution: Option<String>,
    reward: Option<String>,
) -> Result<QuestResponse, AppError> {
    let quest = Quest::find_by_id(&id)
        .one(&state.db)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Quest {} not found", id)))?;

    let mut active: quests::ActiveModel = quest.into();

    if let Some(n) = name {
        active.name = Set(n);
    }
    if let Some(s) = status {
        active.status = Set(s);
    }
    if let Some(pt) = plot_type {
        active.plot_type = Set(pt);
    }
    if let Some(d) = description {
        active.description = Set(Some(d));
    }
    if let Some(h) = hook {
        active.hook = Set(Some(h));
    }
    if let Some(o) = objectives {
        active.objectives = Set(Some(o));
    }
    if let Some(c) = complications {
        active.complications = Set(Some(c));
    }
    if let Some(r) = resolution {
        active.resolution = Set(Some(r));
    }
    if let Some(rw) = reward {
        active.reward = Set(Some(rw));
    }
    active.updated_at = Set(chrono::Utc::now());

    let result = active.update(&state.db).await?;
    Ok(result.into())
}

#[tauri::command]
pub async fn delete_quest(state: State<'_, AppState>, id: String) -> Result<bool, AppError> {
    let result = Quest::delete_by_id(&id).exec(&state.db).await?;
    Ok(result.rows_affected > 0)
}
