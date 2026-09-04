use chrono::Utc;

use crate::domain::device::{
    host_platform, is_host_matched_platform, DeviceConfigurationMode, DevicePlatform,
    EnvironmentMode, GpuMode, GpuSettings, WebRtcMode,
};
use crate::error::AppError;
use crate::infrastructure::database::{
    SqliteDeviceSettingsRepository, SqliteProfileRepository,
};
use crate::state::AppState;

const SEED_PROFILE_NAMES: &[&str] = &["Test Windows", "Test macOS", "Test Linux"];

const PLATFORM_BY_NAME: &[(&str, DevicePlatform)] = &[
    ("Test Windows", DevicePlatform::Windows),
    ("Test macOS", DevicePlatform::Macos),
    ("Test Linux", DevicePlatform::Linux),
];

pub async fn run() -> Result<(), AppError> {
    let state = AppState::initialize().await?;
    let repo = SqliteProfileRepository::new(state.db.pool().clone());
    let device_repo = SqliteDeviceSettingsRepository::new(state.db.pool().clone());
    let profiles = repo.list(false, None).await?;

    println!("ProfileDock data directory: {}", state.paths.root.display());
    println!("Host platform: {}", host_platform().label());
    println!("Repairing seed profile device settings...\n");

    let mut repaired = 0usize;
    let mut skipped = 0usize;

    for profile in profiles {
        if !SEED_PROFILE_NAMES.contains(&profile.name.as_str()) {
            continue;
        }

        let Some((_, platform)) = PLATFORM_BY_NAME
            .iter()
            .find(|(name, _)| *name == profile.name)
        else {
            continue;
        };

        let mut settings = device_repo
            .get(&profile.id)
            .await?
            .ok_or(AppError::ProfileNotFound)?;

        let should_repair = settings.mode == DeviceConfigurationMode::Custom
            || settings.hardware_preset_id.is_some()
            || settings.platform != Some(*platform);

        if !should_repair {
            println!("  skip  {} (already automatic/platform-aligned)", profile.name);
            skipped += 1;
            continue;
        }

        settings.mode = DeviceConfigurationMode::Automatic;
        settings.platform = Some(*platform);
        settings.hardware_preset_id = None;
        settings.hardware_concurrency = None;
        settings.device_memory_gb = None;
        settings.screen_width = None;
        settings.screen_height = None;
        settings.timezone_mode = EnvironmentMode::System;
        settings.timezone = None;
        settings.locale_mode = EnvironmentMode::System;
        settings.locale = None;
        settings.webrtc_mode = WebRtcMode::Disabled;
        settings.gpu = GpuSettings {
            mode: GpuMode::Automatic,
            vendor: None,
            renderer: None,
        };
        settings.updated_at = Utc::now();
        device_repo.save(&settings).await?;

        let label = if is_host_matched_platform(*platform) {
            "automatic (host-matched)"
        } else {
            "automatic (cross-platform — expect higher FPJS score)"
        };
        println!("  repair {} -> {}", profile.name, label);
        repaired += 1;
    }

    println!("\nDone: {repaired} repaired, {skipped} skipped.");
    Ok(())
}
