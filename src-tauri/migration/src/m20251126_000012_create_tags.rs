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
                    .table(Tags::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Tags::Id)
                            .string()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Tags::CampaignId).string().not_null())
                    .col(ColumnDef::new(Tags::Name).string().not_null())
                    .col(ColumnDef::new(Tags::Color).string())
                    .col(
                        ColumnDef::new(Tags::CreatedAt)
                            .timestamp()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_tags_campaign")
                            .from(Tags::Table, Tags::CampaignId)
                            .to(Campaigns::Table, Campaigns::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_tags_campaign")
                    .table(Tags::Table)
                    .col(Tags::CampaignId)
                    .to_owned(),
            )
            .await?;

        // Unique tag name per campaign
        manager
            .create_index(
                Index::create()
                    .name("idx_tags_campaign_name")
                    .table(Tags::Table)
                    .col(Tags::CampaignId)
                    .col(Tags::Name)
                    .unique()
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Tags::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
pub enum Tags {
    Table,
    Id,
    CampaignId,
    Name,
    Color,
    CreatedAt,
}
