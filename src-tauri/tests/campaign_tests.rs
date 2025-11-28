mod common;

use common::setup_test_db;
use loreweaver_lib::commands::campaign::{
    create_campaign_impl, delete_campaign_impl, get_campaign_impl, list_campaigns_impl,
    update_campaign_impl,
};

#[tokio::test]
async fn test_create_campaign() {
    let db = setup_test_db().await.expect("Failed to setup test database");

    let campaign = create_campaign_impl(
        &db,
        "Dragon's Lair".to_string(),
        Some("A campaign about dragons".to_string()),
        Some("D&D 5e".to_string()),
    )
    .await
    .expect("Failed to create campaign");

    assert_eq!(campaign.name, "Dragon's Lair");
    assert_eq!(campaign.description, Some("A campaign about dragons".to_string()));
    assert_eq!(campaign.system, Some("D&D 5e".to_string()));
    assert!(!campaign.id.is_empty());
}

#[tokio::test]
async fn test_create_campaign_minimal() {
    let db = setup_test_db().await.expect("Failed to setup test database");

    let campaign = create_campaign_impl(&db, "Minimal Campaign".to_string(), None, None)
        .await
        .expect("Failed to create campaign");

    assert_eq!(campaign.name, "Minimal Campaign");
    assert_eq!(campaign.description, None);
    assert_eq!(campaign.system, None);
}

#[tokio::test]
async fn test_get_campaign() {
    let db = setup_test_db().await.expect("Failed to setup test database");

    let created = create_campaign_impl(&db, "Test Campaign".to_string(), None, None)
        .await
        .expect("Failed to create campaign");

    let retrieved = get_campaign_impl(&db, created.id.clone())
        .await
        .expect("Failed to get campaign");

    assert_eq!(retrieved.id, created.id);
    assert_eq!(retrieved.name, "Test Campaign");
}

#[tokio::test]
async fn test_get_campaign_not_found() {
    let db = setup_test_db().await.expect("Failed to setup test database");

    let result = get_campaign_impl(&db, "nonexistent-id".to_string()).await;

    assert!(result.is_err());
    let err = result.unwrap_err();
    assert!(err.to_string().contains("not found"));
}

#[tokio::test]
async fn test_list_campaigns_empty() {
    let db = setup_test_db().await.expect("Failed to setup test database");

    let campaigns = list_campaigns_impl(&db)
        .await
        .expect("Failed to list campaigns");

    assert!(campaigns.is_empty());
}

#[tokio::test]
async fn test_list_campaigns_ordered_by_updated_at() {
    let db = setup_test_db().await.expect("Failed to setup test database");

    // Create campaigns in order
    let first = create_campaign_impl(&db, "First".to_string(), None, None)
        .await
        .expect("Failed to create first campaign");

    let second = create_campaign_impl(&db, "Second".to_string(), None, None)
        .await
        .expect("Failed to create second campaign");

    // Update first campaign so it becomes more recently updated
    update_campaign_impl(
        &db,
        first.id.clone(),
        Some("First Updated".to_string()),
        None,
        None,
        None,
    )
    .await
    .expect("Failed to update campaign");

    let campaigns = list_campaigns_impl(&db)
        .await
        .expect("Failed to list campaigns");

    assert_eq!(campaigns.len(), 2);
    // Most recently updated should be first (first was updated after second was created)
    assert_eq!(campaigns[0].name, "First Updated");
    assert_eq!(campaigns[1].name, "Second");
}

#[tokio::test]
async fn test_update_campaign() {
    let db = setup_test_db().await.expect("Failed to setup test database");

    let created = create_campaign_impl(&db, "Original".to_string(), None, None)
        .await
        .expect("Failed to create campaign");

    let updated = update_campaign_impl(
        &db,
        created.id.clone(),
        Some("Updated Name".to_string()),
        Some("New description".to_string()),
        Some("Pathfinder 2e".to_string()),
        Some(r#"{"theme": "dark"}"#.to_string()),
    )
    .await
    .expect("Failed to update campaign");

    assert_eq!(updated.id, created.id);
    assert_eq!(updated.name, "Updated Name");
    assert_eq!(updated.description, Some("New description".to_string()));
    assert_eq!(updated.system, Some("Pathfinder 2e".to_string()));
    assert_eq!(updated.settings_json, Some(r#"{"theme": "dark"}"#.to_string()));
}

#[tokio::test]
async fn test_update_campaign_partial() {
    let db = setup_test_db().await.expect("Failed to setup test database");

    let created = create_campaign_impl(
        &db,
        "Original".to_string(),
        Some("Original desc".to_string()),
        Some("D&D 5e".to_string()),
    )
    .await
    .expect("Failed to create campaign");

    // Only update name, leave other fields unchanged
    let updated = update_campaign_impl(
        &db,
        created.id.clone(),
        Some("New Name".to_string()),
        None,
        None,
        None,
    )
    .await
    .expect("Failed to update campaign");

    assert_eq!(updated.name, "New Name");
    // Original values should be preserved
    assert_eq!(updated.description, Some("Original desc".to_string()));
    assert_eq!(updated.system, Some("D&D 5e".to_string()));
}

#[tokio::test]
async fn test_update_campaign_not_found() {
    let db = setup_test_db().await.expect("Failed to setup test database");

    let result = update_campaign_impl(
        &db,
        "nonexistent-id".to_string(),
        Some("Name".to_string()),
        None,
        None,
        None,
    )
    .await;

    assert!(result.is_err());
}

#[tokio::test]
async fn test_delete_campaign() {
    let db = setup_test_db().await.expect("Failed to setup test database");

    let created = create_campaign_impl(&db, "To Delete".to_string(), None, None)
        .await
        .expect("Failed to create campaign");

    let deleted = delete_campaign_impl(&db, created.id.clone())
        .await
        .expect("Failed to delete campaign");

    assert!(deleted);

    // Verify it's actually deleted
    let result = get_campaign_impl(&db, created.id).await;
    assert!(result.is_err());
}

#[tokio::test]
async fn test_delete_campaign_not_found() {
    let db = setup_test_db().await.expect("Failed to setup test database");

    let deleted = delete_campaign_impl(&db, "nonexistent-id".to_string())
        .await
        .expect("Delete should not error");

    assert!(!deleted);
}

#[tokio::test]
async fn test_campaign_crud_lifecycle() {
    let db = setup_test_db().await.expect("Failed to setup test database");

    // Create
    let campaign = create_campaign_impl(
        &db,
        "Lifecycle Test".to_string(),
        Some("Testing full CRUD".to_string()),
        Some("Custom System".to_string()),
    )
    .await
    .expect("Create failed");

    // Read
    let read = get_campaign_impl(&db, campaign.id.clone())
        .await
        .expect("Read failed");
    assert_eq!(read.name, "Lifecycle Test");

    // Update
    let updated = update_campaign_impl(
        &db,
        campaign.id.clone(),
        Some("Updated Lifecycle".to_string()),
        None,
        None,
        None,
    )
    .await
    .expect("Update failed");
    assert_eq!(updated.name, "Updated Lifecycle");

    // List
    let list = list_campaigns_impl(&db).await.expect("List failed");
    assert_eq!(list.len(), 1);
    assert_eq!(list[0].name, "Updated Lifecycle");

    // Delete
    let deleted = delete_campaign_impl(&db, campaign.id.clone())
        .await
        .expect("Delete failed");
    assert!(deleted);

    // Verify deleted
    let list_after = list_campaigns_impl(&db).await.expect("List after delete failed");
    assert!(list_after.is_empty());
}
