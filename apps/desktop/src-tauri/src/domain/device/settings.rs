use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use super::platform::DevicePlatform;
use crate::error::AppError;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum DeviceConfigurationMode {
    Automatic,
    Custom,
}

impl DeviceConfigurationMode {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Automatic => "automatic",
            Self::Custom => "custom",
        }
    }

    pub fn from_str(value: &str) -> Option<Self> {
        match value {
            "automatic" => Some(Self::Automatic),
            "custom" => Some(Self::Custom),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum GpuMode {
    Automatic,
    Custom,
}

impl GpuMode {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Automatic => "automatic",
            Self::Custom => "custom",
        }
    }

    pub fn from_str(value: &str) -> Option<Self> {
        match value {
            "automatic" => Some(Self::Automatic),
            "custom" => Some(Self::Custom),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum EnvironmentMode {
    Proxy,
    Custom,
    System,
}

impl EnvironmentMode {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Proxy => "proxy",
            Self::Custom => "custom",
            Self::System => "system",
        }
    }

    pub fn from_str(value: &str) -> Option<Self> {
        match value {
            "proxy" => Some(Self::Proxy),
            "custom" => Some(Self::Custom),
            "system" => Some(Self::System),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum WebRtcMode {
    Proxy,
    Real,
    Disabled,
}

impl WebRtcMode {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Proxy => "proxy",
            Self::Real => "real",
            Self::Disabled => "disabled",
        }
    }

    pub fn from_str(value: &str) -> Option<Self> {
        match value {
            "proxy" => Some(Self::Proxy),
            "real" => Some(Self::Real),
            "disabled" => Some(Self::Disabled),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GpuSettings {
    pub mode: GpuMode,
    pub vendor: Option<String>,
    pub renderer: Option<String>,
}

#[derive(Debug, Clone)]
pub struct ProfileDeviceSettings {
    pub profile_id: String,
    pub mode: DeviceConfigurationMode,
    pub fingerprint_seed: u64,
    pub platform: Option<DevicePlatform>,
    pub hardware_concurrency: Option<u8>,
    pub device_memory_gb: Option<u8>,
    pub screen_width: Option<u32>,
    pub screen_height: Option<u32>,
    pub gpu: GpuSettings,
    pub hardware_preset_id: Option<String>,
    pub timezone_mode: EnvironmentMode,
    pub timezone: Option<String>,
    pub locale_mode: EnvironmentMode,
    pub locale: Option<String>,
    pub webrtc_mode: WebRtcMode,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

pub fn generate_fingerprint_seed() -> u64 {
    let uuid = uuid::Uuid::new_v4();
    let bytes = uuid.as_bytes();
    u64::from_le_bytes(bytes[0..8].try_into().expect("8 bytes"))
}

impl ProfileDeviceSettings {
    pub fn defaults(profile_id: String, now: DateTime<Utc>) -> Self {
        Self {
            profile_id,
            mode: DeviceConfigurationMode::Automatic,
            fingerprint_seed: generate_fingerprint_seed(),
            platform: Some(DevicePlatform::host_platform()),
            hardware_concurrency: None,
            device_memory_gb: None,
            screen_width: None,
            screen_height: None,
            gpu: GpuSettings {
                mode: GpuMode::Automatic,
                vendor: None,
                renderer: None,
            },
            hardware_preset_id: None,
            timezone_mode: EnvironmentMode::System,
            timezone: None,
            locale_mode: EnvironmentMode::System,
            locale: None,
            webrtc_mode: WebRtcMode::Disabled,
            created_at: now,
            updated_at: now,
        }
    }

    pub fn regenerate_seed(&mut self) {
        self.fingerprint_seed = generate_fingerprint_seed();
        self.updated_at = Utc::now();
    }
}

pub fn validate_hardware_concurrency(value: u8) -> Result<(), AppError> {
    if !(1..=64).contains(&value) {
        return Err(AppError::InvalidConfiguration(
            "hardware concurrency must be between 1 and 64".into(),
        ));
    }
    Ok(())
}

pub fn validate_device_memory_gb(value: u8) -> Result<(), AppError> {
    if !(1..=128).contains(&value) {
        return Err(AppError::InvalidConfiguration(
            "device memory must be between 1 and 128 GB".into(),
        ));
    }
    Ok(())
}

pub fn validate_screen_size(width: u32, height: u32) -> Result<(), AppError> {
    if width < 800 || height < 600 || width > 7680 || height > 4320 {
        return Err(AppError::InvalidConfiguration(
            "screen dimensions are outside supported bounds".into(),
        ));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fingerprint_seed_is_stable_per_settings_instance() {
        let now = Utc::now();
        let settings = ProfileDeviceSettings::defaults("profile-1".into(), now);
        let seed = settings.fingerprint_seed;
        assert_ne!(seed, 0);
    }

    #[test]
    fn regenerate_changes_seed() {
        let now = Utc::now();
        let mut settings = ProfileDeviceSettings::defaults("profile-1".into(), now);
        let original = settings.fingerprint_seed;
        settings.regenerate_seed();
        assert_ne!(settings.fingerprint_seed, original);
    }
}
