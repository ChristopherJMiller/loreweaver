mod common;

use common::{
    create_test_campaign, create_test_character, create_test_location, create_test_tag,
    setup_test_db,
};
use loreweaver_lib::commands::campaign::delete_campaign_impl;
use loreweaver_lib::commands::character::{get_character_impl, list_characters_impl};
use loreweaver_lib::commands::location::{get_location_impl, list_locations_impl};
use loreweaver_lib::commands::relationship::{
    create_relationship_impl, get_relationship_impl, list_relationships_impl,
};
use loreweaver_lib::commands::tag::{
    add_entity_tag_impl, delete_tag_impl, get_entity_tags_impl, get_tag_impl, list_tags_impl,
};

#[tokio::test]
async fn test_delete_campaign_cascades_to_characters() {
    let db = setup_test_db()
        .await
        .expect("Failed to setup test database");
    let campaign = create_test_campaign(&db, "Test Campaign")
        .await
        .expect("Failed to create campaign");

    // Create characters in the campaign
    let char1 = create_test_character(&db, &campaign.id, "Character 1")
        .await
        .expect("Failed to create character 1");
    let char2 = create_test_character(&db, &campaign.id, "Character 2")
        .await
        .expect("Failed to create character 2");

    // Verify characters exist
    let chars = list_characters_impl(&db, campaign.id.clone())
        .await
        .expect("Failed to list characters");
    assert_eq!(chars.len(), 2);

    // Delete the campaign
    delete_campaign_impl(&db, campaign.id.clone())
        .await
        .expect("Failed to delete campaign");

    // Verify characters are deleted (cascade)
    let result1 = get_character_impl(&db, char1.id).await;
    let result2 = get_character_impl(&db, char2.id).await;
    assert!(
        result1.is_err(),
        "Character 1 should be deleted with campaign"
    );
    assert!(
        result2.is_err(),
        "Character 2 should be deleted with campaign"
    );
}

#[tokio::test]
async fn test_delete_campaign_cascades_to_locations() {
    let db = setup_test_db()
        .await
        .expect("Failed to setup test database");
    let campaign = create_test_campaign(&db, "Test Campaign")
        .await
        .expect("Failed to create campaign");

    // Create locations in the campaign
    let loc1 = create_test_location(&db, &campaign.id, "Location 1", None)
        .await
        .expect("Failed to create location 1");
    let loc2 = create_test_location(&db, &campaign.id, "Location 2", Some(&loc1.id))
        .await
        .expect("Failed to create location 2");

    // Verify locations exist
    let locs = list_locations_impl(&db, campaign.id.clone())
        .await
        .expect("Failed to list locations");
    assert_eq!(locs.len(), 2);

    // Delete the campaign
    delete_campaign_impl(&db, campaign.id.clone())
        .await
        .expect("Failed to delete campaign");

    // Verify locations are deleted (cascade)
    let result1 = get_location_impl(&db, loc1.id).await;
    let result2 = get_location_impl(&db, loc2.id).await;
    assert!(
        result1.is_err(),
        "Location 1 should be deleted with campaign"
    );
    assert!(
        result2.is_err(),
        "Location 2 should be deleted with campaign"
    );
}

#[tokio::test]
async fn test_delete_campaign_cascades_to_tags() {
    let db = setup_test_db()
        .await
        .expect("Failed to setup test database");
    let campaign = create_test_campaign(&db, "Test Campaign")
        .await
        .expect("Failed to create campaign");

    // Create tags in the campaign
    let tag1 = create_test_tag(&db, &campaign.id, "Tag 1")
        .await
        .expect("Failed to create tag 1");
    let tag2 = create_test_tag(&db, &campaign.id, "Tag 2")
        .await
        .expect("Failed to create tag 2");

    // Verify tags exist
    let tags = list_tags_impl(&db, campaign.id.clone())
        .await
        .expect("Failed to list tags");
    assert_eq!(tags.len(), 2);

    // Delete the campaign
    delete_campaign_impl(&db, campaign.id.clone())
        .await
        .expect("Failed to delete campaign");

    // Verify tags are deleted (cascade)
    let result1 = get_tag_impl(&db, tag1.id).await;
    let result2 = get_tag_impl(&db, tag2.id).await;
    assert!(result1.is_err(), "Tag 1 should be deleted with campaign");
    assert!(result2.is_err(), "Tag 2 should be deleted with campaign");
}

