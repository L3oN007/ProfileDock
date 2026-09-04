use serde::{Deserialize, Serialize};

use super::platform::DevicePlatform;
use super::presets::HardwarePreset;
use super::settings::ProfileDeviceSettings;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProfileDeviceSettingsDto {
    pub profile_id: String,
    pub mode: String,
    pub fingerprint_seed: u64,
    pub platform: Option<String>,
    pub hardware_concurrency: Option<u8>,
    pub device_memory_gb: Option<u8>,
    pub screen_width: Option<u32>,
    pub screen_height: Option<u32>,
    pub gpu_mode: String,
    pub gpu_vendor: Option<String>,
    pub gpu_renderer: Option<String>,
    pub hardware_preset_id: Option<String>,
    pub timezone_mode: String,
    pub timezone: Option<String>,
    pub locale_mode: String,
    pub locale: Option<String>,
    pub webrtc_mode: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateProfileDeviceSettingsInput {
    pub mode: Option<String>,
    pub platform: Option<String>,
    pub hardware_concurrency: Option<u8>,
    pub device_memory_gb: Option<u8>,
    pub screen_width: Option<u32>,
    pub screen_height: Option<u32>,
    pub gpu_mode: Option<String>,
    pub hardware_preset_id: Option<String>,
    pub timezone_mode: Option<String>,
    pub timezone: Option<String>,
    pub locale_mode: Option<String>,
    pub locale: Option<String>,
    pub webrtc_mode: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateProfileDeviceInput {
    pub mode: Option<String>,
    pub platform: Option<String>,
    pub hardware_preset_id: Option<String>,
    pub hardware_concurrency: Option<u8>,
    pub device_memory_gb: Option<u8>,
    pub screen_width: Option<u32>,
    pub screen_height: Option<u32>,
    pub timezone_mode: Option<String>,
    pub timezone: Option<String>,
    pub locale_mode: Option<String>,
    pub locale: Option<String>,
    pub webrtc_mode: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HardwarePresetDto {
    pub id: String,
    pub label: String,
    pub platform: String,
    pub hardware_concurrency: u8,
    pub device_memory_gb: u8,
    pub screen_width: u32,
    pub screen_height: u32,
    pub gpu_vendor: String,
    pub gpu_renderer: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceValidationResult {
    pub valid: bool,
    pub warnings: Vec<DeviceWarningDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceWarningDto {
    pub code: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResolvedDeviceOverviewDto {
    pub fingerprint_seed: u64,
    pub mode: String,
    pub platform: String,
    pub hardware_concurrency: Option<String>,
    pub device_memory_gb: Option<String>,
    pub screen: Option<String>,
    pub gpu: Option<String>,
    pub timezone: String,
    pub locale: String,
    pub webrtc: String,
    pub fingerprint_engine: String,
}

impl From<&HardwarePreset> for HardwarePresetDto {
    fn from(preset: &HardwarePreset) -> Self {
        Self {
            id: preset.id.to_string(),
            label: preset.label.to_string(),
            platform: preset.platform.as_str().to_string(),
            hardware_concurrency: preset.hardware_concurrency,
            device_memory_gb: preset.device_memory_gb,
            screen_width: preset.screen_width,
            screen_height: preset.screen_height,
            gpu_vendor: preset.gpu_vendor.to_string(),
            gpu_renderer: preset.gpu_renderer.to_string(),
        }
    }
}

impl ProfileDeviceSettings {
    pub fn to_dto(&self) -> ProfileDeviceSettingsDto {
        ProfileDeviceSettingsDto {
            profile_id: self.profile_id.clone(),
            mode: self.mode.as_str().to_string(),
            fingerprint_seed: self.fingerprint_seed,
            platform: self.platform.map(|value| value.as_str().to_string()),
            hardware_concurrency: self.hardware_concurrency,
            device_memory_gb: self.device_memory_gb,
            screen_width: self.screen_width,
            screen_height: self.screen_height,
            gpu_mode: self.gpu.mode.as_str().to_string(),
            gpu_vendor: self.gpu.vendor.clone(),
            gpu_renderer: self.gpu.renderer.clone(),
            hardware_preset_id: self.hardware_preset_id.clone(),
            timezone_mode: self.timezone_mode.as_str().to_string(),
            timezone: self.timezone.clone(),
            locale_mode: self.locale_mode.as_str().to_string(),
            locale: self.locale.clone(),
            webrtc_mode: self.webrtc_mode.as_str().to_string(),
            created_at: self.created_at.to_rfc3339(),
            updated_at: self.updated_at.to_rfc3339(),
        }
    }
}
