mod common;

use common::{create_test_campaign, setup_test_db};
use loreweaver_lib::commands::character::{
    create_character_impl, delete_character_impl, get_character_impl, list_characters_impl,
    update_character_impl,
};
use loreweaver_lib::commands::validation::CreateCharacterInput;

#[tokio::test]
async fn test_create_character() {
    let db = setup_test_db()
        .await
        .expect("Failed to setup test database");
    let campaign = create_test_campaign(&db, "Test Campaign")
        .await
        .expect("Failed to create campaign");

    let input = CreateCharacterInput {
        campaign_id: campaign.id.clone(),
        name: "Gandalf".to_string(),
        lineage: Some("Maiar".to_string()),
        occupation: Some("Wizard".to_string()),
        description: Some("A wise wizard".to_string()),
        personality: None,
        motivations: None,
        secrets: None,
        voice_notes: None,
    };
    let character = create_character_impl(&db, input)
        .await
        .expect("Failed to create character");

    assert_eq!(character.name, "Gandalf");
    assert_eq!(character.campaign_id, campaign.id);
    assert_eq!(character.lineage, Some("Maiar".to_string()));
    assert_eq!(character.occupation, Some("Wizard".to_string()));
    assert!(character.is_alive);
}

#[tokio::test]
async fn test_create_character_minimal() {
    let db = setup_test_db()
        .await
        .expect("Failed to setup test database");
    let campaign = create_test_campaign(&db, "Test Campaign")
        .await
        .expect("Failed to create campaign");

    let input = CreateCharacterInput {
        campaign_id: campaign.id.clone(),
        name: "Simple NPC".to_string(),
        lineage: None,
        occupation: None,
        description: None,
        personality: None,
        motivations: None,
        secrets: None,
        voice_notes: None,
    };
    let character = create_character_impl(&db, input)
        .await
        .expect("Failed to create character");

    assert_eq!(character.name, "Simple NPC");
    assert_eq!(character.lineage, None);
    assert_eq!(character.occupation, None);
    assert!(character.is_alive);
}

#[tokio::test]
async fn test_get_character() {
    let db = setup_test_db()
        .await
        .expect("Failed to setup test database");
    let campaign = create_test_campaign(&db, "Test Campaign")
        .await
        .expect("Failed to create campaign");

    let input = CreateCharacterInput {
        campaign_id: campaign.id.clone(),
        name: "Test Character".to_string(),
        lineage: None,
        occupation: None,
        description: None,
        personality: None,
        motivations: None,
        secrets: None,
        voice_notes: None,
    };
    let created = create_character_impl(&db, input)
        .await
        .expect("Failed to create character");

    let retrieved = get_character_impl(&db, created.id.clone())
        .await
        .expect("Failed to get character");

    assert_eq!(retrieved.id, created.id);
    assert_eq!(retrieved.name, "Test Character");
}

#[tokio::test]
async fn test_get_character_not_found() {
    let db = setup_test_db()
        .await
        .expect("Failed to setup test database");

    let result = get_character_impl(&db, "nonexistent-id".to_string()).await;

    assert!(result.is_err());
    let err = result.unwrap_err();
    assert!(err.to_string().contains("not found"));
}

