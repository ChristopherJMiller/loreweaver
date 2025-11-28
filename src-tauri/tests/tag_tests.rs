mod common;

use common::{create_test_campaign, create_test_character, create_test_location, setup_test_db};
use loreweaver_lib::commands::tag::{
    add_entity_tag_impl, create_tag_impl, delete_tag_impl, get_entity_tags_impl, get_tag_impl,
    list_tags_impl, remove_entity_tag_impl,
};

#[tokio::test]
async fn test_create_tag() {
    let db = setup_test_db()
        .await
        .expect("Failed to setup test database");
    let campaign = create_test_campaign(&db, "Test Campaign")
        .await
        .expect("Failed to create campaign");

    let tag = create_tag_impl(
        &db,
        campaign.id.clone(),
        "Important".to_string(),
        Some("#FF0000".to_string()),
    )
    .await
    .expect("Failed to create tag");

    assert_eq!(tag.name, "Important");
    assert_eq!(tag.campaign_id, campaign.id);
    assert_eq!(tag.color, Some("#FF0000".to_string()));
}

#[tokio::test]
async fn test_create_tag_without_color() {
    let db = setup_test_db()
        .await
        .expect("Failed to setup test database");
    let campaign = create_test_campaign(&db, "Test Campaign")
        .await
        .expect("Failed to create campaign");

    let tag = create_tag_impl(&db, campaign.id.clone(), "Plain Tag".to_string(), None)
        .await
        .expect("Failed to create tag");

    assert_eq!(tag.name, "Plain Tag");
    assert_eq!(tag.color, None);
}

#[tokio::test]
async fn test_get_tag() {
    let db = setup_test_db()
        .await
        .expect("Failed to setup test database");
    let campaign = create_test_campaign(&db, "Test Campaign")
        .await
        .expect("Failed to create campaign");

    let created = create_tag_impl(&db, campaign.id.clone(), "Test Tag".to_string(), None)
        .await
        .expect("Failed to create tag");

    let retrieved = get_tag_impl(&db, created.id.clone())
        .await
        .expect("Failed to get tag");

    assert_eq!(retrieved.id, created.id);
    assert_eq!(retrieved.name, "Test Tag");
}

#[tokio::test]
async fn test_get_tag_not_found() {
    let db = setup_test_db()
        .await
        .expect("Failed to setup test database");

    let result = get_tag_impl(&db, "nonexistent-id".to_string()).await;

    assert!(result.is_err());
    let err = result.unwrap_err();
    assert!(err.to_string().contains("not found"));
}

#[tokio::test]
async fn test_list_tags_by_campaign() {
    let db = setup_test_db()
        .await
        .expect("Failed to setup test database");

    let campaign1 = create_test_campaign(&db, "Campaign 1")
        .await
        .expect("Failed to create campaign 1");
    let campaign2 = create_test_campaign(&db, "Campaign 2")
        .await
        .expect("Failed to create campaign 2");

    create_tag_impl(&db, campaign1.id.clone(), "Tag A".to_string(), None)
        .await
        .expect("Failed to create tag");
    create_tag_impl(&db, campaign1.id.clone(), "Tag B".to_string(), None)
        .await
        .expect("Failed to create tag");
    create_tag_impl(&db, campaign2.id.clone(), "Tag C".to_string(), None)
        .await
        .expect("Failed to create tag");

    let campaign1_tags = list_tags_impl(&db, campaign1.id.clone())
        .await
        .expect("Failed to list tags");
    let campaign2_tags = list_tags_impl(&db, campaign2.id.clone())
        .await
        .expect("Failed to list tags");

    assert_eq!(campaign1_tags.len(), 2);
    assert_eq!(campaign2_tags.len(), 1);
}

#[tokio::test]
async fn test_list_tags_ordered_by_name() {
    let db = setup_test_db()
        .await
        .expect("Failed to setup test database");
    let campaign = create_test_campaign(&db, "Test Campaign")
        .await
        .expect("Failed to create campaign");

    create_tag_impl(&db, campaign.id.clone(), "Zeta".to_string(), None)
        .await
        .expect("Failed to create tag");
    create_tag_impl(&db, campaign.id.clone(), "Alpha".to_string(), None)
        .await
        .expect("Failed to create tag");
    create_tag_impl(&db, campaign.id.clone(), "Beta".to_string(), None)
        .await
        .expect("Failed to create tag");

    let tags = list_tags_impl(&db, campaign.id.clone())
        .await
        .expect("Failed to list tags");

    assert_eq!(tags.len(), 3);
    assert_eq!(tags[0].name, "Alpha");
    assert_eq!(tags[1].name, "Beta");
    assert_eq!(tags[2].name, "Zeta");
}

#[tokio::test]
async fn test_delete_tag() {
    let db = setup_test_db()
        .await
        .expect("Failed to setup test database");
    let campaign = create_test_campaign(&db, "Test Campaign")
        .await
        .expect("Failed to create campaign");

    let created = create_tag_impl(&db, campaign.id.clone(), "To Delete".to_string(), None)
        .await
        .expect("Failed to create tag");

    let deleted = delete_tag_impl(&db, created.id.clone())
        .await
        .expect("Failed to delete tag");

    assert!(deleted);

    let result = get_tag_impl(&db, created.id).await;
    assert!(result.is_err());
}

