mod common;

use common::{create_test_campaign, create_test_character, create_test_location, setup_test_db};
use loreweaver_lib::commands::relationship::{
    create_relationship_impl, delete_relationship_impl, get_entity_relationships_impl,
    get_relationship_impl, list_relationships_impl, update_relationship_impl,
};

#[tokio::test]
async fn test_create_relationship() {
    let db = setup_test_db()
        .await
        .expect("Failed to setup test database");
    let campaign = create_test_campaign(&db, "Test Campaign")
        .await
        .expect("Failed to create campaign");
    let char1 = create_test_character(&db, &campaign.id, "Alice")
        .await
        .expect("Failed to create character 1");
    let char2 = create_test_character(&db, &campaign.id, "Bob")
        .await
        .expect("Failed to create character 2");

    let relationship = create_relationship_impl(
        &db,
        campaign.id.clone(),
        "character".to_string(),
        char1.id.clone(),
        "character".to_string(),
        char2.id.clone(),
        "friend".to_string(),
        Some("Best friends since childhood".to_string()),
        Some(true),
        Some(5),
    )
    .await
    .expect("Failed to create relationship");

    assert_eq!(relationship.campaign_id, campaign.id);
    assert_eq!(relationship.source_type, "character");
    assert_eq!(relationship.source_id, char1.id);
    assert_eq!(relationship.target_type, "character");
    assert_eq!(relationship.target_id, char2.id);
    assert_eq!(relationship.relationship_type, "friend");
    assert_eq!(
        relationship.description,
        Some("Best friends since childhood".to_string())
    );
    assert!(relationship.is_bidirectional);
    assert_eq!(relationship.strength, Some(5));
}

#[tokio::test]
async fn test_create_relationship_minimal() {
    let db = setup_test_db()
        .await
        .expect("Failed to setup test database");
    let campaign = create_test_campaign(&db, "Test Campaign")
        .await
        .expect("Failed to create campaign");
    let char1 = create_test_character(&db, &campaign.id, "Alice")
        .await
        .expect("Failed to create character 1");
    let char2 = create_test_character(&db, &campaign.id, "Bob")
        .await
        .expect("Failed to create character 2");

    let relationship = create_relationship_impl(
        &db,
        campaign.id.clone(),
        "character".to_string(),
        char1.id.clone(),
        "character".to_string(),
        char2.id.clone(),
        "knows".to_string(),
        None,
        None,
        None,
    )
    .await
    .expect("Failed to create relationship");

    assert_eq!(relationship.relationship_type, "knows");
    assert_eq!(relationship.description, None);
    assert!(!relationship.is_bidirectional);
    assert_eq!(relationship.strength, None);
}

#[tokio::test]
async fn test_create_relationship_between_different_entity_types() {
    let db = setup_test_db()
        .await
        .expect("Failed to setup test database");
    let campaign = create_test_campaign(&db, "Test Campaign")
        .await
        .expect("Failed to create campaign");
    let character = create_test_character(&db, &campaign.id, "Guardian")
        .await
        .expect("Failed to create character");
    let location = create_test_location(&db, &campaign.id, "Castle", None)
        .await
        .expect("Failed to create location");

    let relationship = create_relationship_impl(
        &db,
        campaign.id.clone(),
        "character".to_string(),
        character.id.clone(),
        "location".to_string(),
        location.id.clone(),
        "guards".to_string(),
        Some("Sworn to protect this castle".to_string()),
        None,
        None,
    )
    .await
    .expect("Failed to create relationship");

    assert_eq!(relationship.source_type, "character");
    assert_eq!(relationship.target_type, "location");
    assert_eq!(relationship.relationship_type, "guards");
}

