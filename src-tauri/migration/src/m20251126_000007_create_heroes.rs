use sea_orm_migration::prelude::*;

use super::m20251126_000001_create_campaigns::Campaigns;
use super::m20251126_000002_create_players::Players;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(Heroes::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Heroes::Id)
                            .string()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Heroes::CampaignId).string().not_null())
                    .col(ColumnDef::new(Heroes::PlayerId).string())
                    .col(ColumnDef::new(Heroes::Name).string().not_null())
                    .col(ColumnDef::new(Heroes::Lineage).string())
                    .col(ColumnDef::new(Heroes::Classes).string())
                    .col(ColumnDef::new(Heroes::Description).text())
                    .col(ColumnDef::new(Heroes::Backstory).text())
                    .col(ColumnDef::new(Heroes::Goals).text())
                    .col(ColumnDef::new(Heroes::Bonds).text())
                    .col(
                        ColumnDef::new(Heroes::IsActive)
                            .boolean()
                            .not_null()
                            .default(true),
                    )
                    .col(
                        ColumnDef::new(Heroes::CreatedAt)
                            .timestamp()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(Heroes::UpdatedAt)
                            .timestamp()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_heroes_campaign")
                            .from(Heroes::Table, Heroes::CampaignId)
                            .to(Campaigns::Table, Campaigns::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_heroes_player")
                            .from(Heroes::Table, Heroes::PlayerId)
                            .to(Players::Table, Players::Id)
                            .on_delete(ForeignKeyAction::SetNull),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_heroes_campaign")
                    .table(Heroes::Table)
                    .col(Heroes::CampaignId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_heroes_player")
                    .table(Heroes::Table)
                    .col(Heroes::PlayerId)
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Heroes::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
pub enum Heroes {
    Table,
    Id,
    CampaignId,
    PlayerId,
    Name,
    Lineage,
    Classes,
    Description,
    Backstory,
    Goals,
    Bonds,
    IsActive,
    CreatedAt,
    UpdatedAt,
}
