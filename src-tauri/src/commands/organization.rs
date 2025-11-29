use crate::commands::validation::CreateOrganizationInput;
use crate::db::AppState;
use crate::error::AppError;
use ::entity::organizations::{self, Entity as Organization};
use sea_orm::*;
use serde::{Deserialize, Serialize};
use tauri::State;
use validator::Validate;

#[derive(Debug, Serialize, Deserialize)]
pub struct OrganizationResponse {
    pub id: String,
    pub campaign_id: String,
    pub name: String,
    pub org_type: String,
    pub description: Option<String>,
    pub goals: Option<String>,
    pub resources: Option<String>,
    pub reputation: Option<String>,
    pub secrets: Option<String>,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

impl From<organizations::Model> for OrganizationResponse {
    fn from(model: organizations::Model) -> Self {
        Self {
            id: model.id,
            campaign_id: model.campaign_id,
            name: model.name,
            org_type: model.org_type,
            description: model.description,
            goals: model.goals,
            resources: model.resources,
            reputation: model.reputation,
            secrets: model.secrets,
            is_active: model.is_active,
            created_at: model.created_at.to_string(),
            updated_at: model.updated_at.to_string(),
        }
    }
}

pub async fn create_organization_impl(
    db: &DatabaseConnection,
    input: CreateOrganizationInput,
) -> Result<OrganizationResponse, AppError> {
    // Validate input
    input.validate()?;

    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now();

    let model = organizations::ActiveModel {
        id: Set(id),
        campaign_id: Set(input.campaign_id),
        name: Set(input.name),
        org_type: Set(input.org_type),
        description: Set(input.description),
        goals: Set(input.goals),
        resources: Set(input.resources),
        reputation: Set(None),
        secrets: Set(None),
        is_active: Set(true),
        created_at: Set(now),
        updated_at: Set(now),
    };

    let result = model.insert(db).await?;
    Ok(result.into())
}

#[tauri::command(rename_all = "snake_case")]
pub async fn create_organization(
    state: State<'_, AppState>,
    campaign_id: String,
    name: String,
    org_type: Option<String>,
    description: Option<String>,
    goals: Option<String>,
    resources: Option<String>,
) -> Result<OrganizationResponse, AppError> {
    let input = CreateOrganizationInput {
        campaign_id,
        name,
        org_type: org_type.unwrap_or_else(|| "other".to_string()),
        description,
        goals,
        resources,
    };
    create_organization_impl(&state.db, input).await
}

#[tauri::command(rename_all = "snake_case")]
pub async fn get_organization(
    state: State<'_, AppState>,
    id: String,
) -> Result<OrganizationResponse, AppError> {
    let org = Organization::find_by_id(&id)
        .one(&state.db)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Organization {} not found", id)))?;

    Ok(org.into())
}

#[tauri::command(rename_all = "snake_case")]
pub async fn list_organizations(
    state: State<'_, AppState>,
    campaign_id: String,
) -> Result<Vec<OrganizationResponse>, AppError> {
    let orgs = Organization::find()
        .filter(organizations::Column::CampaignId.eq(&campaign_id))
        .order_by_asc(organizations::Column::Name)
        .all(&state.db)
        .await?;

    Ok(orgs.into_iter().map(|o| o.into()).collect())
}

#[tauri::command(rename_all = "snake_case")]
pub async fn update_organization(
    state: State<'_, AppState>,
    id: String,
    name: Option<String>,
    org_type: Option<String>,
    description: Option<String>,
    goals: Option<String>,
    resources: Option<String>,
    reputation: Option<String>,
    secrets: Option<String>,
    is_active: Option<bool>,
) -> Result<OrganizationResponse, AppError> {
    let org = Organization::find_by_id(&id)
        .one(&state.db)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Organization {} not found", id)))?;

    let mut active: organizations::ActiveModel = org.into();

    if let Some(n) = name {
        active.name = Set(n);
    }
    if let Some(ot) = org_type {
        active.org_type = Set(ot);
    }
    if let Some(d) = description {
        active.description = Set(Some(d));
    }
    if let Some(g) = goals {
        active.goals = Set(Some(g));
    }
    if let Some(r) = resources {
        active.resources = Set(Some(r));
    }
    if let Some(rep) = reputation {
        active.reputation = Set(Some(rep));
    }
    if let Some(s) = secrets {
        active.secrets = Set(Some(s));
    }
    if let Some(a) = is_active {
        active.is_active = Set(a);
    }
    active.updated_at = Set(chrono::Utc::now());

    let result = active.update(&state.db).await?;
    Ok(result.into())
}

#[tauri::command(rename_all = "snake_case")]
pub async fn delete_organization(state: State<'_, AppState>, id: String) -> Result<bool, AppError> {
    let result = Organization::delete_by_id(&id).exec(&state.db).await?;
    Ok(result.rows_affected > 0)
}
