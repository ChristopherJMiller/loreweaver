use entity::{campaigns, characters, locations, tags};
use sea_orm::{ActiveModelTrait, DatabaseConnection, DbErr, Set};

/// Creates a test campaign with sensible defaults
pub async fn create_test_campaign(
    db: &DatabaseConnection,
    name: &str,
) -> Result<campaigns::Model, DbErr> {
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now();

    let model = campaigns::ActiveModel {
        id: Set(id),
        name: Set(name.to_string()),
        description: Set(Some("Test campaign".to_string())),
        system: Set(Some("D&D 5e".to_string())),
        settings_json: Set(None),
        created_at: Set(now),
        updated_at: Set(now),
    };

    model.insert(db).await
}

/// Creates a test character linked to a campaign
pub async fn create_test_character(
    db: &DatabaseConnection,
    campaign_id: &str,
    name: &str,
) -> Result<characters::Model, DbErr> {
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now();

    let model = characters::ActiveModel {
        id: Set(id),
        campaign_id: Set(campaign_id.to_string()),
        name: Set(name.to_string()),
        lineage: Set(Some("Human".to_string())),
        occupation: Set(Some("Adventurer".to_string())),
        is_alive: Set(true),
        description: Set(Some("A test character".to_string())),
        personality: Set(None),
        motivations: Set(None),
        secrets: Set(None),
        voice_notes: Set(None),
        stat_block_json: Set(None),
        created_at: Set(now),
        updated_at: Set(now),
    };

    model.insert(db).await
}

/// Creates a test location with optional parent
pub async fn create_test_location(
    db: &DatabaseConnection,
    campaign_id: &str,
    name: &str,
    parent_id: Option<&str>,
) -> Result<locations::Model, DbErr> {
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now();

    let model = locations::ActiveModel {
        id: Set(id),
        campaign_id: Set(campaign_id.to_string()),
        parent_id: Set(parent_id.map(|s| s.to_string())),
        name: Set(name.to_string()),
        location_type: Set("settlement".to_string()),
        description: Set(Some("A test location".to_string())),
        detail_level: Set(0),
        gm_notes: Set(None),
        created_at: Set(now),
        updated_at: Set(now),
    };

    model.insert(db).await
}

/// Creates a test tag
pub async fn create_test_tag(
    db: &DatabaseConnection,
    campaign_id: &str,
    name: &str,
) -> Result<tags::Model, DbErr> {
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now();

    let model = tags::ActiveModel {
        id: Set(id),
        campaign_id: Set(campaign_id.to_string()),
        name: Set(name.to_string()),
        color: Set(Some("#FF5733".to_string())),
        created_at: Set(now),
    };

    model.insert(db).await
}
