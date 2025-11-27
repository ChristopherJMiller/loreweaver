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
                    .table(Characters::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Characters::Id)
                            .string()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Characters::CampaignId).string().not_null())
                    .col(ColumnDef::new(Characters::Name).string().not_null())
                    .col(ColumnDef::new(Characters::Lineage).string())
                    .col(ColumnDef::new(Characters::Occupation).string())
                    .col(
                        ColumnDef::new(Characters::IsAlive)
                            .boolean()
                            .not_null()
                            .default(true),
                    )
                    .col(ColumnDef::new(Characters::Description).text())
                    .col(ColumnDef::new(Characters::Personality).text())
                    .col(ColumnDef::new(Characters::Motivations).text())
                    .col(ColumnDef::new(Characters::Secrets).text())
                    .col(ColumnDef::new(Characters::VoiceNotes).text())
                    .col(ColumnDef::new(Characters::StatBlockJson).text())
                    .col(
                        ColumnDef::new(Characters::CreatedAt)
                            .timestamp()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(Characters::UpdatedAt)
                            .timestamp()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_characters_campaign")
                            .from(Characters::Table, Characters::CampaignId)
                            .to(Campaigns::Table, Campaigns::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_characters_campaign")
                    .table(Characters::Table)
                    .col(Characters::CampaignId)
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Characters::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
pub enum Characters {
    Table,
    Id,
    CampaignId,
    Name,
    Lineage,
    Occupation,
    IsAlive,
    Description,
    Personality,
    Motivations,
    Secrets,
    VoiceNotes,
    StatBlockJson,
    CreatedAt,
    UpdatedAt,
}
