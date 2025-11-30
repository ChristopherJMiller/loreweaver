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
                    .table(AiConversations::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(AiConversations::Id)
                            .string()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(AiConversations::CampaignId).string().not_null())
                    .col(ColumnDef::new(AiConversations::ContextType).string().not_null())
                    .col(
                        ColumnDef::new(AiConversations::TotalInputTokens)
                            .integer()
                            .not_null()
                            .default(0),
                    )
                    .col(
                        ColumnDef::new(AiConversations::TotalOutputTokens)
                            .integer()
                            .not_null()
                            .default(0),
                    )
                    .col(
                        ColumnDef::new(AiConversations::TotalCacheReadTokens)
                            .integer()
                            .not_null()
                            .default(0),
                    )
                    .col(
                        ColumnDef::new(AiConversations::TotalCacheCreationTokens)
                            .integer()
                            .not_null()
                            .default(0),
                    )
                    .col(
                        ColumnDef::new(AiConversations::CreatedAt)
                            .timestamp()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(AiConversations::UpdatedAt)
                            .timestamp()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_ai_conversations_campaign")
                            .from(AiConversations::Table, AiConversations::CampaignId)
                            .to(Campaigns::Table, Campaigns::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        // Create unique constraint for one conversation per context per campaign
        manager
            .create_index(
                Index::create()
                    .unique()
                    .name("idx_ai_conversations_campaign_context")
                    .table(AiConversations::Table)
                    .col(AiConversations::CampaignId)
                    .col(AiConversations::ContextType)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_ai_conversations_campaign")
                    .table(AiConversations::Table)
                    .col(AiConversations::CampaignId)
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(AiConversations::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
pub enum AiConversations {
    Table,
    Id,
    CampaignId,
    ContextType,
    TotalInputTokens,
    TotalOutputTokens,
    TotalCacheReadTokens,
    TotalCacheCreationTokens,
    CreatedAt,
    UpdatedAt,
}
