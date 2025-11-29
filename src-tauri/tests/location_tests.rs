mod common;

use common::{create_test_campaign, setup_test_db};
use loreweaver_lib::commands::location::{
    create_location_impl, delete_location_impl, get_location_children_impl, get_location_impl,
    list_locations_impl, update_location_impl,
};
use loreweaver_lib::commands::validation::CreateLocationInput;

/// Helper to create a test location
fn make_location_input(
    campaign_id: String,
    name: &str,
    location_type: &str,
    parent_id: Option<String>,
    description: Option<&str>,
) -> CreateLocationInput {
    CreateLocationInput {
        campaign_id,
        name: name.to_string(),
        location_type: location_type.to_string(),
        parent_id,
        description: description.map(|s| s.to_string()),
    }
}

#[tokio::test]
async fn test_create_location() {
    let db = setup_test_db()
        .await
        .expect("Failed to setup test database");
    let campaign = create_test_campaign(&db, "Test Campaign")
        .await
        .expect("Failed to create campaign");

    let input = make_location_input(
        campaign.id.clone(),
        "The Shire",
        "region",
        None,
        Some("A peaceful land"),
    );
    let location = create_location_impl(&db, input)
        .await
        .expect("Failed to create location");

    assert_eq!(location.name, "The Shire");
    assert_eq!(location.campaign_id, campaign.id);
    assert_eq!(location.location_type, "region");
    assert_eq!(location.parent_id, None);
    assert_eq!(location.description, Some("A peaceful land".to_string()));
}

#[tokio::test]
async fn test_create_location_with_parent() {
    let db = setup_test_db()
        .await
        .expect("Failed to setup test database");
    let campaign = create_test_campaign(&db, "Test Campaign")
        .await
        .expect("Failed to create campaign");

    // Create parent location
    let parent_input = make_location_input(campaign.id.clone(), "The Shire", "region", None, None);
    let parent = create_location_impl(&db, parent_input)
        .await
        .expect("Failed to create parent");

    // Create child location
    let child_input = make_location_input(
        campaign.id.clone(),
        "Hobbiton",
        "settlement",
        Some(parent.id.clone()),
        None,
    );
    let child = create_location_impl(&db, child_input)
        .await
        .expect("Failed to create child");

    assert_eq!(child.parent_id, Some(parent.id));
}

#[tokio::test]
async fn test_get_location() {
    let db = setup_test_db()
        .await
        .expect("Failed to setup test database");
    let campaign = create_test_campaign(&db, "Test Campaign")
        .await
        .expect("Failed to create campaign");

    let input = make_location_input(campaign.id.clone(), "Test Location", "settlement", None, None);
    let created = create_location_impl(&db, input)
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
    let db = setup_test_db()
        .await
        .expect("Failed to setup test database");

    let result = get_location_impl(&db, "nonexistent-id".to_string()).await;

    assert!(result.is_err());
    let err = result.unwrap_err();
    assert!(err.to_string().contains("not found"));
}

#[tokio::test]
async fn test_list_locations_by_campaign() {
    let db = setup_test_db()
        .await
        .expect("Failed to setup test database");

    let campaign1 = create_test_campaign(&db, "Campaign 1")
        .await
        .expect("Failed to create campaign 1");
    let campaign2 = create_test_campaign(&db, "Campaign 2")
        .await
        .expect("Failed to create campaign 2");

    // Create locations in campaign 1
    for name in ["Location A", "Location B"] {
        let input = make_location_input(campaign1.id.clone(), name, "settlement", None, None);
        create_location_impl(&db, input)
            .await
            .expect("Failed to create location");
    }

    // Create location in campaign 2
    let input = make_location_input(campaign2.id.clone(), "Location C", "settlement", None, None);
    create_location_impl(&db, input)
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
    let db = setup_test_db()
        .await
        .expect("Failed to setup test database");
    let campaign = create_test_campaign(&db, "Test Campaign")
        .await
        .expect("Failed to create campaign");

    // Create in non-alphabetical order
    for name in ["Zephyr City", "Alpha Town", "Beta Village"] {
        let input = make_location_input(campaign.id.clone(), name, "settlement", None, None);
        create_location_impl(&db, input)
            .await
            .expect("Failed to create location");
    }

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
    let db = setup_test_db()
        .await
        .expect("Failed to setup test database");
    let campaign = create_test_campaign(&db, "Test Campaign")
        .await
        .expect("Failed to create campaign");

    // Create parent
    let parent_input = make_location_input(campaign.id.clone(), "Kingdom", "territory", None, None);
    let parent = create_location_impl(&db, parent_input)
        .await
        .expect("Failed to create parent");

    // Create children
    let child1_input = make_location_input(
        campaign.id.clone(),
        "Northern Province",
        "region",
        Some(parent.id.clone()),
        None,
    );
    create_location_impl(&db, child1_input)
        .await
        .expect("Failed to create child 1");

    let child2_input = make_location_input(
        campaign.id.clone(),
        "Southern Province",
        "region",
        Some(parent.id.clone()),
        None,
    );
    create_location_impl(&db, child2_input)
        .await
        .expect("Failed to create child 2");

    // Create sibling (no parent)
    let sibling_input =
        make_location_input(campaign.id.clone(), "Independent City", "settlement", None, None);
    create_location_impl(&db, sibling_input)
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
    let db = setup_test_db()
        .await
        .expect("Failed to setup test database");
    let campaign = create_test_campaign(&db, "Test Campaign")
        .await
        .expect("Failed to create campaign");

    // Create continent
    let continent_input =
        make_location_input(campaign.id.clone(), "Middle-earth", "continent", None, None);
    let continent = create_location_impl(&db, continent_input)
        .await
        .expect("Failed to create continent");

    // Create region under continent
    let region_input = make_location_input(
        campaign.id.clone(),
        "The Shire",
        "region",
        Some(continent.id.clone()),
        None,
    );
    let region = create_location_impl(&db, region_input)
        .await
        .expect("Failed to create region");

    // Create settlement under region
    let village_input = make_location_input(
        campaign.id.clone(),
        "Hobbiton",
        "settlement",
        Some(region.id.clone()),
        None,
    );
    let village = create_location_impl(&db, village_input)
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
    let db = setup_test_db()
        .await
        .expect("Failed to setup test database");
    let campaign = create_test_campaign(&db, "Test Campaign")
        .await
        .expect("Failed to create campaign");

    let input = make_location_input(campaign.id.clone(), "Original", "settlement", None, None);
    let created = create_location_impl(&db, input)
        .await
        .expect("Failed to create location");

    let updated = update_location_impl(
        &db,
        created.id.clone(),
        Some("Updated Name".to_string()),
        Some("landmark".to_string()),
        None,
        Some("A mighty fortress".to_string()),
        Some(5),
        Some("Secret entrance behind waterfall".to_string()),
    )
    .await
    .expect("Failed to update location");

    assert_eq!(updated.name, "Updated Name");
    assert_eq!(updated.location_type, "landmark");
    assert_eq!(updated.description, Some("A mighty fortress".to_string()));
    assert_eq!(updated.detail_level, 5);
    assert_eq!(
        updated.gm_notes,
        Some("Secret entrance behind waterfall".to_string())
    );
}