#[tokio::test]
async fn test_list_characters_by_campaign() {
    let db = setup_test_db()
        .await
        .expect("Failed to setup test database");

    let campaign1 = create_test_campaign(&db, "Campaign 1")
        .await
        .expect("Failed to create campaign 1");
    let campaign2 = create_test_campaign(&db, "Campaign 2")
        .await
        .expect("Failed to create campaign 2");

    // Create characters in campaign 1
    let input1 = CreateCharacterInput {
        campaign_id: campaign1.id.clone(),
        name: "Frodo".to_string(),
        lineage: None,
        occupation: None,
        description: None,
        personality: None,
        motivations: None,
        secrets: None,
        voice_notes: None,
    };
    create_character_impl(&db, input1)
        .await
        .expect("Failed to create Frodo");

    let input2 = CreateCharacterInput {
        campaign_id: campaign1.id.clone(),
        name: "Sam".to_string(),
        lineage: None,
        occupation: None,
        description: None,
        personality: None,
        motivations: None,
        secrets: None,
        voice_notes: None,
    };
    create_character_impl(&db, input2)
        .await
        .expect("Failed to create Sam");

    // Create character in campaign 2
    let input3 = CreateCharacterInput {
        campaign_id: campaign2.id.clone(),
        name: "Aragorn".to_string(),
        lineage: None,
        occupation: None,
        description: None,
        personality: None,
        motivations: None,
        secrets: None,
        voice_notes: None,
    };
    create_character_impl(&db, input3)
        .await
        .expect("Failed to create Aragorn");

    // List should only return characters from the specified campaign
    let campaign1_chars = list_characters_impl(&db, campaign1.id.clone())
        .await
        .expect("Failed to list characters");
    let campaign2_chars = list_characters_impl(&db, campaign2.id.clone())
        .await
        .expect("Failed to list characters");

    assert_eq!(campaign1_chars.len(), 2);
    assert_eq!(campaign2_chars.len(), 1);
    assert_eq!(campaign2_chars[0].name, "Aragorn");
}

#[tokio::test]
async fn test_list_characters_ordered_by_name() {
    let db = setup_test_db()
        .await
        .expect("Failed to setup test database");
    let campaign = create_test_campaign(&db, "Test Campaign")
        .await
        .expect("Failed to create campaign");

    // Create in non-alphabetical order
    for name in ["Zorro", "Alice", "Bob"] {
        let input = CreateCharacterInput {
            campaign_id: campaign.id.clone(),
            name: name.to_string(),
            lineage: None,
            occupation: None,
            description: None,
            personality: None,
            motivations: None,
            secrets: None,
            voice_notes: None,
        };
        create_character_impl(&db, input)
            .await
            .expect(&format!("Failed to create {}", name));
    }

    let characters = list_characters_impl(&db, campaign.id.clone())
        .await
        .expect("Failed to list characters");

    assert_eq!(characters.len(), 3);
    assert_eq!(characters[0].name, "Alice");
    assert_eq!(characters[1].name, "Bob");
    assert_eq!(characters[2].name, "Zorro");
}

