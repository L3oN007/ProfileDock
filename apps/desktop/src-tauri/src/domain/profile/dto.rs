use std::path::Path;

use serde::{Deserialize, Serialize};

use crate::error::AppError;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProfileDto {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub state: String,
    pub is_archived: bool,
    pub pid: Option<u32>,
    pub instance_id: Option<String>,
    pub last_opened_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BrowserInstanceDto {
    pub id: String,
    pub profile_id: String,
    pub pid: Option<u32>,
    pub state: String,
    pub started_at: Option<String>,
    pub stopped_at: Option<String>,
    pub exit_code: Option<i32>,
    pub error_message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProfileEventDto {
    pub id: i64,
    pub profile_id: String,
    pub event_type: String,
    pub metadata_json: Option<String>,
    pub created_at: String,
}

pub fn validate_profile_id(id: &str) -> Result<(), AppError> {
    if uuid::Uuid::parse_str(id).is_err() {
        return Err(AppError::InvalidConfiguration("invalid profile id".into()));
    }

    if id.contains("..") || Path::new(id).is_absolute() {
        return Err(AppError::InvalidConfiguration(
            "invalid profile id path".into(),
        ));
    }

    Ok(())
}
