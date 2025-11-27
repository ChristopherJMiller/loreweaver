use sea_orm_migration::prelude::*;

use super::m20251126_000001_create_campaigns::Campaigns;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(Relationships::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Relationships::Id)
                            .string()
                            .not_null()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(Relationships::CampaignId)
                            .string()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Relationships::SourceType)
                            .string()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Relationships::SourceId)
                            .string()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Relationships::TargetType)
                            .string()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Relationships::TargetId)
                            .string()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Relationships::RelationshipType)
                            .string()
                            .not_null(),
                    )
                    .col(ColumnDef::new(Relationships::Description).text())
                    .col(
                        ColumnDef::new(Relationships::IsBidirectional)
                            .boolean()
                            .not_null()
                            .default(false),
                    )
                    .col(ColumnDef::new(Relationships::Strength).integer())
                    .col(
                        ColumnDef::new(Relationships::IsPublic)
                            .boolean()
                            .not_null()
                            .default(true),
                    )
                    .col(
                        ColumnDef::new(Relationships::CreatedAt)
                            .timestamp()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(Relationships::UpdatedAt)
                            .timestamp()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_relationships_campaign")
                            .from(Relationships::Table, Relationships::CampaignId)
                            .to(Campaigns::Table, Campaigns::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        // Index on campaign
        manager
            .create_index(
                Index::create()
                    .name("idx_relationships_campaign")
                    .table(Relationships::Table)
                    .col(Relationships::CampaignId)
                    .to_owned(),
            )
            .await?;

        // Index on source entity
        manager
            .create_index(
                Index::create()
                    .name("idx_relationships_source")
                    .table(Relationships::Table)
                    .col(Relationships::SourceType)
                    .col(Relationships::SourceId)
                    .to_owned(),
            )
            .await?;

        // Index on target entity
        manager
            .create_index(
                Index::create()
                    .name("idx_relationships_target")
                    .table(Relationships::Table)
                    .col(Relationships::TargetType)
                    .col(Relationships::TargetId)
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Relationships::Table).to_owned())
            .await
    }
}

/// Entity types: location, character, organization, quest, hero, item, event
/// Relationship types: rules, member_of, enemy_of, located_in, ally_of, etc.
/// Strength: -100 (hostile) to 100 (devoted)
#[derive(DeriveIden)]
pub enum Relationships {
    Table,
    Id,
    CampaignId,
    SourceType,
    SourceId,
    TargetType,
    TargetId,
    RelationshipType,
    Description,
    IsBidirectional,
    Strength,
    IsPublic,
    CreatedAt,
    UpdatedAt,
}
