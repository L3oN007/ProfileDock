use std::path::PathBuf;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use crate::domain::proxy::ResolvedBrowserProxy;
use crate::domain::profile::{DownloadMode, WindowMode};
use crate::domain::device::ResolvedDeviceConfig;

pub const CLOAK_CONFIG_VERSION: u32 = 2;

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
    pub fingerprint_seed: bool,
    pub hardware_concurrency_override: bool,
    pub device_memory_override: bool,
    pub screen_override: bool,
    pub gpu_override: bool,
    pub timezone_override: bool,
    pub locale_override: bool,
    pub webrtc_ip_override: bool,
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
            fingerprint_seed: true,
            hardware_concurrency_override: true,
            device_memory_override: true,
            screen_override: true,
            gpu_override: true,
            timezone_override: true,
            locale_override: true,
            webrtc_ip_override: true,
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
    pub device: ResolvedDeviceConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceSnapshot {
    pub fingerprint_seed: u64,
    pub platform: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hardware_concurrency: Option<u8>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub device_memory_gb: Option<u8>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub screen_width: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub screen_height: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub gpu_preset_id: Option<String>,
    pub timezone_mode: String,
    pub locale_mode: String,
    pub webrtc_mode: String,
    pub mode: String,
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
    #[serde(skip_serializing_if = "Option::is_none")]
    pub device: Option<DeviceSnapshot>,
}

impl ConfigSnapshot {
    pub fn from_launch_config(
        config: &CloakLaunchConfig,
        download_mode: &DownloadMode,
        proxy_id: Option<String>,
        cloak_runtime_id: Option<String>,
        device_settings: &crate::domain::device::ProfileDeviceSettings,
    ) -> Self {
        let device = DeviceSnapshot {
            fingerprint_seed: config.device.fingerprint_seed,
            platform: config.device.platform.as_str().to_string(),
            hardware_concurrency: config.device.hardware_concurrency,
            device_memory_gb: config.device.device_memory_gb,
            screen_width: config.device.screen_width,
            screen_height: config.device.screen_height,
            gpu_preset_id: device_settings.hardware_preset_id.clone(),
            timezone_mode: device_settings.timezone_mode.as_str().to_string(),
            locale_mode: device_settings.locale_mode.as_str().to_string(),
            webrtc_mode: device_settings.webrtc_mode.as_str().to_string(),
            mode: device_settings.mode.as_str().to_string(),
        };

        Self {
            config_version: CLOAK_CONFIG_VERSION,
            window_mode: config.window_mode.as_str().to_string(),
            startup_url_count: config.startup_urls.len(),
            download_mode: download_mode.as_str().to_string(),
            proxy_id,
            cloak_version: config.cloak_version.clone(),
            cloak_runtime_id,
            restore_session: config.restore_session,
            device: Some(device),
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
