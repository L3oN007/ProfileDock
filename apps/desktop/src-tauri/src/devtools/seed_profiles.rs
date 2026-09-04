use crate::application::services::ProfileWorkspaceService;
use crate::domain::device::{host_platform, CreateProfileDeviceInput, DevicePlatform};
use crate::domain::profile::{CreateProfileBrowserInput, CreateProfileFullInput};
use crate::error::AppError;
use crate::infrastructure::database::SqliteProfileRepository;
use crate::state::AppState;

struct SeedProfileSpec {
    name: &'static str,
    description: &'static str,
    platform: DevicePlatform,
    platform_label: &'static str,
}

const SEED_PROFILES: &[SeedProfileSpec] = &[
    SeedProfileSpec {
        name: "Test Windows",
        description: "Seed profile for Windows fingerprint testing",
        platform: DevicePlatform::Windows,
        platform_label: "Windows",
    },
    SeedProfileSpec {
        name: "Test macOS",
        description: "Seed profile for macOS fingerprint testing",
        platform: DevicePlatform::Macos,
        platform_label: "macOS",
    },
    SeedProfileSpec {
        name: "Test Linux",
        description: "Seed profile for Linux fingerprint testing",
        platform: DevicePlatform::Linux,
        platform_label: "Linux",
    },
];

fn device_input_for_spec(spec: &SeedProfileSpec) -> CreateProfileDeviceInput {
    CreateProfileDeviceInput {
        mode: Some("automatic".to_string()),
        platform: Some(spec.platform.as_str().to_string()),
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

pub async fn run() -> Result<(), AppError> {
    let state = AppState::initialize().await?;
    let repo = SqliteProfileRepository::new(state.db.pool().clone());
    let existing = repo.list(false, None).await?;
    let existing_names: std::collections::HashSet<String> =
        existing.into_iter().map(|profile| profile.name).collect();

    println!("ProfileDock data directory: {}", state.paths.root.display());
    println!("Host platform: {}", host_platform().label());
    println!("Seeding test profiles...\n");

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
        let host = host_platform();

        let profile = ProfileWorkspaceService::create_full(
            &state,
            CreateProfileFullInput {
                name: spec.name.to_string(),
                description: Some(spec.description.to_string()),
                group_id: None,
                tags: Some(vec!["test".to_string(), "seed".to_string()]),
                remark: Some(if spec.platform == host {
                    "Auto-seeded: automatic mode (recommended for FingerprintJS)".to_string()
                } else {
                    "Auto-seeded: cross-platform automatic (higher FPJS risk than host-matched)"
                        .to_string()
                }),
                notes: None,
                platform_label: Some(spec.platform_label.to_string()),
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
            "  create {} [{}] mode={} id={}",
            profile.name,
            profile.display_id.unwrap_or_else(|| "—".to_string()),
            mode,
            profile.id
        );
        created += 1;
    }

    println!("\nDone: {created} created, {skipped} skipped.");
    Ok(())
}
