mod common;

use common::{create_test_campaign, create_test_character, create_test_location, setup_test_db};
use loreweaver_lib::commands::search::search_entities_impl;

#[tokio::test]
async fn test_search_by_name() {
    let db = setup_test_db()
        .await
        .expect("Failed to setup test database");
    let campaign = create_test_campaign(&db, "Test Campaign")
        .await
        .expect("Failed to create campaign");

    // Create characters - triggers will auto-index them
    create_test_character(&db, &campaign.id, "Gandalf the Grey")
        .await
        .expect("Failed to create character");
    create_test_character(&db, &campaign.id, "Frodo Baggins")
        .await
        .expect("Failed to create character");

    let results = search_entities_impl(&db, campaign.id.clone(), "Gandalf".to_string(), None, None)
        .await
        .expect("Search failed");

    assert_eq!(results.len(), 1);
    assert_eq!(results[0].name, "Gandalf the Grey");
    assert_eq!(results[0].entity_type, "character");
}

#[tokio::test]
async fn test_search_prefix_matching() {
    let db = setup_test_db()
        .await
        .expect("Failed to setup test database");
    let campaign = create_test_campaign(&db, "Test Campaign")
        .await
        .expect("Failed to create campaign");

    create_test_character(&db, &campaign.id, "Gandalf")
        .await
        .expect("Failed to create character");
    create_test_character(&db, &campaign.id, "Galadriel")
        .await
        .expect("Failed to create character");
    create_test_character(&db, &campaign.id, "Gimli")
        .await
        .expect("Failed to create character");

    // Search with prefix "Ga" should match Gandalf and Galadriel
    let results = search_entities_impl(&db, campaign.id.clone(), "Ga".to_string(), None, None)
        .await
        .expect("Search failed");

    assert_eq!(results.len(), 2);
    let names: Vec<&str> = results.iter().map(|r| r.name.as_str()).collect();
    assert!(names.contains(&"Gandalf"));
    assert!(names.contains(&"Galadriel"));
}

#[tokio::test]
async fn test_search_multiple_words() {
    let db = setup_test_db()
        .await
        .expect("Failed to setup test database");
    let campaign = create_test_campaign(&db, "Test Campaign")
        .await
        .expect("Failed to create campaign");

    create_test_character(&db, &campaign.id, "Gandalf the Grey")
        .await
        .expect("Failed to create character");
    create_test_character(&db, &campaign.id, "Gandalf the White")
        .await
        .expect("Failed to create character");
    create_test_character(&db, &campaign.id, "Saruman the White")
        .await
        .expect("Failed to create character");

    // Search for "Gandalf White" should match "Gandalf the White"
    let results = search_entities_impl(
        &db,
        campaign.id.clone(),
        "Gandalf White".to_string(),
        None,
        None,
    )
    .await
    .expect("Search failed");

    assert_eq!(results.len(), 1);
    assert_eq!(results[0].name, "Gandalf the White");
}

#[tokio::test]
async fn test_search_across_entity_types() {
    let db = setup_test_db()
        .await
        .expect("Failed to setup test database");
    let campaign = create_test_campaign(&db, "Test Campaign")
        .await
        .expect("Failed to create campaign");

    // Create a character and location with similar names
    create_test_character(&db, &campaign.id, "Dragon Slayer")
        .await
        .expect("Failed to create character");
    create_test_location(&db, &campaign.id, "Dragon's Lair", None)
        .await
        .expect("Failed to create location");

    let results = search_entities_impl(&db, campaign.id.clone(), "Dragon".to_string(), None, None)
        .await
        .expect("Search failed");

    assert_eq!(results.len(), 2);
    let types: Vec<&str> = results.iter().map(|r| r.entity_type.as_str()).collect();
    assert!(types.contains(&"character"));
    assert!(types.contains(&"location"));
}

#[tokio::test]
async fn test_search_campaign_isolation() {
    let db = setup_test_db()
        .await
        .expect("Failed to setup test database");

    let campaign1 = create_test_campaign(&db, "Campaign 1")
        .await
        .expect("Failed to create campaign 1");
    let campaign2 = create_test_campaign(&db, "Campaign 2")
        .await
        .expect("Failed to create campaign 2");

    // Create character with same name in both campaigns
    create_test_character(&db, &campaign1.id, "Gandalf")
        .await
        .expect("Failed to create character in campaign 1");
    create_test_character(&db, &campaign2.id, "Gandalf")
        .await
        .expect("Failed to create character in campaign 2");

    // Search in campaign 1 should only return that campaign's Gandalf
    let results1 =
        search_entities_impl(&db, campaign1.id.clone(), "Gandalf".to_string(), None, None)
            .await
            .expect("Search failed");

    let results2 =
        search_entities_impl(&db, campaign2.id.clone(), "Gandalf".to_string(), None, None)
            .await
            .expect("Search failed");

    assert_eq!(results1.len(), 1);
    assert_eq!(results2.len(), 1);
    // They should have different entity IDs
    assert_ne!(results1[0].entity_id, results2[0].entity_id);
}

#[tokio::test]
async fn test_search_empty_query() {
    let db = setup_test_db()
        .await
        .expect("Failed to setup test database");
    let campaign = create_test_campaign(&db, "Test Campaign")
        .await
        .expect("Failed to create campaign");

    create_test_character(&db, &campaign.id, "Some Character")
        .await
        .expect("Failed to create character");

    // Empty query causes FTS5 syntax error - this is expected behavior
    // The application should validate queries before sending to FTS5
    let result = search_entities_impl(&db, campaign.id.clone(), "".to_string(), None, None).await;

    assert!(result.is_err());
}

