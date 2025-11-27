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
                    .table(TimelineEvents::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(TimelineEvents::Id)
                            .string()
                            .not_null()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(TimelineEvents::CampaignId)
                            .string()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(TimelineEvents::DateDisplay)
                            .string()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(TimelineEvents::SortOrder)
                            .big_integer()
                            .not_null()
                            .default(0),
                    )
                    .col(ColumnDef::new(TimelineEvents::Title).string().not_null())
                    .col(ColumnDef::new(TimelineEvents::Description).text())
                    .col(
                        ColumnDef::new(TimelineEvents::Significance)
                            .string()
                            .not_null()
                            .default("local"),
                    )
                    .col(
                        ColumnDef::new(TimelineEvents::IsPublic)
                            .boolean()
                            .not_null()
                            .default(true),
                    )
                    .col(
                        ColumnDef::new(TimelineEvents::CreatedAt)
                            .timestamp()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(TimelineEvents::UpdatedAt)
                            .timestamp()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_timeline_events_campaign")
                            .from(TimelineEvents::Table, TimelineEvents::CampaignId)
                            .to(Campaigns::Table, Campaigns::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_timeline_events_campaign")
                    .table(TimelineEvents::Table)
                    .col(TimelineEvents::CampaignId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_timeline_events_sort")
                    .table(TimelineEvents::Table)
                    .col(TimelineEvents::SortOrder)
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(TimelineEvents::Table).to_owned())
            .await
    }
}

/// Significance enum values: world, regional, local, personal
#[derive(DeriveIden)]
pub enum TimelineEvents {
    Table,
    Id,
    CampaignId,
    DateDisplay,
    SortOrder,
    Title,
    Description,
    Significance,
    IsPublic,
    CreatedAt,
    UpdatedAt,
}
