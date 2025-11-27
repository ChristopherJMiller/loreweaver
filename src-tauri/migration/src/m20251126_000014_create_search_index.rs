use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        // Create FTS5 virtual table for full-text search
        db.execute_unprepared(
            r#"
            CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
                entity_type,
                entity_id UNINDEXED,
                campaign_id UNINDEXED,
                name,
                content,
                tokenize='porter unicode61'
            );
            "#,
        )
        .await?;

        // Triggers for characters
        db.execute_unprepared(
            r#"
            CREATE TRIGGER IF NOT EXISTS characters_ai AFTER INSERT ON characters BEGIN
                INSERT INTO search_index(entity_type, entity_id, campaign_id, name, content)
                VALUES ('character', NEW.id, NEW.campaign_id, NEW.name,
                        COALESCE(NEW.description, '') || ' ' ||
                        COALESCE(NEW.personality, '') || ' ' ||
                        COALESCE(NEW.motivations, ''));
            END;
            "#,
        )
        .await?;

        db.execute_unprepared(
            r#"
            CREATE TRIGGER IF NOT EXISTS characters_au AFTER UPDATE ON characters BEGIN
                DELETE FROM search_index WHERE entity_type = 'character' AND entity_id = OLD.id;
                INSERT INTO search_index(entity_type, entity_id, campaign_id, name, content)
                VALUES ('character', NEW.id, NEW.campaign_id, NEW.name,
                        COALESCE(NEW.description, '') || ' ' ||
                        COALESCE(NEW.personality, '') || ' ' ||
                        COALESCE(NEW.motivations, ''));
            END;
            "#,
        )
        .await?;

        db.execute_unprepared(
            r#"
            CREATE TRIGGER IF NOT EXISTS characters_ad AFTER DELETE ON characters BEGIN
                DELETE FROM search_index WHERE entity_type = 'character' AND entity_id = OLD.id;
            END;
            "#,
        )
        .await?;

        // Triggers for locations
        db.execute_unprepared(
            r#"
            CREATE TRIGGER IF NOT EXISTS locations_ai AFTER INSERT ON locations BEGIN
                INSERT INTO search_index(entity_type, entity_id, campaign_id, name, content)
                VALUES ('location', NEW.id, NEW.campaign_id, NEW.name,
                        COALESCE(NEW.description, ''));
            END;
            "#,
        )
        .await?;

        db.execute_unprepared(
            r#"
            CREATE TRIGGER IF NOT EXISTS locations_au AFTER UPDATE ON locations BEGIN
                DELETE FROM search_index WHERE entity_type = 'location' AND entity_id = OLD.id;
                INSERT INTO search_index(entity_type, entity_id, campaign_id, name, content)
                VALUES ('location', NEW.id, NEW.campaign_id, NEW.name,
                        COALESCE(NEW.description, ''));
            END;
            "#,
        )
        .await?;

        db.execute_unprepared(
            r#"
            CREATE TRIGGER IF NOT EXISTS locations_ad AFTER DELETE ON locations BEGIN
                DELETE FROM search_index WHERE entity_type = 'location' AND entity_id = OLD.id;
            END;
            "#,
        )
        .await?;

        // Triggers for organizations
        db.execute_unprepared(
            r#"
            CREATE TRIGGER IF NOT EXISTS organizations_ai AFTER INSERT ON organizations BEGIN
                INSERT INTO search_index(entity_type, entity_id, campaign_id, name, content)
                VALUES ('organization', NEW.id, NEW.campaign_id, NEW.name,
                        COALESCE(NEW.description, '') || ' ' || COALESCE(NEW.goals, ''));
            END;
            "#,
        )
        .await?;

        db.execute_unprepared(
            r#"
            CREATE TRIGGER IF NOT EXISTS organizations_au AFTER UPDATE ON organizations BEGIN
                DELETE FROM search_index WHERE entity_type = 'organization' AND entity_id = OLD.id;
                INSERT INTO search_index(entity_type, entity_id, campaign_id, name, content)
                VALUES ('organization', NEW.id, NEW.campaign_id, NEW.name,
                        COALESCE(NEW.description, '') || ' ' || COALESCE(NEW.goals, ''));
            END;
            "#,
        )
        .await?;

        db.execute_unprepared(
            r#"
            CREATE TRIGGER IF NOT EXISTS organizations_ad AFTER DELETE ON organizations BEGIN
                DELETE FROM search_index WHERE entity_type = 'organization' AND entity_id = OLD.id;
            END;
            "#,
        )
        .await?;

        // Triggers for quests
        db.execute_unprepared(
            r#"
            CREATE TRIGGER IF NOT EXISTS quests_ai AFTER INSERT ON quests BEGIN
                INSERT INTO search_index(entity_type, entity_id, campaign_id, name, content)
                VALUES ('quest', NEW.id, NEW.campaign_id, NEW.name,
                        COALESCE(NEW.description, '') || ' ' ||
                        COALESCE(NEW.hook, '') || ' ' ||
                        COALESCE(NEW.objectives, ''));
            END;
            "#,
        )
        .await?;

        db.execute_unprepared(
            r#"
            CREATE TRIGGER IF NOT EXISTS quests_au AFTER UPDATE ON quests BEGIN
                DELETE FROM search_index WHERE entity_type = 'quest' AND entity_id = OLD.id;
                INSERT INTO search_index(entity_type, entity_id, campaign_id, name, content)
                VALUES ('quest', NEW.id, NEW.campaign_id, NEW.name,
                        COALESCE(NEW.description, '') || ' ' ||
                        COALESCE(NEW.hook, '') || ' ' ||
                        COALESCE(NEW.objectives, ''));
            END;
            "#,
        )
        .await?;

        db.execute_unprepared(
            r#"
            CREATE TRIGGER IF NOT EXISTS quests_ad AFTER DELETE ON quests BEGIN
                DELETE FROM search_index WHERE entity_type = 'quest' AND entity_id = OLD.id;
            END;
            "#,
        )
        .await?;

        // Triggers for heroes
        db.execute_unprepared(
            r#"
            CREATE TRIGGER IF NOT EXISTS heroes_ai AFTER INSERT ON heroes BEGIN
                INSERT INTO search_index(entity_type, entity_id, campaign_id, name, content)
                VALUES ('hero', NEW.id, NEW.campaign_id, NEW.name,
                        COALESCE(NEW.description, '') || ' ' || COALESCE(NEW.backstory, ''));
            END;
            "#,
        )
        .await?;

        db.execute_unprepared(
            r#"
            CREATE TRIGGER IF NOT EXISTS heroes_au AFTER UPDATE ON heroes BEGIN
                DELETE FROM search_index WHERE entity_type = 'hero' AND entity_id = OLD.id;
                INSERT INTO search_index(entity_type, entity_id, campaign_id, name, content)
                VALUES ('hero', NEW.id, NEW.campaign_id, NEW.name,
                        COALESCE(NEW.description, '') || ' ' || COALESCE(NEW.backstory, ''));
            END;
            "#,
        )
        .await?;

        db.execute_unprepared(
            r#"
            CREATE TRIGGER IF NOT EXISTS heroes_ad AFTER DELETE ON heroes BEGIN
                DELETE FROM search_index WHERE entity_type = 'hero' AND entity_id = OLD.id;
            END;
            "#,
        )
        .await?;

        // Triggers for sessions
        db.execute_unprepared(
            r#"
            CREATE TRIGGER IF NOT EXISTS sessions_ai AFTER INSERT ON sessions BEGIN
                INSERT INTO search_index(entity_type, entity_id, campaign_id, name, content)
                VALUES ('session', NEW.id, NEW.campaign_id, COALESCE(NEW.title, 'Session ' || NEW.session_number),
                        COALESCE(NEW.notes, '') || ' ' || COALESCE(NEW.summary, ''));
            END;
            "#,
        )
        .await?;

        db.execute_unprepared(
            r#"
            CREATE TRIGGER IF NOT EXISTS sessions_au AFTER UPDATE ON sessions BEGIN
                DELETE FROM search_index WHERE entity_type = 'session' AND entity_id = OLD.id;
                INSERT INTO search_index(entity_type, entity_id, campaign_id, name, content)
                VALUES ('session', NEW.id, NEW.campaign_id, COALESCE(NEW.title, 'Session ' || NEW.session_number),
                        COALESCE(NEW.notes, '') || ' ' || COALESCE(NEW.summary, ''));
            END;
            "#,
        )
        .await?;

        db.execute_unprepared(
            r#"
            CREATE TRIGGER IF NOT EXISTS sessions_ad AFTER DELETE ON sessions BEGIN
                DELETE FROM search_index WHERE entity_type = 'session' AND entity_id = OLD.id;
            END;
            "#,
        )
        .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        // Drop triggers
        for table in ["characters", "locations", "organizations", "quests", "heroes", "sessions"] {
            db.execute_unprepared(&format!("DROP TRIGGER IF EXISTS {}_ai;", table))
                .await?;
            db.execute_unprepared(&format!("DROP TRIGGER IF EXISTS {}_au;", table))
                .await?;
            db.execute_unprepared(&format!("DROP TRIGGER IF EXISTS {}_ad;", table))
                .await?;
        }

        // Drop FTS5 table
        db.execute_unprepared("DROP TABLE IF EXISTS search_index;")
            .await?;

        Ok(())
    }
}
