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
                    .table(Players::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Players::Id)
                            .string()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Players::CampaignId).string().not_null())
                    .col(ColumnDef::new(Players::Name).string().not_null())
                    .col(ColumnDef::new(Players::Preferences).text())
                    .col(ColumnDef::new(Players::Boundaries).text())
                    .col(ColumnDef::new(Players::Notes).text())
                    .col(
                        ColumnDef::new(Players::CreatedAt)
                            .timestamp()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(Players::UpdatedAt)
                            .timestamp()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_players_campaign")
                            .from(Players::Table, Players::CampaignId)
                            .to(Campaigns::Table, Campaigns::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        // Create index on campaign_id
        manager
            .create_index(
                Index::create()
                    .name("idx_players_campaign")
                    .table(Players::Table)
                    .col(Players::CampaignId)
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Players::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
pub enum Players {
    Table,
    Id,
    CampaignId,
    Name,
    Preferences,
    Boundaries,
    Notes,
    CreatedAt,
    UpdatedAt,
}
