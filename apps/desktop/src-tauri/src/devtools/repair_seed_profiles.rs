use chrono::Utc;

use crate::domain::device::{
    find_preset, host_platform, is_host_matched_platform, DeviceConfigurationMode, DevicePlatform,
    EnvironmentMode, GpuMode, GpuSettings, WebRtcMode,
};
use crate::error::AppError;
use crate::infrastructure::database::{SqliteDeviceSettingsRepository, SqliteProfileRepository};
use crate::state::AppState;

const SEED_PROFILE_NAMES: &[&str] = &[
    "Test Windows — Intel",
    "Test Windows — NVIDIA",
    "Test Windows — Laptop",
];

struct SeedRepairSpec {
    name: &'static str,
    hardware_preset_id: &'static str,
}

const REPAIR_SPECS: &[SeedRepairSpec] = &[
    SeedRepairSpec {
        name: "Test Windows — Intel",
        hardware_preset_id: "windows-intel-desktop",
    },
    SeedRepairSpec {
        name: "Test Windows — NVIDIA",
        hardware_preset_id: "windows-nvidia-desktop",
    },
    SeedRepairSpec {
        name: "Test Windows — Laptop",
        hardware_preset_id: "windows-laptop-intel",
    },
];

pub async fn run() -> Result<(), AppError> {
    let state = AppState::initialize().await?;
    let repo = SqliteProfileRepository::new(state.db.pool().clone());
    let device_repo = SqliteDeviceSettingsRepository::new(state.db.pool().clone());
    let profiles = repo.list(false, None).await?;

    println!("ProfileDock data directory: {}", state.paths.root.display());
    println!("Host platform: {}", host_platform().label());
    println!("Repairing Windows seed profile device settings...\n");

    let mut repaired = 0usize;
    let mut skipped = 0usize;

    for profile in profiles {
        if !SEED_PROFILE_NAMES.contains(&profile.name.as_str()) {
            continue;
        }

        let Some(spec) = REPAIR_SPECS.iter().find(|item| item.name == profile.name) else {
            continue;
        };

        let mut settings = device_repo
            .get(&profile.id)
            .await?
            .ok_or(AppError::ProfileNotFound)?;

        let host_matched = is_host_matched_platform(DevicePlatform::Windows);
        let expected_mode = if host_matched {
            DeviceConfigurationMode::Custom
        } else {
            DeviceConfigurationMode::Automatic
        };
        let expected_preset = if host_matched {
            Some(spec.hardware_preset_id.to_string())
        } else {
            None
        };

        let preset = find_preset(spec.hardware_preset_id);
        let should_repair = settings.mode != expected_mode
            || settings.platform != Some(DevicePlatform::Windows)
            || settings.hardware_preset_id != expected_preset
            || (host_matched
                && preset.is_some_and(|preset| {
                    settings.hardware_concurrency != Some(preset.hardware_concurrency)
                        || settings.device_memory_gb != Some(preset.device_memory_gb)
                        || settings.screen_width != Some(preset.screen_width)
                        || settings.screen_height != Some(preset.screen_height)
                        || settings.gpu.vendor.as_deref() != Some(preset.gpu_vendor)
                        || settings.gpu.renderer.as_deref() != Some(preset.gpu_renderer)
                }))
            || (!host_matched
                && (settings.hardware_concurrency.is_some()
                    || settings.device_memory_gb.is_some()
                    || settings.screen_width.is_some()
                    || settings.screen_height.is_some()
                    || settings.gpu.mode == GpuMode::Custom));

        if !should_repair {
            println!(
                "  skip  {} (already aligned with seed spec)",
                profile.name
            );
            skipped += 1;
            continue;
        }

        settings.platform = Some(DevicePlatform::Windows);
        settings.timezone_mode = EnvironmentMode::System;
        settings.timezone = None;
        settings.locale_mode = EnvironmentMode::System;
        settings.locale = None;
        settings.webrtc_mode = WebRtcMode::Disabled;
        settings.updated_at = Utc::now();

        if host_matched {
            let preset = find_preset(spec.hardware_preset_id).expect("seed hardware preset must exist");
            settings.mode = DeviceConfigurationMode::Custom;
            settings.hardware_preset_id = Some(spec.hardware_preset_id.to_string());
            settings.hardware_concurrency = Some(preset.hardware_concurrency);
            settings.device_memory_gb = Some(preset.device_memory_gb);
            settings.screen_width = Some(preset.screen_width);
            settings.screen_height = Some(preset.screen_height);
            settings.gpu = GpuSettings {
                mode: GpuMode::Custom,
                vendor: Some(preset.gpu_vendor.to_string()),
                renderer: Some(preset.gpu_renderer.to_string()),
            };
        } else {
            settings.mode = DeviceConfigurationMode::Automatic;
            settings.hardware_preset_id = None;
            settings.hardware_concurrency = None;
            settings.device_memory_gb = None;
            settings.screen_width = None;
            settings.screen_height = None;
            settings.gpu = GpuSettings {
                mode: GpuMode::Automatic,
                vendor: None,
                renderer: None,
            };
        }

        device_repo.save(&settings).await?;

        let label = if host_matched {
            format!("custom + {}", spec.hardware_preset_id)
        } else {
            "automatic (cross-platform)".to_string()
        };
        println!("  repair {} -> {}", profile.name, label);
        repaired += 1;
    }

    println!("\nDone: {repaired} repaired, {skipped} skipped.");
    Ok(())
}
