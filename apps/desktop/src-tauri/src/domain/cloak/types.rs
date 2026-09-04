use std::path::PathBuf;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use crate::domain::proxy::ResolvedBrowserProxy;
use crate::domain::profile::{DownloadMode, WindowMode};

pub const CLOAK_CONFIG_VERSION: u32 = 1;

pub const STARTUP_URL_MAX_COUNT: usize = 20;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CloakInstallationDto {
    pub executable: Option<String>,
    pub version: Option<String>,
    pub valid: bool,
    pub compatible: bool,
    pub last_checked_at: String,
    pub source: Option<String>,
    pub root_dir: Option<String>,
    pub cache_dir: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiscoveredCloakInstallationDto {
    pub executable: String,
    pub root_dir: String,
    pub version: Option<String>,
    pub source: String,
    pub valid: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CloakValidationResult {
    pub valid: bool,
    pub compatible: bool,
    pub executable: Option<String>,
    pub version: Option<String>,
    pub message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CloakCapabilities {
    pub startup_urls: bool,
    pub custom_download_dir: bool,
    pub proxy: bool,
    pub proxy_auth: bool,
    pub extension_loading: bool,
    pub window_configuration: bool,
}

impl Default for CloakCapabilities {
    fn default() -> Self {
        Self {
            startup_urls: true,
            custom_download_dir: true,
            proxy: true,
            proxy_auth: true,
            extension_loading: false,
            window_configuration: true,
        }
    }
}

#[derive(Debug, Clone)]
pub struct CloakInstallation {
    pub executable: PathBuf,
    pub version: Option<String>,
    pub valid: bool,
    pub last_checked_at: DateTime<Utc>,
}

#[derive(Debug, Clone)]
pub struct CloakLaunchConfig {
    pub profile_id: String,
    pub user_data_dir: PathBuf,
    pub download_dir: PathBuf,
    pub startup_urls: Vec<String>,
    pub proxy: Option<ResolvedBrowserProxy>,
    pub proxy_id: Option<String>,
    pub window_mode: WindowMode,
    pub restore_session: bool,
    pub cloak_version: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigSnapshot {
    pub config_version: u32,
    pub window_mode: String,
    pub startup_url_count: usize,
    pub download_mode: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub proxy_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cloak_version: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cloak_runtime_id: Option<String>,
    pub restore_session: bool,
}

impl ConfigSnapshot {
    pub fn from_launch_config(
        config: &CloakLaunchConfig,
        download_mode: &DownloadMode,
        proxy_id: Option<String>,
        cloak_runtime_id: Option<String>,
    ) -> Self {
        Self {
            config_version: CLOAK_CONFIG_VERSION,
            window_mode: config.window_mode.as_str().to_string(),
            startup_url_count: config.startup_urls.len(),
            download_mode: download_mode.as_str().to_string(),
            proxy_id,
            cloak_version: config.cloak_version.clone(),
            cloak_runtime_id,
            restore_session: config.restore_session,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PreflightWarning {
    pub code: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PreflightResult {
    pub ready: bool,
    pub warnings: Vec<PreflightWarning>,
}
