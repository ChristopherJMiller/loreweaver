pub use sea_orm_migration::prelude::*;

mod m20251126_000001_create_campaigns;
mod m20251126_000002_create_players;
mod m20251126_000003_create_locations;
mod m20251126_000004_create_characters;
mod m20251126_000005_create_organizations;
mod m20251126_000006_create_quests;
mod m20251126_000007_create_heroes;
mod m20251126_000008_create_sessions;
mod m20251126_000009_create_timeline_events;
mod m20251126_000010_create_secrets;
mod m20251126_000011_create_relationships;
mod m20251126_000012_create_tags;
mod m20251126_000013_create_entity_tags;
mod m20251126_000014_create_search_index;

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m20251126_000001_create_campaigns::Migration),
            Box::new(m20251126_000002_create_players::Migration),
            Box::new(m20251126_000003_create_locations::Migration),
            Box::new(m20251126_000004_create_characters::Migration),
            Box::new(m20251126_000005_create_organizations::Migration),
            Box::new(m20251126_000006_create_quests::Migration),
            Box::new(m20251126_000007_create_heroes::Migration),
            Box::new(m20251126_000008_create_sessions::Migration),
            Box::new(m20251126_000009_create_timeline_events::Migration),
            Box::new(m20251126_000010_create_secrets::Migration),
            Box::new(m20251126_000011_create_relationships::Migration),
            Box::new(m20251126_000012_create_tags::Migration),
            Box::new(m20251126_000013_create_entity_tags::Migration),
            Box::new(m20251126_000014_create_search_index::Migration),
        ]
    }
}
