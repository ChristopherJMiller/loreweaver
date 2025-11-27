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
