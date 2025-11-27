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
                    .table(Sessions::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Sessions::Id)
                            .string()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Sessions::CampaignId).string().not_null())
                    .col(
                        ColumnDef::new(Sessions::SessionNumber)
                            .integer()
                            .not_null(),
                    )
                    .col(ColumnDef::new(Sessions::Date).date())
                    .col(ColumnDef::new(Sessions::Title).string())
                    .col(ColumnDef::new(Sessions::PlannedContent).text())
                    .col(ColumnDef::new(Sessions::Notes).text())
                    .col(ColumnDef::new(Sessions::Summary).text())
                    .col(ColumnDef::new(Sessions::Highlights).text())
                    .col(
                        ColumnDef::new(Sessions::CreatedAt)
                            .timestamp()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(Sessions::UpdatedAt)
                            .timestamp()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_sessions_campaign")
                            .from(Sessions::Table, Sessions::CampaignId)
                            .to(Campaigns::Table, Campaigns::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_sessions_campaign")
                    .table(Sessions::Table)
                    .col(Sessions::CampaignId)
                    .to_owned(),
            )
            .await?;

        // Unique constraint on campaign + session number
        manager
            .create_index(
                Index::create()
                    .name("idx_sessions_campaign_number")
                    .table(Sessions::Table)
                    .col(Sessions::CampaignId)
                    .col(Sessions::SessionNumber)
                    .unique()
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Sessions::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
pub enum Sessions {
    Table,
    Id,
    CampaignId,
    SessionNumber,
    Date,
    Title,
    PlannedContent,
    Notes,
    Summary,
    Highlights,
    CreatedAt,
    UpdatedAt,
}
