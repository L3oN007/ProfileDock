use std::path::Path;

use serde::{Deserialize, Serialize};

use crate::error::AppError;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProfileDto {
    pub id: String,
    pub display_id: Option<String>,
    pub name: String,
    pub description: Option<String>,
    pub group_id: Option<String>,
    pub group_name: Option<String>,
    pub tags: Vec<String>,
    pub remark: Option<String>,
    pub notes: Option<String>,
    pub platform_label: Option<String>,
    pub state: String,
    pub is_archived: bool,
    pub pid: Option<u32>,
    pub instance_id: Option<String>,
    pub proxy_id: Option<String>,
    pub proxy_name: Option<String>,
    pub last_opened_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProfileListQuery {
    pub search: Option<String>,
    pub group_id: Option<String>,
    pub tag_ids: Option<Vec<String>>,
    pub status: Option<String>,
    pub proxy_id: Option<String>,
    pub sort: Option<String>,
    pub page: Option<u32>,
    pub page_size: Option<u32>,
    pub include_archived: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProfileListPage {
    pub items: Vec<ProfileDto>,
    pub total: u64,
    pub page: u32,
    pub page_size: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateProfileFullInput {
    pub name: String,
    pub description: Option<String>,
    pub group_id: Option<String>,
    pub tags: Option<Vec<String>>,
    pub remark: Option<String>,
    pub notes: Option<String>,
    pub platform_label: Option<String>,
    pub proxy_mode: Option<String>,
    pub proxy_id: Option<String>,
    pub custom_proxy: Option<crate::domain::proxy::CreateProxyInput>,
    pub browser: Option<CreateProfileBrowserInput>,
    pub device: Option<crate::domain::device::CreateProfileDeviceInput>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateProfileBrowserInput {
    pub startup_urls: Option<Vec<String>>,
    pub download_mode: Option<String>,
    pub custom_download_dir: Option<String>,
    pub window_mode: Option<String>,
    pub restore_session: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateProfileFullInput {
    pub name: Option<String>,
    pub description: Option<String>,
    pub group_id: Option<Option<String>>,
    pub tags: Option<Vec<String>>,
    pub remark: Option<String>,
    pub notes: Option<String>,
    pub platform_label: Option<String>,
    pub proxy_mode: Option<String>,
    pub proxy_id: Option<String>,
    pub browser: Option<CreateProfileBrowserInput>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BulkProfileUpdateInput {
    pub profile_ids: Vec<String>,
    pub group_id: Option<Option<String>>,
    pub add_tags: Option<Vec<String>>,
    pub remove_tags: Option<Vec<String>>,
    pub proxy_id: Option<Option<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DuplicateProfileInput {
    pub name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProfileStorageDto {
    pub browser_data_bytes: u64,
    pub cache_bytes: u64,
    pub downloads_bytes: u64,
    pub total_bytes: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CookieTransferResult {
    pub path: String,
    pub count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActivityEventDto {
    pub id: i64,
    pub profile_id: String,
    pub profile_name: String,
    pub display_id: Option<String>,
    pub event_type: String,
    pub metadata_json: Option<String>,
    pub created_at: String,
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
