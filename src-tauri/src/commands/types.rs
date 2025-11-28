use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// Input for listing entities by campaign
#[derive(Debug, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/types/bindings/")]
pub struct ListByCampaignInput {
    pub campaign_id: String,
}

/// Input for getting location children
#[derive(Debug, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/types/bindings/")]
pub struct GetChildrenInput {
    pub parent_id: String,
}

/// Input for entity-scoped queries (relationships, tags)
#[derive(Debug, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/types/bindings/")]
pub struct EntityScopedInput {
    pub entity_type: String,
    pub entity_id: String,
}

/// Input for search
#[derive(Debug, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/types/bindings/")]
pub struct SearchInput {
    pub campaign_id: String,
    pub query: String,
    pub entity_types: Option<Vec<String>>,
    pub limit: Option<i32>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn export_bindings() {
        ListByCampaignInput::export_all().unwrap();
        GetChildrenInput::export_all().unwrap();
        EntityScopedInput::export_all().unwrap();
        SearchInput::export_all().unwrap();
    }
}