#[tokio::test]
async fn test_get_relationship() {
    let db = setup_test_db()
        .await
        .expect("Failed to setup test database");
    let campaign = create_test_campaign(&db, "Test Campaign")
        .await
        .expect("Failed to create campaign");
    let char1 = create_test_character(&db, &campaign.id, "Alice")
        .await
        .expect("Failed to create character 1");
    let char2 = create_test_character(&db, &campaign.id, "Bob")
        .await
        .expect("Failed to create character 2");

    let created = create_relationship_impl(
        &db,
        campaign.id.clone(),
        "character".to_string(),
        char1.id.clone(),
        "character".to_string(),
        char2.id.clone(),
        "sibling".to_string(),
        None,
        None,
        None,
    )
    .await
    .expect("Failed to create relationship");

    let retrieved = get_relationship_impl(&db, created.id.clone())
        .await
        .expect("Failed to get relationship");

    assert_eq!(retrieved.id, created.id);
    assert_eq!(retrieved.relationship_type, "sibling");
}

#[tokio::test]
async fn test_get_relationship_not_found() {
    let db = setup_test_db()
        .await
        .expect("Failed to setup test database");

    let result = get_relationship_impl(&db, "nonexistent-id".to_string()).await;

    assert!(result.is_err());
    let err = result.unwrap_err();
    assert!(err.to_string().contains("not found"));
}

#[tokio::test]
async fn test_list_relationships_by_campaign() {
    let db = setup_test_db()
        .await
        .expect("Failed to setup test database");

    let campaign1 = create_test_campaign(&db, "Campaign 1")
        .await
        .expect("Failed to create campaign 1");
    let campaign2 = create_test_campaign(&db, "Campaign 2")
        .await
        .expect("Failed to create campaign 2");

    let c1_char1 = create_test_character(&db, &campaign1.id, "C1 Char 1")
        .await
        .expect("Failed to create character");
    let c1_char2 = create_test_character(&db, &campaign1.id, "C1 Char 2")
        .await
        .expect("Failed to create character");
    let c2_char1 = create_test_character(&db, &campaign2.id, "C2 Char 1")
        .await
        .expect("Failed to create character");
    let c2_char2 = create_test_character(&db, &campaign2.id, "C2 Char 2")
        .await
        .expect("Failed to create character");

    // Create relationships in campaign 1
    create_relationship_impl(
        &db,
        campaign1.id.clone(),
        "character".to_string(),
        c1_char1.id.clone(),
        "character".to_string(),
        c1_char2.id.clone(),
        "ally".to_string(),
        None,
        None,
        None,
    )
    .await
    .expect("Failed to create relationship");

    // Create relationship in campaign 2
    create_relationship_impl(
        &db,
        campaign2.id.clone(),
        "character".to_string(),
        c2_char1.id.clone(),
        "character".to_string(),
        c2_char2.id.clone(),
        "enemy".to_string(),
        None,
        None,
        None,
    )
    .await
    .expect("Failed to create relationship");

    let campaign1_rels = list_relationships_impl(&db, campaign1.id.clone())
        .await
        .expect("Failed to list relationships");
    let campaign2_rels = list_relationships_impl(&db, campaign2.id.clone())
        .await
        .expect("Failed to list relationships");

    assert_eq!(campaign1_rels.len(), 1);
    assert_eq!(campaign2_rels.len(), 1);
    assert_eq!(campaign1_rels[0].relationship_type, "ally");
    assert_eq!(campaign2_rels[0].relationship_type, "enemy");
}

