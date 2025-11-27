use sea_orm_migration::prelude::*;

use super::m20251126_000012_create_tags::Tags;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(EntityTags::Table)
                    .if_not_exists()
                    .col(ColumnDef::new(EntityTags::TagId).string().not_null())
                    .col(ColumnDef::new(EntityTags::EntityType).string().not_null())
                    .col(ColumnDef::new(EntityTags::EntityId).string().not_null())
                    .primary_key(
                        Index::create()
                            .col(EntityTags::TagId)
                            .col(EntityTags::EntityType)
                            .col(EntityTags::EntityId),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_entity_tags_tag")
                            .from(EntityTags::Table, EntityTags::TagId)
                            .to(Tags::Table, Tags::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        // Index for looking up tags by entity
        manager
            .create_index(
                Index::create()
                    .name("idx_entity_tags_entity")
                    .table(EntityTags::Table)
                    .col(EntityTags::EntityType)
                    .col(EntityTags::EntityId)
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(EntityTags::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
pub enum EntityTags {
    Table,
    TagId,
    EntityType,
    EntityId,
}
