use chrono::Utc;

use crate::application::services::{CloakInstallationService, DeviceConsistencyValidator};
use crate::domain::device::DeviceConfigResolver;
use crate::domain::device::{
    find_preset, validate_device_memory_gb, validate_hardware_concurrency, validate_screen_size,
    CreateProfileDeviceInput, DeviceConfigurationMode, DevicePlatform, EnvironmentMode, GpuMode,
    GpuSettings, HardwarePresetDto, ProfileDeviceSettings, ResolvedDeviceOverviewDto,
    UpdateProfileDeviceSettingsInput, HARDWARE_PRESETS,
};
use crate::domain::device::{DeviceValidationResult, ProfileDeviceSettingsDto};
use crate::error::AppError;
use crate::infrastructure::database::{
    SqliteBrowserInstanceRepository, SqliteDeviceSettingsRepository,
    SqliteProfileProxyAssignmentRepository,
};
use crate::state::AppState;

pub struct DeviceSettingsService;

impl DeviceSettingsService {
    pub async fn get(
        state: &AppState,
        profile_id: &str,
    ) -> Result<ProfileDeviceSettingsDto, AppError> {
        let settings = Self::get_or_create(state, profile_id).await?;
        Ok(settings.to_dto())
    }

    pub async fn get_or_create(
        state: &AppState,
        profile_id: &str,
    ) -> Result<ProfileDeviceSettings, AppError> {
        let repo = SqliteDeviceSettingsRepository::new(state.db.pool().clone());
        if let Some(settings) = repo.get(profile_id).await? {
            return Ok(settings);
        }

        let now = Utc::now();
        let settings = ProfileDeviceSettings::defaults(profile_id.to_string(), now);
        repo.save(&settings).await?;
        Ok(settings)
    }

    pub async fn create_defaults(
        state: &AppState,
        profile_id: &str,
        input: Option<CreateProfileDeviceInput>,
    ) -> Result<ProfileDeviceSettings, AppError> {
        let now = Utc::now();
        let mut settings = ProfileDeviceSettings::defaults(profile_id.to_string(), now);
        if let Some(input) = input {
            apply_create_input(&mut settings, input)?;
        }
        SqliteDeviceSettingsRepository::new(state.db.pool().clone())
            .save(&settings)
            .await?;
        Ok(settings)
    }

    pub async fn update(
        state: &AppState,
        profile_id: &str,
        input: UpdateProfileDeviceSettingsInput,
    ) -> Result<ProfileDeviceSettingsDto, AppError> {
        Self::ensure_not_running(state, profile_id).await?;
        let repo = SqliteDeviceSettingsRepository::new(state.db.pool().clone());
        let mut settings = Self::get_or_create(state, profile_id).await?;
        apply_update_input(&mut settings, input)?;
        settings.updated_at = Utc::now();
        repo.save(&settings).await?;

        crate::infrastructure::database::SqliteProfileEventRepository::new(state.db.pool().clone())
            .insert(profile_id, "device_settings_updated", None)
            .await?;

        Ok(settings.to_dto())
    }

    pub async fn regenerate(
        state: &AppState,
        profile_id: &str,
    ) -> Result<ProfileDeviceSettingsDto, AppError> {
        Self::ensure_not_running(state, profile_id).await?;
        let repo = SqliteDeviceSettingsRepository::new(state.db.pool().clone());
        let mut settings = Self::get_or_create(state, profile_id).await?;
        let previous = settings.fingerprint_seed;
        settings.regenerate_seed();
        repo.save(&settings).await?;

        crate::infrastructure::database::SqliteProfileEventRepository::new(state.db.pool().clone())
            .insert(
                profile_id,
                "fingerprint_regenerated",
                Some(serde_json::json!({ "previous_seed": previous })),
            )
            .await?;

        Ok(settings.to_dto())
    }

    pub async fn validate(
        state: &AppState,
        profile_id: &str,
    ) -> Result<DeviceValidationResult, AppError> {
        let settings = Self::get_or_create(state, profile_id).await?;
        Ok(DeviceConsistencyValidator::validate(&settings))
    }

