use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(Campaigns::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Campaigns::Id)
                            .string()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Campaigns::Name).string().not_null())
                    .col(ColumnDef::new(Campaigns::Description).text())
                    .col(ColumnDef::new(Campaigns::System).string())
                    .col(ColumnDef::new(Campaigns::SettingsJson).text())
                    .col(
                        ColumnDef::new(Campaigns::CreatedAt)
                            .timestamp()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(Campaigns::UpdatedAt)
                            .timestamp()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Campaigns::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
pub enum Campaigns {
    Table,
    Id,
    Name,
    Description,
    System,
    SettingsJson,
    CreatedAt,
    UpdatedAt,
}
