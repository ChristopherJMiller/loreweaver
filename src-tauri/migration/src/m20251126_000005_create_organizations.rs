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
                    .table(Organizations::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Organizations::Id)
                            .string()
                            .not_null()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(Organizations::CampaignId)
                            .string()
                            .not_null(),
                    )
                    .col(ColumnDef::new(Organizations::Name).string().not_null())
                    .col(
                        ColumnDef::new(Organizations::OrgType)
                            .string()
                            .not_null()
                            .default("other"),
                    )
                    .col(ColumnDef::new(Organizations::Description).text())
                    .col(ColumnDef::new(Organizations::Goals).text())
                    .col(ColumnDef::new(Organizations::Resources).text())
                    .col(ColumnDef::new(Organizations::Reputation).text())
                    .col(ColumnDef::new(Organizations::Secrets).text())
                    .col(
                        ColumnDef::new(Organizations::IsActive)
                            .boolean()
                            .not_null()
                            .default(true),
                    )
                    .col(
                        ColumnDef::new(Organizations::CreatedAt)
                            .timestamp()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(Organizations::UpdatedAt)
                            .timestamp()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_organizations_campaign")
                            .from(Organizations::Table, Organizations::CampaignId)
                            .to(Campaigns::Table, Campaigns::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_organizations_campaign")
                    .table(Organizations::Table)
                    .col(Organizations::CampaignId)
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Organizations::Table).to_owned())
            .await
    }
}

/// Org types enum values:
/// government, guild, religion, military, criminal, mercantile, academic, secret_society, family, other
#[derive(DeriveIden)]
pub enum Organizations {
    Table,
    Id,
    CampaignId,
    Name,
    OrgType,
    Description,
    Goals,
    Resources,
    Reputation,
    Secrets,
    IsActive,
    CreatedAt,
    UpdatedAt,
}
