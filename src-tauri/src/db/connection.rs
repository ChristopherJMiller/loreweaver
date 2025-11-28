use migration::{Migrator, MigratorTrait};
use sea_orm::{Database, DatabaseConnection};
use std::fs;
use tauri::Manager;

/// Application state holding the database connection
pub struct AppState {
    pub db: DatabaseConnection,
}

/// Initialize the database connection and run migrations
pub async fn init_database(
    app: &tauri::App,
) -> Result<DatabaseConnection, Box<dyn std::error::Error>> {
    // Get app data directory from Tauri
    let app_dir = app.path().app_data_dir()?;

    // Create the directory if it doesn't exist
    fs::create_dir_all(&app_dir)?;

    // Construct the database path
    let db_path = app_dir.join("campaigns.db");
    let db_url = format!("sqlite:{}?mode=rwc", db_path.display());

    log::info!("Initializing database at: {}", db_path.display());

    // Connect to the database
    let db = Database::connect(&db_url).await?;

    // Run migrations
    log::info!("Running database migrations...");
    Migrator::up(&db, None).await?;
    log::info!("Database migrations complete");

    Ok(db)
}
