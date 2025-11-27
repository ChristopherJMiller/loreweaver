#!/usr/bin/env bash
# Script to generate SeaORM entities from migrations
# Run this from inside `nix develop` shell

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TAURI_DIR="$(dirname "$SCRIPT_DIR")"
DEV_DB="$TAURI_DIR/dev.db"

echo "=== Loreweaver Entity Generator ==="
echo "Working directory: $TAURI_DIR"

# Remove old dev database if exists
if [ -f "$DEV_DB" ]; then
    echo "Removing old dev.db..."
    rm "$DEV_DB"
fi

# Run migrations to create fresh database
echo "Running migrations..."
cd "$TAURI_DIR"
DATABASE_URL="sqlite:$DEV_DB?mode=rwc" sea-orm-cli migrate up

# Generate entities
# Note: We ignore FTS5 virtual table and its shadow tables (they don't map to SeaORM entities)
echo "Generating entities..."
sea-orm-cli generate entity \
    -u "sqlite:$DEV_DB" \
    -o entity/src \
    --lib \
    --with-serde both \
    --date-time-crate chrono \
    --ignore-tables "search_index,search_index_config,search_index_content,search_index_data,search_index_docsize,search_index_idx,seaql_migrations"

# Add ts-rs derives to generated entities
echo "Adding ts-rs derives to entities..."

# Note: The generated entities need manual addition of ts-rs derives
# You can add these to each entity file:
# - Add `use ts_rs::TS;` at the top
# - Add `#[derive(TS)]` and `#[ts(export)]` to Model structs

echo ""
echo "=== Generation complete! ==="
echo ""
echo "Next steps:"
echo "1. Review generated entities in entity/src/"
echo "2. Add ts-rs derives to Model structs if needed:"
echo "   - Add 'use ts_rs::TS;' to imports"
echo "   - Add '#[derive(TS)]' and '#[ts(export)]' to Model"
echo "3. Run 'cargo check' to verify everything compiles"
echo ""
echo "Dev database location: $DEV_DB"