#[tokio::test]
async fn test_update_location_reparent() {
    let db = setup_test_db()
        .await
        .expect("Failed to setup test database");
    let campaign = create_test_campaign(&db, "Test Campaign")
        .await
        .expect("Failed to create campaign");

    // Create two potential parents
    let parent1_input =
        make_location_input(campaign.id.clone(), "Parent 1", "region", None, None);
    let parent1 = create_location_impl(&db, parent1_input)
        .await
        .expect("Failed to create parent 1");

    let parent2_input =
        make_location_input(campaign.id.clone(), "Parent 2", "region", None, None);
    let parent2 = create_location_impl(&db, parent2_input)
        .await
        .expect("Failed to create parent 2");

    // Create child under parent 1
    let child_input = make_location_input(
        campaign.id.clone(),
        "Child",
        "settlement",
        Some(parent1.id.clone()),
        None,
    );
    let child = create_location_impl(&db, child_input)
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
    let db = setup_test_db()
        .await
        .expect("Failed to setup test database");
    let campaign = create_test_campaign(&db, "Test Campaign")
        .await
        .expect("Failed to create campaign");

    let input = make_location_input(campaign.id.clone(), "To Delete", "settlement", None, None);
    let created = create_location_impl(&db, input)
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
    let db = setup_test_db()
        .await
        .expect("Failed to setup test database");
    let campaign = create_test_campaign(&db, "Test Campaign")
        .await
        .expect("Failed to create campaign");

    // Create
    let input = make_location_input(
        campaign.id.clone(),
        "Lifecycle Location",
        "building",
        None,
        Some("A dark dungeon"),
    );
    let location = create_location_impl(&db, input)
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

#[tokio::test]
async fn test_create_location_validation_empty_name() {
    let db = setup_test_db()
        .await
        .expect("Failed to setup test database");
    let campaign = create_test_campaign(&db, "Test Campaign")
        .await
        .expect("Failed to create campaign");

    let input = CreateLocationInput {
        campaign_id: campaign.id.clone(),
        name: "".to_string(), // Empty name should fail
        location_type: "settlement".to_string(),
        parent_id: None,
        description: None,
    };
    let result = create_location_impl(&db, input).await;

    assert!(result.is_err());
    let err = result.unwrap_err();
    assert!(err.to_string().contains("Validation"));
}

#[tokio::test]
async fn test_create_location_validation_invalid_type() {
    let db = setup_test_db()
        .await
        .expect("Failed to setup test database");
    let campaign = create_test_campaign(&db, "Test Campaign")
        .await
        .expect("Failed to create campaign");

    let input = CreateLocationInput {
        campaign_id: campaign.id.clone(),
        name: "Test".to_string(),
        location_type: "invalid_type".to_string(), // Invalid type should fail
        parent_id: None,
        description: None,
    };
    let result = create_location_impl(&db, input).await;

    assert!(result.is_err());
    let err = result.unwrap_err();
    assert!(err.to_string().contains("Validation"));
}
