//! Validation for entity creation and updates.
//!
//! Uses the `validator` crate for declarative validation with custom
//! validators for enum fields.

use serde::Deserialize;
use validator::{Validate, ValidationError};

// ============ Allowed Values ============

pub const LOCATION_TYPES: &[&str] = &[
    "world",
    "continent",
    "region",
    "territory",
    "settlement",
    "district",
    "building",
    "room",
    "landmark",
    "wilderness",
];

pub const ORG_TYPES: &[&str] = &[
    "government",
    "guild",
    "religion",
    "military",
    "criminal",
    "mercantile",
    "academic",
    "secret_society",
    "family",
    "other",
];

pub const QUEST_STATUS: &[&str] = &[
    "planned",
    "available",
    "active",
    "completed",
    "failed",
    "abandoned",
];

pub const PLOT_TYPES: &[&str] = &["main", "secondary", "side", "background"];

// ============ Custom Validators ============

fn validate_location_type(value: &str) -> Result<(), ValidationError> {
    if LOCATION_TYPES.contains(&value) {
        Ok(())
    } else {
        let mut error = ValidationError::new("invalid_location_type");
        error.message = Some(format!("must be one of: {}", LOCATION_TYPES.join(", ")).into());
        Err(error)
    }
}

fn validate_org_type(value: &str) -> Result<(), ValidationError> {
    if ORG_TYPES.contains(&value) {
        Ok(())
    } else {
        let mut error = ValidationError::new("invalid_org_type");
        error.message = Some(format!("must be one of: {}", ORG_TYPES.join(", ")).into());
        Err(error)
    }
}

fn validate_quest_status(value: &str) -> Result<(), ValidationError> {
    if QUEST_STATUS.contains(&value) {
        Ok(())
    } else {
        let mut error = ValidationError::new("invalid_quest_status");
        error.message = Some(format!("must be one of: {}", QUEST_STATUS.join(", ")).into());
        Err(error)
    }
}

fn validate_plot_type(value: &str) -> Result<(), ValidationError> {
    if PLOT_TYPES.contains(&value) {
        Ok(())
    } else {
        let mut error = ValidationError::new("invalid_plot_type");
        error.message = Some(format!("must be one of: {}", PLOT_TYPES.join(", ")).into());
        Err(error)
    }
}

// ============ Input Structs ============

/// Input for creating a character
#[derive(Debug, Deserialize, Validate)]
pub struct CreateCharacterInput {
    #[validate(length(min = 1, max = 200, message = "name must be 1-200 characters"))]
    pub name: String,

    pub campaign_id: String,

    #[validate(length(max = 200, message = "lineage too long (max 200 chars)"))]
    pub lineage: Option<String>,

    #[validate(length(max = 200, message = "occupation too long (max 200 chars)"))]
    pub occupation: Option<String>,

    #[validate(length(max = 50000, message = "description too long"))]
    pub description: Option<String>,

    #[validate(length(max = 50000, message = "personality too long"))]
    pub personality: Option<String>,

    #[validate(length(max = 50000, message = "motivations too long"))]
    pub motivations: Option<String>,

    #[validate(length(max = 50000, message = "secrets too long"))]
    pub secrets: Option<String>,

    #[validate(length(max = 50000, message = "voice_notes too long"))]
    pub voice_notes: Option<String>,
}

/// Input for creating a location
#[derive(Debug, Deserialize, Validate)]
pub struct CreateLocationInput {
    #[validate(length(min = 1, max = 200, message = "name must be 1-200 characters"))]
    pub name: String,

    pub campaign_id: String,

    #[validate(custom(function = "validate_location_type"))]
    pub location_type: String,

    pub parent_id: Option<String>,

    #[validate(length(max = 50000, message = "description too long"))]
    pub description: Option<String>,
}

/// Input for creating an organization
#[derive(Debug, Deserialize, Validate)]
pub struct CreateOrganizationInput {
    #[validate(length(min = 1, max = 200, message = "name must be 1-200 characters"))]
    pub name: String,

    pub campaign_id: String,