#[tokio::test]
async fn test_add_tag_to_character() {
    let db = setup_test_db()
        .await
        .expect("Failed to setup test database");
    let campaign = create_test_campaign(&db, "Test Campaign")
        .await
        .expect("Failed to create campaign");
    let character = create_test_character(&db, &campaign.id, "Test Character")
        .await
        .expect("Failed to create character");
    let tag = create_tag_impl(&db, campaign.id.clone(), "Hero".to_string(), None)
        .await
        .expect("Failed to create tag");

    let added = add_entity_tag_impl(
        &db,
        tag.id.clone(),
        "character".to_string(),
        character.id.clone(),
    )
    .await
    .expect("Failed to add tag");

    assert!(added);

    // Verify tag is associated
    let entity_tags = get_entity_tags_impl(&db, "character".to_string(), character.id.clone())
        .await
        .expect("Failed to get entity tags");

    assert_eq!(entity_tags.len(), 1);
    assert_eq!(entity_tags[0].name, "Hero");
}

#[tokio::test]
async fn test_add_tag_to_location() {
    let db = setup_test_db()
        .await
        .expect("Failed to setup test database");
    let campaign = create_test_campaign(&db, "Test Campaign")
        .await
        .expect("Failed to create campaign");
    let location = create_test_location(&db, &campaign.id, "Test Location", None)
        .await
        .expect("Failed to create location");
    let tag = create_tag_impl(&db, campaign.id.clone(), "Dangerous".to_string(), None)
        .await
        .expect("Failed to create tag");

    add_entity_tag_impl(
        &db,
        tag.id.clone(),
        "location".to_string(),
        location.id.clone(),
    )
    .await
    .expect("Failed to add tag");

    let entity_tags = get_entity_tags_impl(&db, "location".to_string(), location.id.clone())
        .await
        .expect("Failed to get entity tags");

    assert_eq!(entity_tags.len(), 1);
    assert_eq!(entity_tags[0].name, "Dangerous");
}

#[tokio::test]
async fn test_add_multiple_tags_to_entity() {
    let db = setup_test_db()
        .await
        .expect("Failed to setup test database");
    let campaign = create_test_campaign(&db, "Test Campaign")
        .await
        .expect("Failed to create campaign");
    let character = create_test_character(&db, &campaign.id, "Multi-Tagged Character")
        .await
        .expect("Failed to create character");

    let tag1 = create_tag_impl(&db, campaign.id.clone(), "Hero".to_string(), None)
        .await
        .expect("Failed to create tag 1");
    let tag2 = create_tag_impl(&db, campaign.id.clone(), "Villain".to_string(), None)
        .await
        .expect("Failed to create tag 2");
    let tag3 = create_tag_impl(&db, campaign.id.clone(), "Noble".to_string(), None)
        .await
        .expect("Failed to create tag 3");

    add_entity_tag_impl(
        &db,
        tag1.id.clone(),
        "character".to_string(),
        character.id.clone(),
    )
    .await
    .expect("Failed to add tag 1");
    add_entity_tag_impl(
        &db,
        tag2.id.clone(),
        "character".to_string(),
        character.id.clone(),
    )
    .await
    .expect("Failed to add tag 2");
    add_entity_tag_impl(
        &db,
        tag3.id.clone(),
        "character".to_string(),
        character.id.clone(),
    )
    .await
    .expect("Failed to add tag 3");

    let entity_tags = get_entity_tags_impl(&db, "character".to_string(), character.id.clone())
        .await
        .expect("Failed to get entity tags");

    assert_eq!(entity_tags.len(), 3);
    // Ordered by name
    assert_eq!(entity_tags[0].name, "Hero");
    assert_eq!(entity_tags[1].name, "Noble");
    assert_eq!(entity_tags[2].name, "Villain");
}

#[tokio::test]
async fn test_remove_entity_tag() {
    let db = setup_test_db()
        .await
        .expect("Failed to setup test database");
    let campaign = create_test_campaign(&db, "Test Campaign")
        .await
        .expect("Failed to create campaign");
    let character = create_test_character(&db, &campaign.id, "Test Character")
        .await
        .expect("Failed to create character");
    let tag = create_tag_impl(&db, campaign.id.clone(), "Temporary".to_string(), None)
        .await
        .expect("Failed to create tag");

    // Add the tag
    add_entity_tag_impl(
        &db,
        tag.id.clone(),
        "character".to_string(),
        character.id.clone(),
    )
    .await
    .expect("Failed to add tag");

    // Verify it's there
    let tags_before = get_entity_tags_impl(&db, "character".to_string(), character.id.clone())
        .await
        .expect("Failed to get tags");
    assert_eq!(tags_before.len(), 1);

    // Remove the tag
    let removed = remove_entity_tag_impl(
        &db,
        tag.id.clone(),
        "character".to_string(),
        character.id.clone(),
    )
    .await
    .expect("Failed to remove tag");
    assert!(removed);

    // Verify it's gone
    let tags_after = get_entity_tags_impl(&db, "character".to_string(), character.id.clone())
        .await
        .expect("Failed to get tags");
    assert!(tags_after.is_empty());
}

