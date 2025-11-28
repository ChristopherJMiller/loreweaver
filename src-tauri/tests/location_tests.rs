mod common;

use common::{create_test_campaign, setup_test_db};
use loreweaver_lib::commands::location::{
    create_location_impl, delete_location_impl, get_location_children_impl, get_location_impl,
    list_locations_impl, update_location_impl,
};

#[tokio::test]
async fn test_create_location() {
    let db = setup_test_db().await.expect("Failed to setup test database");
    let campaign = create_test_campaign(&db, "Test Campaign")
        .await
        .expect("Failed to create campaign");

    let location = create_location_impl(
        &db,
        campaign.id.clone(),
        "The Shire".to_string(),
        Some("region".to_string()),
        None,
        Some("A peaceful land".to_string()),
    )
    .await
    .expect("Failed to create location");

    assert_eq!(location.name, "The Shire");
    assert_eq!(location.campaign_id, campaign.id);
    assert_eq!(location.location_type, "region");
    assert_eq!(location.parent_id, None);
    assert_eq!(location.description, Some("A peaceful land".to_string()));
}

#[tokio::test]
async fn test_create_location_default_type() {
    let db = setup_test_db().await.expect("Failed to setup test database");
    let campaign = create_test_campaign(&db, "Test Campaign")
        .await
        .expect("Failed to create campaign");

    let location = create_location_impl(
        &db,
        campaign.id.clone(),
        "Hobbiton".to_string(),
        None, // No type specified
        None,
        None,
    )
    .await
    .expect("Failed to create location");

    assert_eq!(location.location_type, "settlement");
}

#[tokio::test]
async fn test_create_location_with_parent() {
    let db = setup_test_db().await.expect("Failed to setup test database");
    let campaign = create_test_campaign(&db, "Test Campaign")
        .await
        .expect("Failed to create campaign");

    // Create parent location
    let parent = create_location_impl(
        &db,
        campaign.id.clone(),
        "The Shire".to_string(),
        Some("region".to_string()),
        None,
        None,
    )
    .await
    .expect("Failed to create parent");

    // Create child location
    let child = create_location_impl(
        &db,
        campaign.id.clone(),
        "Hobbiton".to_string(),
        Some("village".to_string()),
        Some(parent.id.clone()),
        None,
    )
    .await
    .expect("Failed to create child");

    assert_eq!(child.parent_id, Some(parent.id));
}

#[tokio::test]
async fn test_get_location() {
    let db = setup_test_db().await.expect("Failed to setup test database");
    let campaign = create_test_campaign(&db, "Test Campaign")
        .await
        .expect("Failed to create campaign");

    let created = create_location_impl(
        &db,
        campaign.id.clone(),
        "Test Location".to_string(),
        None,
        None,
        None,
    )
    .await
    .expect("Failed to create location");

    let retrieved = get_location_impl(&db, created.id.clone())
        .await
        .expect("Failed to get location");

    assert_eq!(retrieved.id, created.id);
    assert_eq!(retrieved.name, "Test Location");
}

#[tokio::test]
async fn test_get_location_not_found() {
    let db = setup_test_db().await.expect("Failed to setup test database");

    let result = get_location_impl(&db, "nonexistent-id".to_string()).await;

    assert!(result.is_err());
    let err = result.unwrap_err();
    assert!(err.to_string().contains("not found"));
}

#[tokio::test]
async fn test_list_locations_by_campaign() {
    let db = setup_test_db().await.expect("Failed to setup test database");

    let campaign1 = create_test_campaign(&db, "Campaign 1")
        .await
        .expect("Failed to create campaign 1");
    let campaign2 = create_test_campaign(&db, "Campaign 2")
        .await
        .expect("Failed to create campaign 2");

    // Create locations in campaign 1
    create_location_impl(&db, campaign1.id.clone(), "Location A".to_string(), None, None, None)
        .await
        .expect("Failed to create location");
    create_location_impl(&db, campaign1.id.clone(), "Location B".to_string(), None, None, None)
        .await
        .expect("Failed to create location");

    // Create location in campaign 2
    create_location_impl(&db, campaign2.id.clone(), "Location C".to_string(), None, None, None)
        .await
        .expect("Failed to create location");

    let campaign1_locs = list_locations_impl(&db, campaign1.id.clone())
        .await
        .expect("Failed to list locations");
    let campaign2_locs = list_locations_impl(&db, campaign2.id.clone())
        .await
        .expect("Failed to list locations");

    assert_eq!(campaign1_locs.len(), 2);
    assert_eq!(campaign2_locs.len(), 1);
}

