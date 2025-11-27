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
# ts-rs derives are added automatically via --model-extra-derives and --model-extra-attributes
echo "Generating entities with ts-rs derives..."
sea-orm-cli generate entity \
    -u "sqlite:$DEV_DB" \
    -o entity/src \
    --lib \
    --with-serde both \
    --date-time-crate chrono \
    --model-extra-derives 'ts_rs::TS' \
    --model-extra-attributes 'ts(export)' \
    --ignore-tables "search_index,search_index_config,search_index_content,search_index_data,search_index_docsize,search_index_idx,seaql_migrations"

# Add ts(rename) attributes to give each Model a unique TypeScript name
# This is needed because all SeaORM entities have "struct Model" which would conflict
echo "Adding ts(rename) attributes to entities..."
for entity_file in entity/src/*.rs; do
    # Skip non-entity files
    filename=$(basename "$entity_file" .rs)
    if [[ "$filename" == "lib" || "$filename" == "prelude" || "$filename" == "mod" || "$filename" == "export" ]]; then
        continue
    fi

    # Convert snake_case filename to PascalCase for TypeScript type name
    # e.g., timeline_events -> TimelineEvents
    ts_name=$(echo "$filename" | sed -r 's/(^|_)([a-z])/\U\2/g')

    # Add #[ts(rename = "TypeName")] before #[ts(export)]
    sed -i "s/#\[ts(export)\]/#[ts(rename = \"$ts_name\")]\n#[ts(export)]/" "$entity_file"
done

# Create export.rs module for TypeScript binding generation
echo "Creating export.rs module..."
cat > entity/src/export.rs << 'EXPORT_EOF'
//! TypeScript type export tests
//! Run with: cargo test --package entity export_bindings -- --ignored
//! Types will be exported to the directory specified by TS_RS_EXPORT_DIR
//!
//! This test is marked #[ignore] so it doesn't run during normal CI test runs.
//! The generate-entities.sh script runs it explicitly to generate bindings.

#[cfg(test)]
mod tests {
    use ts_rs::TS;

    #[test]
    #[ignore] // Only run when explicitly called (e.g., by generate-entities.sh)
    fn export_bindings() {
        // Export all entity models to TypeScript
        crate::campaigns::Model::export_all().unwrap();
        crate::characters::Model::export_all().unwrap();
        crate::entity_tags::Model::export_all().unwrap();
        crate::heroes::Model::export_all().unwrap();
        crate::locations::Model::export_all().unwrap();
        crate::organizations::Model::export_all().unwrap();
        crate::players::Model::export_all().unwrap();
        crate::quests::Model::export_all().unwrap();
        crate::relationships::Model::export_all().unwrap();
        crate::secrets::Model::export_all().unwrap();
        crate::sessions::Model::export_all().unwrap();
        crate::tags::Model::export_all().unwrap();
        crate::timeline_events::Model::export_all().unwrap();
    }
}
EXPORT_EOF

# Append export module to lib.rs (it gets overwritten by sea-orm-cli)
echo "Adding export module to lib.rs..."
echo "" >> entity/src/lib.rs
echo "mod export;" >> entity/src/lib.rs

# Generate TypeScript bindings
BINDINGS_DIR="$TAURI_DIR/../src/types/bindings"
mkdir -p "$BINDINGS_DIR"

echo "Generating TypeScript bindings to $BINDINGS_DIR..."
TS_RS_EXPORT_DIR="$BINDINGS_DIR" cargo test --package entity export_bindings -- --ignored

echo ""
echo "=== Generation complete! ==="
echo ""
echo "Generated files:"
echo "- Rust entities: entity/src/"
echo "- TypeScript bindings: src/types/bindings/"
echo ""
echo "Dev database location: $DEV_DB"
