use crate::application::services::ProfileWorkspaceService;
use crate::domain::device::{host_platform, CreateProfileDeviceInput, DevicePlatform};
use crate::domain::profile::{CreateProfileBrowserInput, CreateProfileFullInput};
use crate::error::AppError;
use crate::infrastructure::database::SqliteProfileRepository;
use crate::state::AppState;

struct SeedProfileSpec {
    name: &'static str,
    description: &'static str,
    hardware_preset_id: &'static str,
}

const SEED_PROFILES: &[SeedProfileSpec] = &[
    SeedProfileSpec {
        name: "Test Windows — Intel",
        description: "Seed profile: Windows desktop with Intel UHD graphics",
        hardware_preset_id: "windows-intel-desktop",
    },
    SeedProfileSpec {
        name: "Test Windows — NVIDIA",
        description: "Seed profile: Windows desktop with NVIDIA GTX 1660 SUPER",
        hardware_preset_id: "windows-nvidia-desktop",
    },
    SeedProfileSpec {
        name: "Test Windows — Laptop",
        description: "Seed profile: Windows laptop with Intel Iris Xe graphics",
        hardware_preset_id: "windows-laptop-intel",
    },
];

fn device_input_for_spec(spec: &SeedProfileSpec) -> CreateProfileDeviceInput {
    let windows = DevicePlatform::Windows;
    let host_matched = windows == host_platform();

    if host_matched {
        return CreateProfileDeviceInput {
            mode: Some("custom".to_string()),
            platform: Some(windows.as_str().to_string()),
            hardware_preset_id: Some(spec.hardware_preset_id.to_string()),
            hardware_concurrency: None,
            device_memory_gb: None,
            screen_width: None,
            screen_height: None,
            timezone_mode: Some("system".to_string()),
            timezone: None,
            locale_mode: Some("system".to_string()),
            locale: None,
            webrtc_mode: Some("disabled".to_string()),
        };
    }

    CreateProfileDeviceInput {
        mode: Some("automatic".to_string()),
        platform: Some(windows.as_str().to_string()),
        hardware_preset_id: None,
        hardware_concurrency: None,
        device_memory_gb: None,
        screen_width: None,
        screen_height: None,
        timezone_mode: Some("system".to_string()),
        timezone: None,
        locale_mode: Some("system".to_string()),
        locale: None,
        webrtc_mode: Some("disabled".to_string()),
    }
}

fn remark_for_spec(spec: &SeedProfileSpec) -> String {
    let host = host_platform();
    if host == DevicePlatform::Windows {
        format!(
            "Auto-seeded: custom mode + {} (host-matched Windows — lowest FPJS risk)",
            spec.hardware_preset_id
        )
    } else {
        format!(
            "Auto-seeded: cross-platform automatic (Windows on {host} — expect higher FPJS score)",
            host = host.label()
        )
    }
}

pub async fn run() -> Result<(), AppError> {
    let state = AppState::initialize().await?;
    let repo = SqliteProfileRepository::new(state.db.pool().clone());
    let existing = repo.list(false, None).await?;
    let existing_names: std::collections::HashSet<String> =
        existing.into_iter().map(|profile| profile.name).collect();

    println!("ProfileDock data directory: {}", state.paths.root.display());
    println!("Host platform: {}", host_platform().label());
    println!("Seeding Windows test profiles...\n");

    let mut created = 0usize;
    let mut skipped = 0usize;

    for spec in SEED_PROFILES {
        if existing_names.contains(spec.name) {
            println!("  skip  {} (already exists)", spec.name);
            skipped += 1;
            continue;
        }

        let device = device_input_for_spec(spec);
        let mode = device.mode.clone().unwrap_or_else(|| "automatic".into());

        let profile = ProfileWorkspaceService::create_full(
            &state,
            CreateProfileFullInput {
                name: spec.name.to_string(),
                description: Some(spec.description.to_string()),
                group_id: None,
                tags: Some(vec!["test".to_string(), "seed".to_string(), "windows".to_string()]),
                tag_items: None,
                remark: Some(remark_for_spec(spec)),
                notes: None,
                platform_label: Some("Windows".to_string()),
                proxy_mode: Some("none".to_string()),
                proxy_id: None,
                custom_proxy: None,
                browser: Some(CreateProfileBrowserInput {
                    startup_urls: Some(vec!["https://www.google.com".to_string()]),
                    download_mode: None,
                    custom_download_dir: None,
                    window_mode: None,
                    restore_session: Some(false),
                }),
                device: Some(device),
            },
        )
        .await?;

        println!(
            "  create {} [{}] preset={} mode={} id={}",
            profile.name,
            profile.display_id.unwrap_or_else(|| "—".to_string()),
            spec.hardware_preset_id,
            mode,
            profile.id
        );
        created += 1;
    }

    println!("\nDone: {created} created, {skipped} skipped.");
    Ok(())
}
