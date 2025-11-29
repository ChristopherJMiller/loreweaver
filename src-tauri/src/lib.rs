pub mod commands;
mod db;
mod error;

use db::{init_database, AppState};
use tauri::Manager;

// Re-export for use in commands
pub use error::AppError;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .setup(|app| {
            // Initialize database on startup
            tauri::async_runtime::block_on(async {
                let db = init_database(app)
                    .await
                    .expect("Failed to initialize database");
                app.manage(AppState { db });
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Campaign commands
            commands::campaign::create_campaign,
            commands::campaign::get_campaign,
            commands::campaign::list_campaigns,
            commands::campaign::update_campaign,
            commands::campaign::delete_campaign,
            // Character commands
            commands::character::create_character,
            commands::character::get_character,
            commands::character::list_characters,
            commands::character::update_character,
            commands::character::delete_character,
            // Location commands
            commands::location::create_location,
            commands::location::get_location,
            commands::location::list_locations,
            commands::location::get_location_children,
            commands::location::update_location,
            commands::location::delete_location,
            // Organization commands
            commands::organization::create_organization,
            commands::organization::get_organization,
            commands::organization::list_organizations,
            commands::organization::update_organization,
            commands::organization::delete_organization,
            // Quest commands
            commands::quest::create_quest,
            commands::quest::get_quest,
            commands::quest::list_quests,
            commands::quest::update_quest,
            commands::quest::delete_quest,
            // Hero commands
            commands::hero::create_hero,
            commands::hero::get_hero,
            commands::hero::list_heroes,
            commands::hero::update_hero,
            commands::hero::delete_hero,
            // Player commands
            commands::player::create_player,
            commands::player::get_player,
            commands::player::list_players,
            commands::player::update_player,
            commands::player::delete_player,
            // Session commands
            commands::session::create_session,
            commands::session::get_session,
            commands::session::list_sessions,
            commands::session::update_session,
            commands::session::delete_session,
            // Timeline event commands
            commands::timeline::create_timeline_event,
            commands::timeline::get_timeline_event,
            commands::timeline::list_timeline_events,
            commands::timeline::update_timeline_event,
            commands::timeline::delete_timeline_event,
            // Secret commands
            commands::secret::create_secret,
            commands::secret::get_secret,
            commands::secret::list_secrets,
            commands::secret::update_secret,
            commands::secret::delete_secret,
            // Relationship commands
            commands::relationship::create_relationship,
            commands::relationship::get_relationship,
            commands::relationship::list_relationships,
            commands::relationship::get_entity_relationships,
            commands::relationship::update_relationship,
            commands::relationship::delete_relationship,
            // Tag commands
            commands::tag::create_tag,
            commands::tag::get_tag,
            commands::tag::list_tags,
            commands::tag::delete_tag,
            commands::tag::add_entity_tag,
            commands::tag::remove_entity_tag,
            commands::tag::get_entity_tags,
            // Search commands
            commands::search::search_entities,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