    pub fn list_presets() -> Vec<HardwarePresetDto> {
        HARDWARE_PRESETS
            .iter()
            .map(HardwarePresetDto::from)
            .collect()
    }

    pub async fn resolve_overview(
        state: &AppState,
        profile_id: &str,
    ) -> Result<ResolvedDeviceOverviewDto, AppError> {
        let settings = Self::get_or_create(state, profile_id).await?;
        let has_proxy = SqliteProfileProxyAssignmentRepository::new(state.db.pool().clone())
            .find_by_profile(profile_id)
            .await?
            .is_some();
        let capabilities = CloakInstallationService::get_capabilities(state).await?;
        let resolved = DeviceConfigResolver::resolve(&settings, &capabilities, has_proxy);

        let hardware_concurrency = if settings.mode == DeviceConfigurationMode::Custom {
            resolved
                .hardware_concurrency
                .map(|value| format!("{value} cores"))
        } else {
            Some("Auto".into())
        };

        let device_memory_gb = if settings.mode == DeviceConfigurationMode::Custom {
            resolved.device_memory_gb.map(|value| format!("{value} GB"))
        } else {
            Some("Auto".into())
        };

        let screen = if settings.mode == DeviceConfigurationMode::Custom {
            match (resolved.screen_width, resolved.screen_height) {
                (Some(width), Some(height)) => Some(format!("{width}×{height}")),
                _ => Some("Auto".into()),
            }
        } else {
            Some("Auto".into())
        };

        let gpu = if settings.mode == DeviceConfigurationMode::Custom {
            resolved.gpu_vendor.clone().or_else(|| Some("Auto".into()))
        } else {
            Some("Auto".into())
        };

        let timezone = environment_label(settings.timezone_mode, settings.timezone.as_deref());
        let locale = environment_label(settings.locale_mode, settings.locale.as_deref());
        let webrtc = match settings.webrtc_mode {
            crate::domain::device::WebRtcMode::Proxy => "Based on proxy".to_string(),
            crate::domain::device::WebRtcMode::Real => "Real".to_string(),
            crate::domain::device::WebRtcMode::Disabled => "Disabled".to_string(),
        };

        Ok(ResolvedDeviceOverviewDto {
            fingerprint_seed: settings.fingerprint_seed,
            mode: settings.mode.as_str().to_string(),
            platform: resolved.platform.label().to_string(),
            hardware_concurrency,
            device_memory_gb,
            screen,
            gpu,
            timezone,
            locale,
            webrtc,
            fingerprint_engine: "Cloak managed".to_string(),
        })
    }

    async fn ensure_not_running(state: &AppState, profile_id: &str) -> Result<(), AppError> {
        let instance_repo = SqliteBrowserInstanceRepository::new(state.db.pool().clone());
        if instance_repo
            .find_active_by_profile(profile_id)
            .await?
            .is_some()
        {
            return Err(AppError::ProfileRunning);
        }
        Ok(())
    }
}

fn environment_label(mode: EnvironmentMode, custom: Option<&str>) -> String {
    match mode {
        EnvironmentMode::Proxy => "Based on proxy".to_string(),
        EnvironmentMode::System => "System default".to_string(),
        EnvironmentMode::Custom => custom.unwrap_or("Custom").to_string(),
    }
}

fn apply_create_input(
    settings: &mut ProfileDeviceSettings,
    input: CreateProfileDeviceInput,
) -> Result<(), AppError> {
    if let Some(mode) = input.mode {
        settings.mode = DeviceConfigurationMode::from_str(&mode)
            .ok_or_else(|| AppError::InvalidConfiguration("invalid device mode".into()))?;
    }
    if let Some(platform) = input.platform {
        settings.platform = Some(
            DevicePlatform::from_str(&platform)
                .ok_or_else(|| AppError::InvalidConfiguration("invalid platform".into()))?,
        );
    }
    apply_custom_fields(
        settings,
        input.hardware_preset_id,
        input.hardware_concurrency,
        input.device_memory_gb,
        input.screen_width,
        input.screen_height,
        input.timezone_mode,
        input.timezone,
        input.locale_mode,
        input.locale,
        input.webrtc_mode,
    )?;
    Ok(())
}