#[tokio::test]
async fn test_list_locations_ordered_by_name() {
    let db = setup_test_db().await.expect("Failed to setup test database");
    let campaign = create_test_campaign(&db, "Test Campaign")
        .await
        .expect("Failed to create campaign");

    // Create in non-alphabetical order
    create_location_impl(&db, campaign.id.clone(), "Zephyr City".to_string(), None, None, None)
        .await
        .expect("Failed to create location");
    create_location_impl(&db, campaign.id.clone(), "Alpha Town".to_string(), None, None, None)
        .await
        .expect("Failed to create location");
    create_location_impl(&db, campaign.id.clone(), "Beta Village".to_string(), None, None, None)
        .await
        .expect("Failed to create location");

    let locations = list_locations_impl(&db, campaign.id.clone())
        .await
        .expect("Failed to list locations");

    assert_eq!(locations.len(), 3);
    assert_eq!(locations[0].name, "Alpha Town");
    assert_eq!(locations[1].name, "Beta Village");
    assert_eq!(locations[2].name, "Zephyr City");
}

#[tokio::test]
async fn test_get_location_children() {
    let db = setup_test_db().await.expect("Failed to setup test database");
    let campaign = create_test_campaign(&db, "Test Campaign")
        .await
        .expect("Failed to create campaign");

    // Create parent
    let parent = create_location_impl(
        &db,
        campaign.id.clone(),
        "Kingdom".to_string(),
        Some("kingdom".to_string()),
        None,
        None,
    )
    .await
    .expect("Failed to create parent");

    // Create children
    create_location_impl(
        &db,
        campaign.id.clone(),
        "Northern Province".to_string(),
        Some("province".to_string()),
        Some(parent.id.clone()),
        None,
    )
    .await
    .expect("Failed to create child 1");

    create_location_impl(
        &db,
        campaign.id.clone(),
        "Southern Province".to_string(),
        Some("province".to_string()),
        Some(parent.id.clone()),
        None,
    )
    .await
    .expect("Failed to create child 2");

    // Create sibling (no parent)
    create_location_impl(
        &db,
        campaign.id.clone(),
        "Independent City".to_string(),
        None,
        None,
        None,
    )
    .await
    .expect("Failed to create sibling");

    let children = get_location_children_impl(&db, parent.id.clone())
        .await
        .expect("Failed to get children");

    assert_eq!(children.len(), 2);
    // Ordered by name
    assert_eq!(children[0].name, "Northern Province");
    assert_eq!(children[1].name, "Southern Province");
}

#[tokio::test]
async fn test_location_hierarchy_three_levels() {
    let db = setup_test_db().await.expect("Failed to setup test database");
    let campaign = create_test_campaign(&db, "Test Campaign")
        .await
        .expect("Failed to create campaign");

    // Create continent
    let continent = create_location_impl(
        &db,
        campaign.id.clone(),
        "Middle-earth".to_string(),
        Some("continent".to_string()),
        None,
        None,
    )
    .await
    .expect("Failed to create continent");

    // Create region under continent
    let region = create_location_impl(
        &db,
        campaign.id.clone(),
        "The Shire".to_string(),
        Some("region".to_string()),
        Some(continent.id.clone()),
        None,
    )
    .await
    .expect("Failed to create region");

    // Create village under region
    let village = create_location_impl(
        &db,
        campaign.id.clone(),
        "Hobbiton".to_string(),
        Some("village".to_string()),
        Some(region.id.clone()),
        None,
    )
    .await
    .expect("Failed to create village");

    // Verify hierarchy
    let continent_children = get_location_children_impl(&db, continent.id.clone())
        .await
        .expect("Failed to get continent children");
    assert_eq!(continent_children.len(), 1);
    assert_eq!(continent_children[0].id, region.id);

    let region_children = get_location_children_impl(&db, region.id.clone())
        .await
        .expect("Failed to get region children");
    assert_eq!(region_children.len(), 1);
    assert_eq!(region_children[0].id, village.id);

    let village_children = get_location_children_impl(&db, village.id.clone())
        .await
        .expect("Failed to get village children");
    assert!(village_children.is_empty());
}