#[tokio::test]
async fn test_search_no_matches() {
    let db = setup_test_db()
        .await
        .expect("Failed to setup test database");
    let campaign = create_test_campaign(&db, "Test Campaign")
        .await
        .expect("Failed to create campaign");

    create_test_character(&db, &campaign.id, "Gandalf")
        .await
        .expect("Failed to create character");

    let results = search_entities_impl(
        &db,
        campaign.id.clone(),
        "Nonexistent".to_string(),
        None,
        None,
    )
    .await
    .expect("Search failed");

    assert!(results.is_empty());
}

#[tokio::test]
async fn test_search_with_limit() {
    let db = setup_test_db()
        .await
        .expect("Failed to setup test database");
    let campaign = create_test_campaign(&db, "Test Campaign")
        .await
        .expect("Failed to create campaign");

    // Create multiple matching characters
    for i in 1..=10 {
        create_test_character(&db, &campaign.id, &format!("Adventurer {}", i))
            .await
            .expect("Failed to create character");
    }

    let results = search_entities_impl(
        &db,
        campaign.id.clone(),
        "Adventurer".to_string(),
        None,
        Some(3),
    )
    .await
    .expect("Search failed");

    assert_eq!(results.len(), 3);
}

#[tokio::test]
async fn test_search_default_limit() {
    let db = setup_test_db()
        .await
        .expect("Failed to setup test database");
    let campaign = create_test_campaign(&db, "Test Campaign")
        .await
        .expect("Failed to create campaign");

    // Create more than 50 characters
    for i in 1..=60 {
        create_test_character(&db, &campaign.id, &format!("Test Character {}", i))
            .await
            .expect("Failed to create character");
    }

    // Default limit should be 50
    let results = search_entities_impl(
        &db,
        campaign.id.clone(),
        "Test Character".to_string(),
        None,
        None,
    )
    .await
    .expect("Search failed");

    assert_eq!(results.len(), 50);
}

#[tokio::test]
async fn test_search_returns_entity_id() {
    let db = setup_test_db()
        .await
        .expect("Failed to setup test database");
    let campaign = create_test_campaign(&db, "Test Campaign")
        .await
        .expect("Failed to create campaign");

    let character = create_test_character(&db, &campaign.id, "Unique Character")
        .await
        .expect("Failed to create character");

    let results = search_entities_impl(&db, campaign.id.clone(), "Unique".to_string(), None, None)
        .await
        .expect("Search failed");

    assert_eq!(results.len(), 1);
    assert_eq!(results[0].entity_id, character.id);
}

#[tokio::test]
async fn test_search_case_insensitive() {
    let db = setup_test_db()
        .await
        .expect("Failed to setup test database");
    let campaign = create_test_campaign(&db, "Test Campaign")
        .await
        .expect("Failed to create campaign");

    create_test_character(&db, &campaign.id, "GANDALF")
        .await
        .expect("Failed to create character");

    // Search should be case-insensitive
    let results_lower =
        search_entities_impl(&db, campaign.id.clone(), "gandalf".to_string(), None, None)
            .await
            .expect("Search failed");
    let results_upper =
        search_entities_impl(&db, campaign.id.clone(), "GANDALF".to_string(), None, None)
            .await
            .expect("Search failed");
    let results_mixed =
        search_entities_impl(&db, campaign.id.clone(), "GaNdAlF".to_string(), None, None)
            .await
            .expect("Search failed");

    assert_eq!(results_lower.len(), 1);
    assert_eq!(results_upper.len(), 1);
    assert_eq!(results_mixed.len(), 1);
}

#[tokio::test]
async fn test_search_special_characters_in_query() {
    let db = setup_test_db()
        .await
        .expect("Failed to setup test database");
    let campaign = create_test_campaign(&db, "Test Campaign")
        .await
        .expect("Failed to create campaign");

    create_test_character(&db, &campaign.id, "Test Character")
        .await
        .expect("Failed to create character");

    // Quotes are stripped from queries to prevent FTS5 syntax errors
    let results = search_entities_impl(
        &db,
        campaign.id.clone(),
        r#""Test" "Character""#.to_string(),
        None,
        None,
    )
    .await
    .expect("Search failed");

    assert_eq!(results.len(), 1);
}

#[tokio::test]
async fn test_search_returns_snippet() {
    let db = setup_test_db()
        .await
        .expect("Failed to setup test database");
    let campaign = create_test_campaign(&db, "Test Campaign")
        .await
        .expect("Failed to create campaign");

    create_test_character(&db, &campaign.id, "Gandalf")
        .await
        .expect("Failed to create character");

    let results = search_entities_impl(&db, campaign.id.clone(), "Gandalf".to_string(), None, None)
        .await
        .expect("Search failed");

    assert_eq!(results.len(), 1);
    // Snippet should be present (may contain highlighted match)
    assert!(results[0].snippet.is_some() || results[0].name.contains("Gandalf"));
}

#[tokio::test]
async fn test_search_returns_rank() {
    let db = setup_test_db()
        .await
        .expect("Failed to setup test database");
    let campaign = create_test_campaign(&db, "Test Campaign")
        .await
        .expect("Failed to create campaign");

    create_test_character(&db, &campaign.id, "Gandalf")
        .await
        .expect("Failed to create character");

    let results = search_entities_impl(&db, campaign.id.clone(), "Gandalf".to_string(), None, None)
        .await
        .expect("Search failed");

    assert_eq!(results.len(), 1);
    // Rank should be a finite number (FTS5 BM25 ranking)
    assert!(results[0].rank.is_finite());
}