#[tokio::test]
async fn test_update_character() {
    let db = setup_test_db()
        .await
        .expect("Failed to setup test database");
    let campaign = create_test_campaign(&db, "Test Campaign")
        .await
        .expect("Failed to create campaign");

    let input = CreateCharacterInput {
        campaign_id: campaign.id.clone(),
        name: "Original Name".to_string(),
        lineage: None,
        occupation: None,
        description: None,
        personality: None,
        motivations: None,
        secrets: None,
        voice_notes: None,
    };
    let created = create_character_impl(&db, input)
        .await
        .expect("Failed to create character");

    let updated = update_character_impl(
        &db,
        created.id.clone(),
        Some("New Name".to_string()),
        Some("Elf".to_string()),
        Some("Ranger".to_string()),
        None,
        Some("Tall and graceful".to_string()),
        Some("Calm and wise".to_string()),
        Some("Protect the forest".to_string()),
        Some("Has a hidden past".to_string()),
        Some("Speaks softly".to_string()),
        Some(r#"{"hp": 45}"#.to_string()),
    )
    .await
    .expect("Failed to update character");

    assert_eq!(updated.name, "New Name");
    assert_eq!(updated.lineage, Some("Elf".to_string()));
    assert_eq!(updated.occupation, Some("Ranger".to_string()));
    assert_eq!(updated.description, Some("Tall and graceful".to_string()));
    assert_eq!(updated.personality, Some("Calm and wise".to_string()));
    assert_eq!(updated.motivations, Some("Protect the forest".to_string()));
    assert_eq!(updated.secrets, Some("Has a hidden past".to_string()));
    assert_eq!(updated.voice_notes, Some("Speaks softly".to_string()));
    assert_eq!(updated.stat_block_json, Some(r#"{"hp": 45}"#.to_string()));
}

#[tokio::test]
async fn test_update_character_is_alive_toggle() {
    let db = setup_test_db()
        .await
        .expect("Failed to setup test database");
    let campaign = create_test_campaign(&db, "Test Campaign")
        .await
        .expect("Failed to create campaign");

    let input = CreateCharacterInput {
        campaign_id: campaign.id.clone(),
        name: "Mortal Character".to_string(),
        lineage: None,
        occupation: None,
        description: None,
        personality: None,
        motivations: None,
        secrets: None,
        voice_notes: None,
    };
    let created = create_character_impl(&db, input)
        .await
        .expect("Failed to create character");

    assert!(created.is_alive);

    // Kill the character
    let updated = update_character_impl(
        &db,
        created.id.clone(),
        None,
        None,
        None,
        Some(false),
        None,
        None,
        None,
        None,
        None,
        None,
    )
    .await
    .expect("Failed to update character");

    assert!(!updated.is_alive);

    // Resurrect the character
    let resurrected = update_character_impl(
        &db,
        created.id.clone(),
        None,
        None,
        None,
        Some(true),
        None,
        None,
        None,
        None,
        None,
        None,
    )
    .await
    .expect("Failed to resurrect character");

    assert!(resurrected.is_alive);
}

#[tokio::test]
async fn test_delete_character() {
    let db = setup_test_db()
        .await
        .expect("Failed to setup test database");
    let campaign = create_test_campaign(&db, "Test Campaign")
        .await
        .expect("Failed to create campaign");

    let input = CreateCharacterInput {
        campaign_id: campaign.id.clone(),
        name: "To Delete".to_string(),
        lineage: None,
        occupation: None,
        description: None,
        personality: None,
        motivations: None,
        secrets: None,
        voice_notes: None,
    };
    let created = create_character_impl(&db, input)
        .await
        .expect("Failed to create character");

    let deleted = delete_character_impl(&db, created.id.clone())
        .await
        .expect("Failed to delete character");

    assert!(deleted);

    // Verify it's actually deleted
    let result = get_character_impl(&db, created.id).await;
    assert!(result.is_err());
}

#[tokio::test]
async fn test_character_crud_lifecycle() {
    let db = setup_test_db()
        .await
        .expect("Failed to setup test database");
    let campaign = create_test_campaign(&db, "Test Campaign")
        .await
        .expect("Failed to create campaign");

    // Create
    let input = CreateCharacterInput {
        campaign_id: campaign.id.clone(),
        name: "Lifecycle Character".to_string(),
        lineage: Some("Dwarf".to_string()),
        occupation: Some("Blacksmith".to_string()),
        description: Some("A stout dwarf".to_string()),
        personality: None,
        motivations: None,
        secrets: None,
        voice_notes: None,
    };
    let character = create_character_impl(&db, input)
        .await
        .expect("Create failed");

    // Read
    let read = get_character_impl(&db, character.id.clone())
        .await
        .expect("Read failed");
    assert_eq!(read.name, "Lifecycle Character");

    // Update
    let updated = update_character_impl(
        &db,
        character.id.clone(),
        Some("Updated Name".to_string()),
        None,
        None,
        None,
        None,
        None,
        None,
        None,
        None,
        None,
    )
    .await
    .expect("Update failed");
    assert_eq!(updated.name, "Updated Name");

    // List
    let list = list_characters_impl(&db, campaign.id.clone())
        .await
        .expect("List failed");
    assert_eq!(list.len(), 1);

    // Delete
    let deleted = delete_character_impl(&db, character.id.clone())
        .await
        .expect("Delete failed");
    assert!(deleted);

    // Verify deleted
    let list_after = list_characters_impl(&db, campaign.id.clone())
        .await
        .expect("List after delete failed");
    assert!(list_after.is_empty());
}

#[tokio::test]
async fn test_create_character_validation_empty_name() {
    let db = setup_test_db()
        .await
        .expect("Failed to setup test database");
    let campaign = create_test_campaign(&db, "Test Campaign")
        .await
        .expect("Failed to create campaign");

    let input = CreateCharacterInput {
        campaign_id: campaign.id.clone(),
        name: "".to_string(), // Empty name should fail validation
        lineage: None,
        occupation: None,
        description: None,
        personality: None,
        motivations: None,
        secrets: None,
        voice_notes: None,
    };
    let result = create_character_impl(&db, input).await;

    assert!(result.is_err());
    let err = result.unwrap_err();
    assert!(err.to_string().contains("Validation"));
}