    #[validate(custom(function = "validate_org_type"))]
    pub org_type: String,

    #[validate(length(max = 50000, message = "description too long"))]
    pub description: Option<String>,

    #[validate(length(max = 50000, message = "goals too long"))]
    pub goals: Option<String>,

    #[validate(length(max = 50000, message = "resources too long"))]
    pub resources: Option<String>,
}

/// Input for creating a quest
#[derive(Debug, Deserialize, Validate)]
pub struct CreateQuestInput {
    #[validate(length(min = 1, max = 200, message = "name must be 1-200 characters"))]
    pub name: String,

    pub campaign_id: String,

    #[validate(custom(function = "validate_plot_type"))]
    pub plot_type: String,

    #[validate(custom(function = "validate_quest_status"))]
    pub status: String,

    #[validate(length(max = 50000, message = "description too long"))]
    pub description: Option<String>,

    #[validate(length(max = 50000, message = "hook too long"))]
    pub hook: Option<String>,

    #[validate(length(max = 50000, message = "objectives too long"))]
    pub objectives: Option<String>,
}

// ============ Update Input Structs ============

/// Input for updating a character (all fields optional)
#[derive(Debug, Deserialize, Validate)]
pub struct UpdateCharacterInput {
    #[validate(length(min = 1, max = 200, message = "name must be 1-200 characters"))]
    pub name: Option<String>,

    #[validate(length(max = 200, message = "lineage too long (max 200 chars)"))]
    pub lineage: Option<String>,

    #[validate(length(max = 200, message = "occupation too long (max 200 chars)"))]
    pub occupation: Option<String>,

    #[validate(length(max = 50000, message = "description too long"))]
    pub description: Option<String>,

    #[validate(length(max = 50000, message = "personality too long"))]
    pub personality: Option<String>,

    #[validate(length(max = 50000, message = "motivations too long"))]
    pub motivations: Option<String>,

    #[validate(length(max = 50000, message = "secrets too long"))]
    pub secrets: Option<String>,

    #[validate(length(max = 50000, message = "voice_notes too long"))]
    pub voice_notes: Option<String>,
}

/// Input for updating a location
#[derive(Debug, Deserialize, Validate)]
pub struct UpdateLocationInput {
    #[validate(length(min = 1, max = 200, message = "name must be 1-200 characters"))]
    pub name: Option<String>,

    pub location_type: Option<String>,

    pub parent_id: Option<String>,

    #[validate(length(max = 50000, message = "description too long"))]
    pub description: Option<String>,

    pub detail_level: Option<i32>,

    #[validate(length(max = 50000, message = "gm_notes too long"))]
    pub gm_notes: Option<String>,
}

impl UpdateLocationInput {
    /// Validate the location type if provided
    pub fn validate_location_type(&self) -> Result<(), validator::ValidationErrors> {
        if let Some(ref lt) = self.location_type {
            if let Err(e) = validate_location_type(lt) {
                let mut errors = validator::ValidationErrors::new();
                errors.add("location_type", e);
                return Err(errors);
            }
        }
        Ok(())
    }
}

/// Input for updating an organization
#[derive(Debug, Deserialize, Validate)]
pub struct UpdateOrganizationInput {
    #[validate(length(min = 1, max = 200, message = "name must be 1-200 characters"))]
    pub name: Option<String>,

    pub org_type: Option<String>,

    #[validate(length(max = 50000, message = "description too long"))]
    pub description: Option<String>,

    #[validate(length(max = 50000, message = "goals too long"))]
    pub goals: Option<String>,

    #[validate(length(max = 50000, message = "resources too long"))]
    pub resources: Option<String>,

    #[validate(length(max = 50000, message = "reputation too long"))]
    pub reputation: Option<String>,

    #[validate(length(max = 50000, message = "secrets too long"))]
    pub secrets: Option<String>,
}

impl UpdateOrganizationInput {
    /// Validate the org type if provided
    pub fn validate_org_type(&self) -> Result<(), validator::ValidationErrors> {
        if let Some(ref ot) = self.org_type {
            if let Err(e) = validate_org_type(ot) {
                let mut errors = validator::ValidationErrors::new();
                errors.add("org_type", e);
                return Err(errors);
            }
        }
        Ok(())
    }
}

