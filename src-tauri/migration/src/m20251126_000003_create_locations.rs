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
                    .table(Locations::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Locations::Id)
                            .string()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Locations::CampaignId).string().not_null())
                    .col(ColumnDef::new(Locations::ParentId).string())
                    .col(ColumnDef::new(Locations::Name).string().not_null())
                    .col(
                        ColumnDef::new(Locations::LocationType)
                            .string()
                            .not_null()
                            .default("settlement"),
                    )
                    .col(ColumnDef::new(Locations::Description).text())
                    .col(
                        ColumnDef::new(Locations::DetailLevel)
                            .integer()
                            .not_null()
                            .default(0),
                    )
                    .col(ColumnDef::new(Locations::GmNotes).text())
                    .col(
                        ColumnDef::new(Locations::CreatedAt)
                            .timestamp()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(Locations::UpdatedAt)
                            .timestamp()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_locations_campaign")
                            .from(Locations::Table, Locations::CampaignId)
                            .to(Campaigns::Table, Campaigns::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_locations_parent")
                            .from(Locations::Table, Locations::ParentId)
                            .to(Locations::Table, Locations::Id)
                            .on_delete(ForeignKeyAction::SetNull),
                    )
                    .to_owned(),
            )
            .await?;

        // Create indexes
        manager
            .create_index(
                Index::create()
                    .name("idx_locations_campaign")
                    .table(Locations::Table)
                    .col(Locations::CampaignId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_locations_parent")
                    .table(Locations::Table)
                    .col(Locations::ParentId)
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Locations::Table).to_owned())
            .await
    }
}

/// Location types enum values:
/// world, continent, region, territory, settlement, district, building, room, landmark, wilderness
#[derive(DeriveIden)]
pub enum Locations {
    Table,
    Id,
    CampaignId,
    ParentId,
    Name,
    LocationType,
    Description,
    DetailLevel,
    GmNotes,
    CreatedAt,
    UpdatedAt,
}
