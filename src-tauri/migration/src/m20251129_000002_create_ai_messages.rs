use sea_orm_migration::prelude::*;

use super::m20251129_000001_create_ai_conversations::AiConversations;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(AiMessages::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(AiMessages::Id)
                            .string()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(AiMessages::ConversationId).string().not_null())
                    .col(ColumnDef::new(AiMessages::Role).string().not_null())
                    .col(ColumnDef::new(AiMessages::Content).text().not_null())
                    .col(ColumnDef::new(AiMessages::ToolName).string())
                    .col(ColumnDef::new(AiMessages::ToolInputJson).text())
                    .col(ColumnDef::new(AiMessages::ToolDataJson).text())
                    .col(ColumnDef::new(AiMessages::ProposalJson).text())
                    .col(ColumnDef::new(AiMessages::MessageOrder).integer().not_null())
                    .col(
                        ColumnDef::new(AiMessages::CreatedAt)
                            .timestamp()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_ai_messages_conversation")
                            .from(AiMessages::Table, AiMessages::ConversationId)
                            .to(AiConversations::Table, AiConversations::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_ai_messages_conversation")
                    .table(AiMessages::Table)
                    .col(AiMessages::ConversationId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_ai_messages_order")
                    .table(AiMessages::Table)
                    .col(AiMessages::ConversationId)
                    .col(AiMessages::MessageOrder)
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(AiMessages::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
pub enum AiMessages {
    Table,
    Id,
    ConversationId,
    Role,
    Content,
    ToolName,
    ToolInputJson,
    ToolDataJson,
    ProposalJson,
    MessageOrder,
    CreatedAt,
}