fn apply_update_input(
    settings: &mut ProfileDeviceSettings,
    input: UpdateProfileDeviceSettingsInput,
) -> Result<(), AppError> {
    if let Some(mode) = input.mode {
        settings.mode = DeviceConfigurationMode::from_str(&mode)
            .ok_or_else(|| AppError::InvalidConfiguration("invalid device mode".into()))?;
    }
    if let Some(platform) = input.platform {
        settings.platform = Some(
            DevicePlatform::from_str(&platform)
                .ok_or_else(|| AppError::InvalidConfiguration("invalid platform".into()))?,
        );
    }
    if let Some(gpu_mode) = input.gpu_mode {
        settings.gpu.mode = GpuMode::from_str(&gpu_mode)
            .ok_or_else(|| AppError::InvalidConfiguration("invalid gpu mode".into()))?;
    }
    apply_custom_fields(
        settings,
        input.hardware_preset_id,
        input.hardware_concurrency,
        input.device_memory_gb,
        input.screen_width,
        input.screen_height,
        input.timezone_mode,
        input.timezone,
        input.locale_mode,
        input.locale,
        input.webrtc_mode,
    )?;
    Ok(())
}

#[allow(clippy::too_many_arguments)]
fn apply_custom_fields(
    settings: &mut ProfileDeviceSettings,
    hardware_preset_id: Option<String>,
    hardware_concurrency: Option<u8>,
    device_memory_gb: Option<u8>,
    screen_width: Option<u32>,
    screen_height: Option<u32>,
    timezone_mode: Option<String>,
    timezone: Option<String>,
    locale_mode: Option<String>,
    locale: Option<String>,
    webrtc_mode: Option<String>,
) -> Result<(), AppError> {
    if let Some(preset_id) = hardware_preset_id {
        if preset_id.is_empty() {
            settings.hardware_preset_id = None;
        } else {
            let preset = find_preset(&preset_id)
                .ok_or_else(|| AppError::InvalidConfiguration("unknown hardware preset".into()))?;
            settings.hardware_preset_id = Some(preset_id);
            settings.platform = Some(preset.platform);
            settings.hardware_concurrency = Some(preset.hardware_concurrency);
            settings.device_memory_gb = Some(preset.device_memory_gb);
            settings.screen_width = Some(preset.screen_width);
            settings.screen_height = Some(preset.screen_height);
            settings.gpu = GpuSettings {
                mode: GpuMode::Custom,
                vendor: Some(preset.gpu_vendor.to_string()),
                renderer: Some(preset.gpu_renderer.to_string()),
            };
        }
    }

    if let Some(cores) = hardware_concurrency {
        validate_hardware_concurrency(cores)?;
        settings.hardware_concurrency = Some(cores);
    }
    if let Some(memory) = device_memory_gb {
        validate_device_memory_gb(memory)?;
        settings.device_memory_gb = Some(memory);
    }
    if let (Some(width), Some(height)) = (screen_width, screen_height) {
        validate_screen_size(width, height)?;
        settings.screen_width = Some(width);
        settings.screen_height = Some(height);
    }
    if let Some(mode) = timezone_mode {
        settings.timezone_mode = EnvironmentMode::from_str(&mode)
            .ok_or_else(|| AppError::InvalidConfiguration("invalid timezone mode".into()))?;
    }
    if let Some(value) = timezone {
        settings.timezone = if value.trim().is_empty() {
            None
        } else {
            Some(value.trim().to_string())
        };
    }
    if let Some(mode) = locale_mode {
        settings.locale_mode = EnvironmentMode::from_str(&mode)
            .ok_or_else(|| AppError::InvalidConfiguration("invalid locale mode".into()))?;
    }
    if let Some(value) = locale {
        settings.locale = if value.trim().is_empty() {
            None
        } else {
            Some(value.trim().to_string())
        };
    }
    if let Some(mode) = webrtc_mode {
        settings.webrtc_mode = crate::domain::device::WebRtcMode::from_str(&mode)
            .ok_or_else(|| AppError::InvalidConfiguration("invalid webrtc mode".into()))?;
    }
    Ok(())
}