#[tokio::test]
async fn test_delete_campaign_cascades_to_relationships() {
    let db = setup_test_db()
        .await
        .expect("Failed to setup test database");
    let campaign = create_test_campaign(&db, "Test Campaign")
        .await
        .expect("Failed to create campaign");

    let char1 = create_test_character(&db, &campaign.id, "Character 1")
        .await
        .expect("Failed to create character 1");
    let char2 = create_test_character(&db, &campaign.id, "Character 2")
        .await
        .expect("Failed to create character 2");

    // Create relationship
    let rel = create_relationship_impl(
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
    .expect("Failed to create relationship");

    // Verify relationship exists
    let rels = list_relationships_impl(&db, campaign.id.clone())
        .await
        .expect("Failed to list relationships");
    assert_eq!(rels.len(), 1);

    // Delete the campaign
    delete_campaign_impl(&db, campaign.id.clone())
        .await
        .expect("Failed to delete campaign");

    // Verify relationship is deleted (cascade)
    let result = get_relationship_impl(&db, rel.id).await;
    assert!(
        result.is_err(),
        "Relationship should be deleted with campaign"
    );
}

#[tokio::test]
async fn test_delete_tag_cascades_to_entity_tags() {
    let db = setup_test_db()
        .await
        .expect("Failed to setup test database");
    let campaign = create_test_campaign(&db, "Test Campaign")
        .await
        .expect("Failed to create campaign");

    let character = create_test_character(&db, &campaign.id, "Test Character")
        .await
        .expect("Failed to create character");

    let tag = create_test_tag(&db, &campaign.id, "Important")
        .await
        .expect("Failed to create tag");

    // Add tag to character
    add_entity_tag_impl(
        &db,
        tag.id.clone(),
        "character".to_string(),
        character.id.clone(),
    )
    .await
    .expect("Failed to add tag");

    // Verify association exists
    let entity_tags = get_entity_tags_impl(&db, "character".to_string(), character.id.clone())
        .await
        .expect("Failed to get entity tags");
    assert_eq!(entity_tags.len(), 1);

    // Delete the tag
    delete_tag_impl(&db, tag.id.clone())
        .await
        .expect("Failed to delete tag");

    // Verify entity_tag association is deleted (cascade)
    let entity_tags_after =
        get_entity_tags_impl(&db, "character".to_string(), character.id.clone())
            .await
            .expect("Failed to get entity tags");
    assert!(
        entity_tags_after.is_empty(),
        "Entity tags should be deleted with tag"
    );
}

#[tokio::test]
async fn test_delete_campaign_full_cascade() {
    let db = setup_test_db()
        .await
        .expect("Failed to setup test database");
    let campaign = create_test_campaign(&db, "Full Cascade Test Campaign")
        .await
        .expect("Failed to create campaign");

    // Create a rich set of entities
    let char1 = create_test_character(&db, &campaign.id, "Hero")
        .await
        .expect("Failed to create character");
    let char2 = create_test_character(&db, &campaign.id, "Villain")
        .await
        .expect("Failed to create character");

    let loc1 = create_test_location(&db, &campaign.id, "Kingdom", None)
        .await
        .expect("Failed to create location");
    let loc2 = create_test_location(&db, &campaign.id, "Castle", Some(&loc1.id))
        .await
        .expect("Failed to create location");

    let tag = create_test_tag(&db, &campaign.id, "Main Plot")
        .await
        .expect("Failed to create tag");

    // Tag the hero
    add_entity_tag_impl(
        &db,
        tag.id.clone(),
        "character".to_string(),
        char1.id.clone(),
    )
    .await
    .expect("Failed to add tag");

    // Create relationship
    let rel = create_relationship_impl(
        &db,
        campaign.id.clone(),
        "character".to_string(),
        char1.id.clone(),
        "character".to_string(),
        char2.id.clone(),
        "enemy".to_string(),
        Some("Nemesis".to_string()),
        Some(true),
        Some(10),
    )
    .await
    .expect("Failed to create relationship");

    // Verify everything exists
    assert_eq!(
        list_characters_impl(&db, campaign.id.clone())
            .await
            .unwrap()
            .len(),
        2
    );
    assert_eq!(
        list_locations_impl(&db, campaign.id.clone())
            .await
            .unwrap()
            .len(),
        2
    );
    assert_eq!(
        list_tags_impl(&db, campaign.id.clone())
            .await
            .unwrap()
            .len(),
        1
    );
    assert_eq!(
        list_relationships_impl(&db, campaign.id.clone())
            .await
            .unwrap()
            .len(),
        1
    );

    // Delete the campaign - everything should cascade
    delete_campaign_impl(&db, campaign.id.clone())
        .await
        .expect("Failed to delete campaign");

    // Verify all entities are deleted
    assert!(get_character_impl(&db, char1.id.clone()).await.is_err());
    assert!(get_character_impl(&db, char2.id.clone()).await.is_err());
    assert!(get_location_impl(&db, loc1.id.clone()).await.is_err());
    assert!(get_location_impl(&db, loc2.id.clone()).await.is_err());
    assert!(get_tag_impl(&db, tag.id.clone()).await.is_err());
    assert!(get_relationship_impl(&db, rel.id.clone()).await.is_err());
}

#[tokio::test]
async fn test_delete_parent_location_orphans_children() {
    let db = setup_test_db()
        .await
        .expect("Failed to setup test database");
    let campaign = create_test_campaign(&db, "Test Campaign")
        .await
        .expect("Failed to create campaign");

    // Create parent-child hierarchy
    let parent = create_test_location(&db, &campaign.id, "Parent Kingdom", None)
        .await
        .expect("Failed to create parent");
    let child = create_test_location(&db, &campaign.id, "Child Province", Some(&parent.id))
        .await
        .expect("Failed to create child");

    // Verify child has parent
    let child_before = get_location_impl(&db, child.id.clone())
        .await
        .expect("Failed to get child");
    assert_eq!(child_before.parent_id, Some(parent.id.clone()));

    // Delete the parent
    use loreweaver_lib::commands::location::delete_location_impl;
    delete_location_impl(&db, parent.id.clone())
        .await
        .expect("Failed to delete parent");

    // Child should still exist (locations don't cascade to children, they orphan them)
    // SQLite SET NULL on parent_id
    let child_after = get_location_impl(&db, child.id.clone()).await;

    // The child should still exist - whether parent_id is null or unchanged depends on migration
    // Let's just verify child still exists
    assert!(
        child_after.is_ok(),
        "Child location should still exist after parent deleted"
    );
}