#[tokio::test]
async fn test_update_location() {
    let db = setup_test_db().await.expect("Failed to setup test database");
    let campaign = create_test_campaign(&db, "Test Campaign")
        .await
        .expect("Failed to create campaign");

    let created = create_location_impl(
        &db,
        campaign.id.clone(),
        "Original".to_string(),
        None,
        None,
        None,
    )
    .await
    .expect("Failed to create location");

    let updated = update_location_impl(
        &db,
        created.id.clone(),
        Some("Updated Name".to_string()),
        Some("fortress".to_string()),
        None,
        Some("A mighty fortress".to_string()),
        Some(5),
        Some("Secret entrance behind waterfall".to_string()),
    )
    .await
    .expect("Failed to update location");

    assert_eq!(updated.name, "Updated Name");
    assert_eq!(updated.location_type, "fortress");
    assert_eq!(updated.description, Some("A mighty fortress".to_string()));
    assert_eq!(updated.detail_level, 5);
    assert_eq!(updated.gm_notes, Some("Secret entrance behind waterfall".to_string()));
}

#[tokio::test]
async fn test_update_location_reparent() {
    let db = setup_test_db().await.expect("Failed to setup test database");
    let campaign = create_test_campaign(&db, "Test Campaign")
        .await
        .expect("Failed to create campaign");

    // Create two potential parents
    let parent1 = create_location_impl(
        &db,
        campaign.id.clone(),
        "Parent 1".to_string(),
        None,
        None,
        None,
    )
    .await
    .expect("Failed to create parent 1");

    let parent2 = create_location_impl(
        &db,
        campaign.id.clone(),
        "Parent 2".to_string(),
        None,
        None,
        None,
    )
    .await
    .expect("Failed to create parent 2");

    // Create child under parent 1
    let child = create_location_impl(
        &db,
        campaign.id.clone(),
        "Child".to_string(),
        None,
        Some(parent1.id.clone()),
        None,
    )
    .await
    .expect("Failed to create child");

    assert_eq!(child.parent_id, Some(parent1.id.clone()));

    // Move child to parent 2
    let reparented = update_location_impl(
        &db,
        child.id.clone(),
        None,
        None,
        Some(parent2.id.clone()),
        None,
        None,
        None,
    )
    .await
    .expect("Failed to reparent");

    assert_eq!(reparented.parent_id, Some(parent2.id.clone()));

    // Verify parent1 has no children now
    let parent1_children = get_location_children_impl(&db, parent1.id.clone())
        .await
        .expect("Failed to get children");
    assert!(parent1_children.is_empty());

    // Verify parent2 has the child
    let parent2_children = get_location_children_impl(&db, parent2.id.clone())
        .await
        .expect("Failed to get children");
    assert_eq!(parent2_children.len(), 1);
    assert_eq!(parent2_children[0].id, child.id);
}

#[tokio::test]
async fn test_delete_location() {
    let db = setup_test_db().await.expect("Failed to setup test database");
    let campaign = create_test_campaign(&db, "Test Campaign")
        .await
        .expect("Failed to create campaign");

    let created = create_location_impl(
        &db,
        campaign.id.clone(),
        "To Delete".to_string(),
        None,
        None,
        None,
    )
    .await
    .expect("Failed to create location");

    let deleted = delete_location_impl(&db, created.id.clone())
        .await
        .expect("Failed to delete location");

    assert!(deleted);

    let result = get_location_impl(&db, created.id).await;
    assert!(result.is_err());
}

#[tokio::test]
async fn test_location_crud_lifecycle() {
    let db = setup_test_db().await.expect("Failed to setup test database");
    let campaign = create_test_campaign(&db, "Test Campaign")
        .await
        .expect("Failed to create campaign");

    // Create
    let location = create_location_impl(
        &db,
        campaign.id.clone(),
        "Lifecycle Location".to_string(),
        Some("dungeon".to_string()),
        None,
        Some("A dark dungeon".to_string()),
    )
    .await
    .expect("Create failed");

    // Read
    let read = get_location_impl(&db, location.id.clone())
        .await
        .expect("Read failed");
    assert_eq!(read.name, "Lifecycle Location");

    // Update
    let updated = update_location_impl(
        &db,
        location.id.clone(),
        Some("Updated Location".to_string()),
        None,
        None,
        None,
        None,
        None,
    )
    .await
    .expect("Update failed");
    assert_eq!(updated.name, "Updated Location");

    // List
    let list = list_locations_impl(&db, campaign.id.clone())
        .await
        .expect("List failed");
    assert_eq!(list.len(), 1);

    // Delete
    let deleted = delete_location_impl(&db, location.id.clone())
        .await
        .expect("Delete failed");
    assert!(deleted);

    // Verify deleted
    let list_after = list_locations_impl(&db, campaign.id.clone())
        .await
        .expect("List after delete failed");
    assert!(list_after.is_empty());
}