#[tokio::test]
async fn test_get_entity_relationships() {
    let db = setup_test_db()
        .await
        .expect("Failed to setup test database");
    let campaign = create_test_campaign(&db, "Test Campaign")
        .await
        .expect("Failed to create campaign");

    let char1 = create_test_character(&db, &campaign.id, "Central Character")
        .await
        .expect("Failed to create character 1");
    let char2 = create_test_character(&db, &campaign.id, "Friend")
        .await
        .expect("Failed to create character 2");
    let char3 = create_test_character(&db, &campaign.id, "Enemy")
        .await
        .expect("Failed to create character 3");
    let location = create_test_location(&db, &campaign.id, "Home", None)
        .await
        .expect("Failed to create location");

    // Create relationships where char1 is the source
    create_relationship_impl(
        &db,
        campaign.id.clone(),
        "character".to_string(),
        char1.id.clone(),
        "character".to_string(),
        char2.id.clone(),
        "friend".to_string(),
        None,
        None,
        None,
    )
    .await
    .expect("Failed to create friendship");

    create_relationship_impl(
        &db,
        campaign.id.clone(),
        "character".to_string(),
        char1.id.clone(),
        "location".to_string(),
        location.id.clone(),
        "lives_at".to_string(),
        None,
        None,
        None,
    )
    .await
    .expect("Failed to create lives_at");

    // Create relationship where char1 is the target
    create_relationship_impl(
        &db,
        campaign.id.clone(),
        "character".to_string(),
        char3.id.clone(),
        "character".to_string(),
        char1.id.clone(),
        "rival".to_string(),
        None,
        None,
        None,
    )
    .await
    .expect("Failed to create rivalry");

    // Get all relationships for char1 (should include both source and target)
    let char1_rels = get_entity_relationships_impl(&db, "character".to_string(), char1.id.clone())
        .await
        .expect("Failed to get entity relationships");

    assert_eq!(char1_rels.len(), 3);
}

#[tokio::test]
async fn test_get_entity_relationships_empty() {
    let db = setup_test_db()
        .await
        .expect("Failed to setup test database");
    let campaign = create_test_campaign(&db, "Test Campaign")
        .await
        .expect("Failed to create campaign");
    let character = create_test_character(&db, &campaign.id, "Lonely Character")
        .await
        .expect("Failed to create character");

    let rels = get_entity_relationships_impl(&db, "character".to_string(), character.id.clone())
        .await
        .expect("Failed to get entity relationships");

    assert!(rels.is_empty());
}

#[tokio::test]
async fn test_update_relationship() {
    let db = setup_test_db()
        .await
        .expect("Failed to setup test database");
    let campaign = create_test_campaign(&db, "Test Campaign")
        .await
        .expect("Failed to create campaign");
    let char1 = create_test_character(&db, &campaign.id, "Alice")
        .await
        .expect("Failed to create character 1");
    let char2 = create_test_character(&db, &campaign.id, "Bob")
        .await
        .expect("Failed to create character 2");

    let created = create_relationship_impl(
        &db,
        campaign.id.clone(),
        "character".to_string(),
        char1.id.clone(),
        "character".to_string(),
        char2.id.clone(),
        "stranger".to_string(),
        None,
        None,
        None,
    )
    .await
    .expect("Failed to create relationship");

    let updated = update_relationship_impl(
        &db,
        created.id.clone(),
        Some("best_friend".to_string()),
        Some("They became close after the adventure".to_string()),
        Some(true),
        Some(10),
        Some(false),
    )
    .await
    .expect("Failed to update relationship");

    assert_eq!(updated.relationship_type, "best_friend");
    assert_eq!(
        updated.description,
        Some("They became close after the adventure".to_string())
    );
    assert!(updated.is_bidirectional);
    assert_eq!(updated.strength, Some(10));
    assert!(!updated.is_public);
}

#[tokio::test]
async fn test_update_relationship_partial() {
    let db = setup_test_db()
        .await
        .expect("Failed to setup test database");
    let campaign = create_test_campaign(&db, "Test Campaign")
        .await
        .expect("Failed to create campaign");
    let char1 = create_test_character(&db, &campaign.id, "Alice")
        .await
        .expect("Failed to create character 1");
    let char2 = create_test_character(&db, &campaign.id, "Bob")
        .await
        .expect("Failed to create character 2");

    let created = create_relationship_impl(
        &db,
        campaign.id.clone(),
        "character".to_string(),
        char1.id.clone(),
        "character".to_string(),
        char2.id.clone(),
        "friend".to_string(),
        Some("Original description".to_string()),
        Some(true),
        Some(5),
    )
    .await
    .expect("Failed to create relationship");

    // Only update strength
    let updated =
        update_relationship_impl(&db, created.id.clone(), None, None, None, Some(10), None)
            .await
            .expect("Failed to update relationship");

    // Strength should be updated
    assert_eq!(updated.strength, Some(10));
    // Other fields should remain unchanged
    assert_eq!(updated.relationship_type, "friend");
    assert_eq!(
        updated.description,
        Some("Original description".to_string())
    );
    assert!(updated.is_bidirectional);
}

