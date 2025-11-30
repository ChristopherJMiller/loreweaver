use crate::db::AppState;
use crate::error::AppError;
use ::entity::ai_conversations::{self, Entity as AiConversation};
use ::entity::ai_messages::{self, Entity as AiMessage};
use sea_orm::*;
use serde::{Deserialize, Serialize};
use tauri::State;

// ============ Response Types ============

#[derive(Debug, Serialize, Deserialize)]
pub struct AiConversationResponse {
    pub id: String,
    pub campaign_id: String,
    pub context_type: String,
    pub total_input_tokens: i32,
    pub total_output_tokens: i32,
    pub total_cache_read_tokens: i32,
    pub total_cache_creation_tokens: i32,
    pub created_at: String,
    pub updated_at: String,
}

impl From<ai_conversations::Model> for AiConversationResponse {
    fn from(model: ai_conversations::Model) -> Self {
        Self {
            id: model.id,
            campaign_id: model.campaign_id,
            context_type: model.context_type,
            total_input_tokens: model.total_input_tokens,
            total_output_tokens: model.total_output_tokens,
            total_cache_read_tokens: model.total_cache_read_tokens,
            total_cache_creation_tokens: model.total_cache_creation_tokens,
            created_at: model.created_at.to_string(),
            updated_at: model.updated_at.to_string(),
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AiMessageResponse {
    pub id: String,
    pub conversation_id: String,
    pub role: String,
    pub content: String,
    pub tool_name: Option<String>,
    pub tool_input_json: Option<String>,
    pub tool_data_json: Option<String>,
    pub proposal_json: Option<String>,
    pub message_order: i32,
    pub created_at: String,
}

impl From<ai_messages::Model> for AiMessageResponse {
    fn from(model: ai_messages::Model) -> Self {
        Self {
            id: model.id,
            conversation_id: model.conversation_id,
            role: model.role,
            content: model.content,
            tool_name: model.tool_name,
            tool_input_json: model.tool_input_json,
            tool_data_json: model.tool_data_json,
            proposal_json: model.proposal_json,
            message_order: model.message_order,
            created_at: model.created_at.to_string(),
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ConversationWithMessages {
    pub conversation: AiConversationResponse,
    pub messages: Vec<AiMessageResponse>,
}

// ============ Core Implementation Functions ============

pub async fn get_or_create_conversation_impl(
    db: &DatabaseConnection,
    campaign_id: String,
    context_type: String,
) -> Result<AiConversationResponse, AppError> {
    // Try to find existing conversation
    let existing = AiConversation::find()
        .filter(ai_conversations::Column::CampaignId.eq(&campaign_id))
        .filter(ai_conversations::Column::ContextType.eq(&context_type))
        .one(db)
        .await?;

    if let Some(conversation) = existing {
        return Ok(conversation.into());
    }

    // Create new conversation
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now();

    let model = ai_conversations::ActiveModel {
        id: Set(id),
        campaign_id: Set(campaign_id),
        context_type: Set(context_type),
        total_input_tokens: Set(0),
        total_output_tokens: Set(0),
        total_cache_read_tokens: Set(0),
        total_cache_creation_tokens: Set(0),
        created_at: Set(now),
        updated_at: Set(now),
    };

    let result = model.insert(db).await?;
    Ok(result.into())
}

pub async fn load_conversation_impl(
    db: &DatabaseConnection,
    campaign_id: String,
    context_type: String,
) -> Result<Option<ConversationWithMessages>, AppError> {
    let conversation = AiConversation::find()
        .filter(ai_conversations::Column::CampaignId.eq(&campaign_id))
        .filter(ai_conversations::Column::ContextType.eq(&context_type))
        .one(db)
        .await?;

    match conversation {
        Some(conv) => {
            let messages = AiMessage::find()
                .filter(ai_messages::Column::ConversationId.eq(&conv.id))
                .order_by_asc(ai_messages::Column::MessageOrder)
                .all(db)
                .await?;

            Ok(Some(ConversationWithMessages {
                conversation: conv.into(),
                messages: messages.into_iter().map(|m| m.into()).collect(),
            }))
        }
        None => Ok(None),
    }
}

#[allow(clippy::too_many_arguments)]
pub async fn add_message_impl(
    db: &DatabaseConnection,
    conversation_id: String,
    role: String,
    content: String,
    tool_name: Option<String>,
    tool_input_json: Option<String>,
    tool_data_json: Option<String>,
    proposal_json: Option<String>,
) -> Result<AiMessageResponse, AppError> {
    // Get next message order by counting existing messages
    let message_count = AiMessage::find()
        .filter(ai_messages::Column::ConversationId.eq(&conversation_id))
        .count(db)
        .await?;

    let next_order = (message_count as i32) + 1;

    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now();

    let model = ai_messages::ActiveModel {
        id: Set(id),
        conversation_id: Set(conversation_id),
        role: Set(role),
        content: Set(content),
        tool_name: Set(tool_name),
        tool_input_json: Set(tool_input_json),
        tool_data_json: Set(tool_data_json),
        proposal_json: Set(proposal_json),
        message_order: Set(next_order),
        created_at: Set(now),
    };

    let result = model.insert(db).await?;
    Ok(result.into())
}

pub async fn update_token_counts_impl(
    db: &DatabaseConnection,
    conversation_id: String,
    input_tokens: i32,
    output_tokens: i32,
    cache_read_tokens: i32,
    cache_creation_tokens: i32,
) -> Result<AiConversationResponse, AppError> {
    let conversation = AiConversation::find_by_id(&conversation_id)
        .one(db)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Conversation {} not found", conversation_id)))?;

    let new_input = conversation.total_input_tokens + input_tokens;
    let new_output = conversation.total_output_tokens + output_tokens;
    let new_cache_read = conversation.total_cache_read_tokens + cache_read_tokens;
    let new_cache_creation = conversation.total_cache_creation_tokens + cache_creation_tokens;

    let mut active: ai_conversations::ActiveModel = conversation.into();
    active.total_input_tokens = Set(new_input);
    active.total_output_tokens = Set(new_output);
    active.total_cache_read_tokens = Set(new_cache_read);
    active.total_cache_creation_tokens = Set(new_cache_creation);
    active.updated_at = Set(chrono::Utc::now());

    let result = active.update(db).await?;
    Ok(result.into())
}

pub async fn clear_conversation_impl(
    db: &DatabaseConnection,
    conversation_id: String,
) -> Result<bool, AppError> {
    // Delete all messages
    let result = AiMessage::delete_many()
        .filter(ai_messages::Column::ConversationId.eq(&conversation_id))
        .exec(db)
        .await?;

    // Reset token counts
    let conversation = AiConversation::find_by_id(&conversation_id)
        .one(db)
        .await?;

    if let Some(conv) = conversation {
        let mut active: ai_conversations::ActiveModel = conv.into();
        active.total_input_tokens = Set(0);
        active.total_output_tokens = Set(0);
        active.total_cache_read_tokens = Set(0);
        active.total_cache_creation_tokens = Set(0);
        active.updated_at = Set(chrono::Utc::now());
        active.update(db).await?;
    }

    Ok(result.rows_affected > 0)
}

// ============ Tauri Command Wrappers ============

#[tauri::command(rename_all = "snake_case")]
pub async fn get_or_create_ai_conversation(
    state: State<'_, AppState>,
    campaign_id: String,
    context_type: String,
) -> Result<AiConversationResponse, AppError> {
    get_or_create_conversation_impl(&state.db, campaign_id, context_type).await
}

#[tauri::command(rename_all = "snake_case")]
pub async fn load_ai_conversation(
    state: State<'_, AppState>,
    campaign_id: String,
    context_type: String,
) -> Result<Option<ConversationWithMessages>, AppError> {
    load_conversation_impl(&state.db, campaign_id, context_type).await
}

#[tauri::command(rename_all = "snake_case")]
pub async fn add_ai_message(
    state: State<'_, AppState>,
    conversation_id: String,
    role: String,
    content: String,
    tool_name: Option<String>,
    tool_input_json: Option<String>,
    tool_data_json: Option<String>,
    proposal_json: Option<String>,
) -> Result<AiMessageResponse, AppError> {
    add_message_impl(
        &state.db,
        conversation_id,
        role,
        content,
        tool_name,
        tool_input_json,
        tool_data_json,
        proposal_json,
    )
    .await
}

#[tauri::command(rename_all = "snake_case")]
pub async fn update_ai_token_counts(
    state: State<'_, AppState>,
    conversation_id: String,
    input_tokens: i32,
    output_tokens: i32,
    cache_read_tokens: i32,
    cache_creation_tokens: i32,
) -> Result<AiConversationResponse, AppError> {
    update_token_counts_impl(
        &state.db,
        conversation_id,
        input_tokens,
        output_tokens,
        cache_read_tokens,
        cache_creation_tokens,
    )
    .await
}

#[tauri::command(rename_all = "snake_case")]
pub async fn clear_ai_conversation(
    state: State<'_, AppState>,
    conversation_id: String,
) -> Result<bool, AppError> {
    clear_conversation_impl(&state.db, conversation_id).await
}

// ============ Tests ============

#[cfg(test)]
mod tests {
    use super::*;
    use migration::{Migrator, MigratorTrait};
    use sea_orm::Database;

    async fn setup_test_db() -> DatabaseConnection {
        let db = Database::connect("sqlite::memory:")
            .await
            .expect("Failed to create in-memory database");
        Migrator::up(&db, None)
            .await
            .expect("Failed to run migrations");
        db
    }

    async fn create_test_campaign(db: &DatabaseConnection) -> String {
        use ::entity::campaigns;
        use sea_orm::*;

        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now();
        let campaign = campaigns::ActiveModel {
            id: Set(id.clone()),
            name: Set("Test Campaign".to_string()),
            settings_json: Set(None),
            system: Set(None),
            description: Set(None),
            created_at: Set(now),
            updated_at: Set(now),
        };
        campaign.insert(db).await.expect("Failed to create campaign");
        id
    }

    #[tokio::test]
    async fn test_get_or_create_conversation_creates_new() {
        let db = setup_test_db().await;
        let campaign_id = create_test_campaign(&db).await;

        let result = get_or_create_conversation_impl(
            &db,
            campaign_id.clone(),
            "sidebar".to_string(),
        )
        .await;

        assert!(result.is_ok());
        let conversation = result.unwrap();
        assert_eq!(conversation.campaign_id, campaign_id);
        assert_eq!(conversation.context_type, "sidebar");
        assert_eq!(conversation.total_input_tokens, 0);
        assert_eq!(conversation.total_output_tokens, 0);
        assert_eq!(conversation.total_cache_read_tokens, 0);
        assert_eq!(conversation.total_cache_creation_tokens, 0);
    }

    #[tokio::test]
    async fn test_get_or_create_conversation_retrieves_existing() {
        let db = setup_test_db().await;
        let campaign_id = create_test_campaign(&db).await;

        // Create first conversation
        let first = get_or_create_conversation_impl(
            &db,
            campaign_id.clone(),
            "sidebar".to_string(),
        )
        .await
        .unwrap();

        // Second call should return same conversation
        let second = get_or_create_conversation_impl(
            &db,
            campaign_id.clone(),
            "sidebar".to_string(),
        )
        .await
        .unwrap();

        assert_eq!(first.id, second.id);
        assert_eq!(first.created_at, second.created_at);
    }

    #[tokio::test]
    async fn test_get_or_create_conversation_different_contexts() {
        let db = setup_test_db().await;
        let campaign_id = create_test_campaign(&db).await;

        let sidebar = get_or_create_conversation_impl(
            &db,
            campaign_id.clone(),
            "sidebar".to_string(),
        )
        .await
        .unwrap();

        let fullpage = get_or_create_conversation_impl(
            &db,
            campaign_id.clone(),
            "fullpage".to_string(),
        )
        .await
        .unwrap();

        // Different context types should create different conversations
        assert_ne!(sidebar.id, fullpage.id);
        assert_eq!(sidebar.context_type, "sidebar");
        assert_eq!(fullpage.context_type, "fullpage");
    }

    #[tokio::test]
    async fn test_load_conversation_returns_none_for_missing() {
        let db = setup_test_db().await;
        let campaign_id = create_test_campaign(&db).await;

        let result = load_conversation_impl(
            &db,
            campaign_id,
            "nonexistent".to_string(),
        )
        .await;

        assert!(result.is_ok());
        assert!(result.unwrap().is_none());
    }

    #[tokio::test]
    async fn test_load_conversation_with_messages() {
        let db = setup_test_db().await;
        let campaign_id = create_test_campaign(&db).await;

        // Create conversation and messages
        let conversation = get_or_create_conversation_impl(
            &db,
            campaign_id.clone(),
            "sidebar".to_string(),
        )
        .await
        .unwrap();

        // Add messages in specific order
        add_message_impl(
            &db,
            conversation.id.clone(),
            "user".to_string(),
            "First message".to_string(),
            None,
            None,
            None,
            None,
        )
        .await
        .unwrap();

        add_message_impl(
            &db,
            conversation.id.clone(),
            "assistant".to_string(),
            "Second message".to_string(),
            None,
            None,
            None,
            None,
        )
        .await
        .unwrap();

        // Load conversation
        let result = load_conversation_impl(
            &db,
            campaign_id,
            "sidebar".to_string(),
        )
        .await
        .unwrap()
        .expect("Conversation should exist");

        assert_eq!(result.messages.len(), 2);
        assert_eq!(result.messages[0].content, "First message");
        assert_eq!(result.messages[0].role, "user");
        assert_eq!(result.messages[0].message_order, 1);
        assert_eq!(result.messages[1].content, "Second message");
        assert_eq!(result.messages[1].role, "assistant");
        assert_eq!(result.messages[1].message_order, 2);
    }

    #[tokio::test]
    async fn test_add_message_auto_increments_order() {
        let db = setup_test_db().await;
        let campaign_id = create_test_campaign(&db).await;

        let conversation = get_or_create_conversation_impl(
            &db,
            campaign_id,
            "sidebar".to_string(),
        )
        .await
        .unwrap();

        // Add multiple messages
        let msg1 = add_message_impl(
            &db,
            conversation.id.clone(),
            "user".to_string(),
            "Message 1".to_string(),
            None,
            None,
            None,
            None,
        )
        .await
        .unwrap();

        let msg2 = add_message_impl(
            &db,
            conversation.id.clone(),
            "assistant".to_string(),
            "Message 2".to_string(),
            None,
            None,
            None,
            None,
        )
        .await
        .unwrap();

        let msg3 = add_message_impl(
            &db,
            conversation.id.clone(),
            "user".to_string(),
            "Message 3".to_string(),
            None,
            None,
            None,
            None,
        )
        .await
        .unwrap();

        assert_eq!(msg1.message_order, 1);
        assert_eq!(msg2.message_order, 2);
        assert_eq!(msg3.message_order, 3);
    }

    #[tokio::test]
    async fn test_add_message_with_tool_data() {
        let db = setup_test_db().await;
        let campaign_id = create_test_campaign(&db).await;

        let conversation = get_or_create_conversation_impl(
            &db,
            campaign_id,
            "sidebar".to_string(),
        )
        .await
        .unwrap();

        let message = add_message_impl(
            &db,
            conversation.id,
            "tool".to_string(),
            "Tool result".to_string(),
            Some("get_entity".to_string()),
            Some(r#"{"entity_id": "123"}"#.to_string()),
            Some(r#"{"name": "Test Entity"}"#.to_string()),
            None,
        )
        .await
        .unwrap();

        assert_eq!(message.role, "tool");
        assert_eq!(message.tool_name, Some("get_entity".to_string()));
        assert_eq!(message.tool_input_json, Some(r#"{"entity_id": "123"}"#.to_string()));
        assert_eq!(message.tool_data_json, Some(r#"{"name": "Test Entity"}"#.to_string()));
        assert_eq!(message.proposal_json, None);
    }

    #[tokio::test]
    async fn test_add_message_with_proposal() {
        let db = setup_test_db().await;
        let campaign_id = create_test_campaign(&db).await;

        let conversation = get_or_create_conversation_impl(
            &db,
            campaign_id,
            "sidebar".to_string(),
        )
        .await
        .unwrap();

        let proposal_json = r#"{"id": "prop1", "operation": "create", "status": "pending"}"#;
        let message = add_message_impl(
            &db,
            conversation.id,
            "proposal".to_string(),
            "Create character proposal".to_string(),
            None,
            None,
            None,
            Some(proposal_json.to_string()),
        )
        .await
        .unwrap();

        assert_eq!(message.role, "proposal");
        assert_eq!(message.proposal_json, Some(proposal_json.to_string()));
        assert!(message.tool_name.is_none());
    }

    #[tokio::test]
    async fn test_update_token_counts_accumulates() {
        let db = setup_test_db().await;
        let campaign_id = create_test_campaign(&db).await;

        let conversation = get_or_create_conversation_impl(
            &db,
            campaign_id,
            "sidebar".to_string(),
        )
        .await
        .unwrap();

        // First update
        let result1 = update_token_counts_impl(
            &db,
            conversation.id.clone(),
            100,
            50,
            25,
            10,
        )
        .await
        .unwrap();

        assert_eq!(result1.total_input_tokens, 100);
        assert_eq!(result1.total_output_tokens, 50);
        assert_eq!(result1.total_cache_read_tokens, 25);
        assert_eq!(result1.total_cache_creation_tokens, 10);

        // Second update should accumulate
        let result2 = update_token_counts_impl(
            &db,
            conversation.id.clone(),
            200,
            100,
            50,
            20,
        )
        .await
        .unwrap();

        assert_eq!(result2.total_input_tokens, 300);
        assert_eq!(result2.total_output_tokens, 150);
        assert_eq!(result2.total_cache_read_tokens, 75);
        assert_eq!(result2.total_cache_creation_tokens, 30);
    }

    #[tokio::test]
    async fn test_update_token_counts_nonexistent_conversation() {
        let db = setup_test_db().await;

        let result = update_token_counts_impl(
            &db,
            "nonexistent-id".to_string(),
            100,
            50,
            25,
            10,
        )
        .await;

        assert!(result.is_err());
        match result {
            Err(AppError::NotFound(_)) => (),
            _ => panic!("Expected NotFound error"),
        }
    }

    #[tokio::test]
    async fn test_clear_conversation_deletes_messages() {
        let db = setup_test_db().await;
        let campaign_id = create_test_campaign(&db).await;

        let conversation = get_or_create_conversation_impl(
            &db,
            campaign_id.clone(),
            "sidebar".to_string(),
        )
        .await
        .unwrap();

        // Add messages
        for i in 1..=5 {
            add_message_impl(
                &db,
                conversation.id.clone(),
                "user".to_string(),
                format!("Message {}", i),
                None,
                None,
                None,
                None,
            )
            .await
            .unwrap();
        }

        // Clear conversation
        let result = clear_conversation_impl(&db, conversation.id.clone()).await;
        assert!(result.is_ok());
        assert!(result.unwrap());

        // Verify messages are deleted
        let loaded = load_conversation_impl(
            &db,
            campaign_id,
            "sidebar".to_string(),
        )
        .await
        .unwrap()
        .expect("Conversation should still exist");

        assert_eq!(loaded.messages.len(), 0);
    }

    #[tokio::test]
    async fn test_clear_conversation_resets_tokens() {
        let db = setup_test_db().await;
        let campaign_id = create_test_campaign(&db).await;

        let conversation = get_or_create_conversation_impl(
            &db,
            campaign_id.clone(),
            "sidebar".to_string(),
        )
        .await
        .unwrap();

        // Update token counts
        update_token_counts_impl(
            &db,
            conversation.id.clone(),
            1000,
            500,
            250,
            100,
        )
        .await
        .unwrap();

        // Clear conversation
        clear_conversation_impl(&db, conversation.id.clone())
            .await
            .unwrap();

        // Verify tokens are reset
        let loaded = load_conversation_impl(
            &db,
            campaign_id,
            "sidebar".to_string(),
        )
        .await
        .unwrap()
        .expect("Conversation should exist");

        assert_eq!(loaded.conversation.total_input_tokens, 0);
        assert_eq!(loaded.conversation.total_output_tokens, 0);
        assert_eq!(loaded.conversation.total_cache_read_tokens, 0);
        assert_eq!(loaded.conversation.total_cache_creation_tokens, 0);
    }

    #[tokio::test]
    async fn test_clear_conversation_nonexistent() {
        let db = setup_test_db().await;

        let result = clear_conversation_impl(&db, "nonexistent-id".to_string()).await;

        // Should succeed but return false (no rows affected)
        assert!(result.is_ok());
        assert!(!result.unwrap());
    }
}