/// Input for updating a quest
#[derive(Debug, Deserialize, Validate)]
pub struct UpdateQuestInput {
    #[validate(length(min = 1, max = 200, message = "name must be 1-200 characters"))]
    pub name: Option<String>,

    pub status: Option<String>,
    pub plot_type: Option<String>,

    #[validate(length(max = 50000, message = "description too long"))]
    pub description: Option<String>,

    #[validate(length(max = 50000, message = "hook too long"))]
    pub hook: Option<String>,

    #[validate(length(max = 50000, message = "objectives too long"))]
    pub objectives: Option<String>,

    #[validate(length(max = 50000, message = "complications too long"))]
    pub complications: Option<String>,

    #[validate(length(max = 50000, message = "resolution too long"))]
    pub resolution: Option<String>,

    #[validate(length(max = 50000, message = "reward too long"))]
    pub reward: Option<String>,
}

impl UpdateQuestInput {
    /// Validate the status and plot_type if provided
    pub fn validate_enums(&self) -> Result<(), validator::ValidationErrors> {
        let mut errors = validator::ValidationErrors::new();

        if let Some(ref s) = self.status {
            if let Err(e) = validate_quest_status(s) {
                errors.add("status", e);
            }
        }

        if let Some(ref pt) = self.plot_type {
            if let Err(e) = validate_plot_type(pt) {
                errors.add("plot_type", e);
            }
        }

        if errors.is_empty() {
            Ok(())
        } else {
            Err(errors)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_character_valid() {
        let input = CreateCharacterInput {
            name: "Test Character".to_string(),
            campaign_id: "test-campaign".to_string(),
            lineage: Some("Human".to_string()),
            occupation: None,
            description: None,
            personality: None,
            motivations: None,
            secrets: None,
            voice_notes: None,
        };
        assert!(input.validate().is_ok());
    }

    #[test]
    fn test_create_character_empty_name() {
        let input = CreateCharacterInput {
            name: "".to_string(),
            campaign_id: "test-campaign".to_string(),
            lineage: None,
            occupation: None,
            description: None,
            personality: None,
            motivations: None,
            secrets: None,
            voice_notes: None,
        };
        assert!(input.validate().is_err());
    }

    #[test]
    fn test_create_location_valid() {
        let input = CreateLocationInput {
            name: "Test City".to_string(),
            campaign_id: "test-campaign".to_string(),
            location_type: "settlement".to_string(),
            parent_id: None,
            description: None,
        };
        assert!(input.validate().is_ok());
    }

    #[test]
    fn test_create_location_invalid_type() {
        let input = CreateLocationInput {
            name: "Test Place".to_string(),
            campaign_id: "test-campaign".to_string(),
            location_type: "invalid_type".to_string(),
            parent_id: None,
            description: None,
        };
        assert!(input.validate().is_err());
    }

    #[test]
    fn test_create_organization_valid() {
        let input = CreateOrganizationInput {
            name: "Test Guild".to_string(),
            campaign_id: "test-campaign".to_string(),
            org_type: "guild".to_string(),
            description: None,
            goals: None,
            resources: None,
        };
        assert!(input.validate().is_ok());
    }

    #[test]
    fn test_create_quest_valid() {
        let input = CreateQuestInput {
            name: "Test Quest".to_string(),
            campaign_id: "test-campaign".to_string(),
            plot_type: "side".to_string(),
            status: "planned".to_string(),
            description: None,
            hook: None,
            objectives: None,
        };
        assert!(input.validate().is_ok());
    }

    #[test]
    fn test_create_quest_invalid_status() {
        let input = CreateQuestInput {
            name: "Test Quest".to_string(),
            campaign_id: "test-campaign".to_string(),
            plot_type: "side".to_string(),
            status: "invalid_status".to_string(),
            description: None,
            hook: None,
            objectives: None,
        };
        assert!(input.validate().is_err());
    }
}