#[tokio::test]
async fn test_delete_relationship() {
    let db = setup_test_db()
        .await
        .expect("Failed to setup test database");
    let campaign = create_test_campaign(&db, "Test Campaign")
        .await
        .expect("Failed to create campaign");
    let char1 = create_test_character(&db, &campaign.id, "Alice")
        .await
        .expect("Failed to create character 1");
    let char2 = create_test_character(&db, &campaign.id, "Bob")
        .await
        .expect("Failed to create character 2");

    let created = create_relationship_impl(
        &db,
        campaign.id.clone(),
        "character".to_string(),
        char1.id.clone(),
        "character".to_string(),
        char2.id.clone(),
        "temporary".to_string(),
        None,
        None,
        None,
    )
    .await
    .expect("Failed to create relationship");

    let deleted = delete_relationship_impl(&db, created.id.clone())
        .await
        .expect("Failed to delete relationship");

    assert!(deleted);

    let result = get_relationship_impl(&db, created.id).await;
    assert!(result.is_err());
}

#[tokio::test]
async fn test_delete_relationship_not_found() {
    let db = setup_test_db()
        .await
        .expect("Failed to setup test database");

    let deleted = delete_relationship_impl(&db, "nonexistent-id".to_string())
        .await
        .expect("Delete should not error");

    assert!(!deleted);
}

#[tokio::test]
async fn test_relationship_crud_lifecycle() {
    let db = setup_test_db()
        .await
        .expect("Failed to setup test database");
    let campaign = create_test_campaign(&db, "Test Campaign")
        .await
        .expect("Failed to create campaign");
    let char1 = create_test_character(&db, &campaign.id, "Alice")
        .await
        .expect("Failed to create character 1");
    let char2 = create_test_character(&db, &campaign.id, "Bob")
        .await
        .expect("Failed to create character 2");

    // Create
    let relationship = create_relationship_impl(
        &db,
        campaign.id.clone(),
        "character".to_string(),
        char1.id.clone(),
        "character".to_string(),
        char2.id.clone(),
        "mentor".to_string(),
        Some("Alice teaches Bob".to_string()),
        None,
        Some(8),
    )
    .await
    .expect("Create failed");

    // Read
    let read = get_relationship_impl(&db, relationship.id.clone())
        .await
        .expect("Read failed");
    assert_eq!(read.relationship_type, "mentor");

    // Update
    let updated = update_relationship_impl(
        &db,
        relationship.id.clone(),
        Some("apprentice".to_string()),
        None,
        None,
        None,
        None,
    )
    .await
    .expect("Update failed");
    assert_eq!(updated.relationship_type, "apprentice");

    // List
    let list = list_relationships_impl(&db, campaign.id.clone())
        .await
        .expect("List failed");
    assert_eq!(list.len(), 1);

    // Entity relationships
    let entity_rels = get_entity_relationships_impl(&db, "character".to_string(), char1.id.clone())
        .await
        .expect("Get entity relationships failed");
    assert_eq!(entity_rels.len(), 1);

    // Delete
    let deleted = delete_relationship_impl(&db, relationship.id.clone())
        .await
        .expect("Delete failed");
    assert!(deleted);

    // Verify deleted
    let list_after = list_relationships_impl(&db, campaign.id.clone())
        .await
        .expect("List after delete failed");
    assert!(list_after.is_empty());
}