#[tokio::test]
async fn test_remove_entity_tag_not_found() {
    let db = setup_test_db()
        .await
        .expect("Failed to setup test database");
    let campaign = create_test_campaign(&db, "Test Campaign")
        .await
        .expect("Failed to create campaign");

    let tag = create_tag_impl(&db, campaign.id.clone(), "Unused".to_string(), None)
        .await
        .expect("Failed to create tag");

    // Try to remove a tag that was never added
    let removed = remove_entity_tag_impl(
        &db,
        tag.id.clone(),
        "character".to_string(),
        "nonexistent-entity".to_string(),
    )
    .await
    .expect("Remove should not error");

    assert!(!removed);
}

#[tokio::test]
async fn test_get_entity_tags_empty() {
    let db = setup_test_db()
        .await
        .expect("Failed to setup test database");
    let campaign = create_test_campaign(&db, "Test Campaign")
        .await
        .expect("Failed to create campaign");
    let character = create_test_character(&db, &campaign.id, "Untagged Character")
        .await
        .expect("Failed to create character");

    let tags = get_entity_tags_impl(&db, "character".to_string(), character.id.clone())
        .await
        .expect("Failed to get entity tags");

    assert!(tags.is_empty());
}

#[tokio::test]
async fn test_same_tag_different_entities() {
    let db = setup_test_db()
        .await
        .expect("Failed to setup test database");
    let campaign = create_test_campaign(&db, "Test Campaign")
        .await
        .expect("Failed to create campaign");

    let character = create_test_character(&db, &campaign.id, "Character")
        .await
        .expect("Failed to create character");
    let location = create_test_location(&db, &campaign.id, "Location", None)
        .await
        .expect("Failed to create location");

    let tag = create_tag_impl(&db, campaign.id.clone(), "Important".to_string(), None)
        .await
        .expect("Failed to create tag");

    // Add same tag to both entities
    add_entity_tag_impl(
        &db,
        tag.id.clone(),
        "character".to_string(),
        character.id.clone(),
    )
    .await
    .expect("Failed to add tag to character");
    add_entity_tag_impl(
        &db,
        tag.id.clone(),
        "location".to_string(),
        location.id.clone(),
    )
    .await
    .expect("Failed to add tag to location");

    // Verify each entity has the tag
    let character_tags = get_entity_tags_impl(&db, "character".to_string(), character.id.clone())
        .await
        .expect("Failed to get character tags");
    let location_tags = get_entity_tags_impl(&db, "location".to_string(), location.id.clone())
        .await
        .expect("Failed to get location tags");

    assert_eq!(character_tags.len(), 1);
    assert_eq!(location_tags.len(), 1);
    assert_eq!(character_tags[0].id, location_tags[0].id);
}

#[tokio::test]
async fn test_tag_lifecycle() {
    let db = setup_test_db()
        .await
        .expect("Failed to setup test database");
    let campaign = create_test_campaign(&db, "Test Campaign")
        .await
        .expect("Failed to create campaign");
    let character = create_test_character(&db, &campaign.id, "Test Character")
        .await
        .expect("Failed to create character");

    // Create tag
    let tag = create_tag_impl(
        &db,
        campaign.id.clone(),
        "Lifecycle Tag".to_string(),
        Some("#00FF00".to_string()),
    )
    .await
    .expect("Failed to create tag");

    // Add to entity
    add_entity_tag_impl(
        &db,
        tag.id.clone(),
        "character".to_string(),
        character.id.clone(),
    )
    .await
    .expect("Failed to add tag");

    // Verify association
    let tags = get_entity_tags_impl(&db, "character".to_string(), character.id.clone())
        .await
        .expect("Failed to get tags");
    assert_eq!(tags.len(), 1);

    // Remove from entity
    remove_entity_tag_impl(
        &db,
        tag.id.clone(),
        "character".to_string(),
        character.id.clone(),
    )
    .await
    .expect("Failed to remove tag");

    // Verify removed
    let tags_after = get_entity_tags_impl(&db, "character".to_string(), character.id.clone())
        .await
        .expect("Failed to get tags");
    assert!(tags_after.is_empty());

    // Tag itself should still exist
    let retrieved = get_tag_impl(&db, tag.id.clone())
        .await
        .expect("Tag should still exist");
    assert_eq!(retrieved.name, "Lifecycle Tag");

    // Delete tag
    delete_tag_impl(&db, tag.id.clone())
        .await
        .expect("Failed to delete tag");

    // Verify deleted
    let result = get_tag_impl(&db, tag.id).await;
    assert!(result.is_err());
}
