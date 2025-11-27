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
                    .table(Quests::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Quests::Id)
                            .string()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Quests::CampaignId).string().not_null())
                    .col(ColumnDef::new(Quests::Name).string().not_null())
                    .col(
                        ColumnDef::new(Quests::Status)
                            .string()
                            .not_null()
                            .default("planned"),
                    )
                    .col(
                        ColumnDef::new(Quests::PlotType)
                            .string()
                            .not_null()
                            .default("side"),
                    )
                    .col(ColumnDef::new(Quests::Description).text())
                    .col(ColumnDef::new(Quests::Hook).text())
                    .col(ColumnDef::new(Quests::Objectives).text())
                    .col(ColumnDef::new(Quests::Complications).text())
                    .col(ColumnDef::new(Quests::Resolution).text())
                    .col(ColumnDef::new(Quests::Reward).text())
                    .col(
                        ColumnDef::new(Quests::CreatedAt)
                            .timestamp()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(Quests::UpdatedAt)
                            .timestamp()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_quests_campaign")
                            .from(Quests::Table, Quests::CampaignId)
                            .to(Campaigns::Table, Campaigns::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_quests_campaign")
                    .table(Quests::Table)
                    .col(Quests::CampaignId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_quests_status")
                    .table(Quests::Table)
                    .col(Quests::Status)
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Quests::Table).to_owned())
            .await
    }
}

/// Quest status enum values: planned, available, active, completed, failed, abandoned
/// Plot type enum values: main, secondary, side, background
#[derive(DeriveIden)]
pub enum Quests {
    Table,
    Id,
    CampaignId,
    Name,
    Status,
    PlotType,
    Description,
    Hook,
    Objectives,
    Complications,
    Resolution,
    Reward,
    CreatedAt,
    UpdatedAt,
}
