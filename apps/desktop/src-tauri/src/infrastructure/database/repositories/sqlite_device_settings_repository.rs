use chrono::{DateTime, Utc};
use sqlx::SqlitePool;

use crate::domain::device::{
    DeviceConfigurationMode, DevicePlatform, EnvironmentMode, GpuMode, GpuSettings,
    ProfileDeviceSettings, WebRtcMode,
};
use crate::error::AppError;

#[derive(Clone)]
pub struct SqliteDeviceSettingsRepository {
    pool: SqlitePool,
}

impl SqliteDeviceSettingsRepository {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn get(
        &self,
        profile_id: &str,
    ) -> Result<Option<ProfileDeviceSettings>, AppError> {
        let row = sqlx::query_as::<_, DeviceSettingsRow>(
            "SELECT profile_id, mode, fingerprint_seed, platform, hardware_concurrency,
                    device_memory, screen_width, screen_height, gpu_mode, gpu_vendor,
                    gpu_renderer, hardware_preset_id, timezone_mode, timezone, locale_mode,
                    locale, webrtc_mode, created_at, updated_at
             FROM profile_device_settings WHERE profile_id = ?",
        )
        .bind(profile_id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.map(DeviceSettingsRow::into_settings))
    }

    pub async fn save(&self, settings: &ProfileDeviceSettings) -> Result<(), AppError> {
        sqlx::query(
            "INSERT INTO profile_device_settings
             (profile_id, mode, fingerprint_seed, platform, hardware_concurrency, device_memory,
              screen_width, screen_height, gpu_mode, gpu_vendor, gpu_renderer, hardware_preset_id,
              timezone_mode, timezone, locale_mode, locale, webrtc_mode, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(profile_id) DO UPDATE SET
                mode = excluded.mode,
                fingerprint_seed = excluded.fingerprint_seed,
                platform = excluded.platform,
                hardware_concurrency = excluded.hardware_concurrency,
                device_memory = excluded.device_memory,
                screen_width = excluded.screen_width,
                screen_height = excluded.screen_height,
                gpu_mode = excluded.gpu_mode,
                gpu_vendor = excluded.gpu_vendor,
                gpu_renderer = excluded.gpu_renderer,
                hardware_preset_id = excluded.hardware_preset_id,
                timezone_mode = excluded.timezone_mode,
                timezone = excluded.timezone,
                locale_mode = excluded.locale_mode,
                locale = excluded.locale,
                webrtc_mode = excluded.webrtc_mode,
                updated_at = excluded.updated_at",
        )
        .bind(&settings.profile_id)
        .bind(settings.mode.as_str())
        .bind(settings.fingerprint_seed as i64)
        .bind(settings.platform.map(|value| value.as_str().to_string()))
        .bind(settings.hardware_concurrency.map(i64::from))
        .bind(settings.device_memory_gb.map(i64::from))
        .bind(settings.screen_width.map(i64::from))
        .bind(settings.screen_height.map(i64::from))
        .bind(settings.gpu.mode.as_str())
        .bind(&settings.gpu.vendor)
        .bind(&settings.gpu.renderer)
        .bind(&settings.hardware_preset_id)
        .bind(settings.timezone_mode.as_str())
        .bind(&settings.timezone)
        .bind(settings.locale_mode.as_str())
        .bind(&settings.locale)
        .bind(settings.webrtc_mode.as_str())
        .bind(settings.created_at.to_rfc3339())
        .bind(settings.updated_at.to_rfc3339())
        .execute(&self.pool)
        .await?;

        Ok(())
    }
}

#[derive(sqlx::FromRow)]
struct DeviceSettingsRow {
    profile_id: String,
    mode: String,
    fingerprint_seed: i64,
    platform: Option<String>,
    hardware_concurrency: Option<i64>,
    device_memory: Option<i64>,
    screen_width: Option<i64>,
    screen_height: Option<i64>,
    gpu_mode: String,
    gpu_vendor: Option<String>,
    gpu_renderer: Option<String>,
    hardware_preset_id: Option<String>,
    timezone_mode: String,
    timezone: Option<String>,
    locale_mode: String,
    locale: Option<String>,
    webrtc_mode: String,
    created_at: String,
    updated_at: String,
}

impl DeviceSettingsRow {
    fn into_settings(self) -> ProfileDeviceSettings {
        ProfileDeviceSettings {
            profile_id: self.profile_id,
            mode: DeviceConfigurationMode::from_str(&self.mode)
                .unwrap_or(DeviceConfigurationMode::Automatic),
            fingerprint_seed: self.fingerprint_seed as u64,
            platform: self
                .platform
                .as_deref()
                .and_then(DevicePlatform::from_str),
            hardware_concurrency: self.hardware_concurrency.map(|value| value as u8),
            device_memory_gb: self.device_memory.map(|value| value as u8),
            screen_width: self.screen_width.map(|value| value as u32),
            screen_height: self.screen_height.map(|value| value as u32),
            gpu: GpuSettings {
                mode: GpuMode::from_str(&self.gpu_mode).unwrap_or(GpuMode::Automatic),
                vendor: self.gpu_vendor,
                renderer: self.gpu_renderer,
            },
            hardware_preset_id: self.hardware_preset_id,
            timezone_mode: EnvironmentMode::from_str(&self.timezone_mode)
                .unwrap_or(EnvironmentMode::Proxy),
            timezone: self.timezone,
            locale_mode: EnvironmentMode::from_str(&self.locale_mode)
                .unwrap_or(EnvironmentMode::Proxy),
            locale: self.locale,
            webrtc_mode: WebRtcMode::from_str(&self.webrtc_mode).unwrap_or(WebRtcMode::Proxy),
            created_at: parse_ts(&self.created_at),
            updated_at: parse_ts(&self.updated_at),
        }
    }
}

fn parse_ts(value: &str) -> DateTime<Utc> {
    DateTime::parse_from_rfc3339(value)
        .map(|dt| dt.with_timezone(&Utc))
        .unwrap_or_else(|_| Utc::now())
}
