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
                    .table(Secrets::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Secrets::Id)
                            .string()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Secrets::CampaignId).string().not_null())
                    .col(ColumnDef::new(Secrets::Title).string().not_null())
                    .col(ColumnDef::new(Secrets::Content).text().not_null())
                    .col(ColumnDef::new(Secrets::RelatedEntityType).string())
                    .col(ColumnDef::new(Secrets::RelatedEntityId).string())
                    .col(ColumnDef::new(Secrets::KnownBy).text())
                    .col(
                        ColumnDef::new(Secrets::Revealed)
                            .boolean()
                            .not_null()
                            .default(false),
                    )
                    .col(ColumnDef::new(Secrets::RevealedInSession).integer())
                    .col(
                        ColumnDef::new(Secrets::CreatedAt)
                            .timestamp()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(Secrets::UpdatedAt)
                            .timestamp()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_secrets_campaign")
                            .from(Secrets::Table, Secrets::CampaignId)
                            .to(Campaigns::Table, Campaigns::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_secrets_campaign")
                    .table(Secrets::Table)
                    .col(Secrets::CampaignId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_secrets_related_entity")
                    .table(Secrets::Table)
                    .col(Secrets::RelatedEntityType)
                    .col(Secrets::RelatedEntityId)
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Secrets::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
pub enum Secrets {
    Table,
    Id,
    CampaignId,
    Title,
    Content,
    RelatedEntityType,
    RelatedEntityId,
    KnownBy,
    Revealed,
    RevealedInSession,
    CreatedAt,
    UpdatedAt,
}
