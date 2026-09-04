use crate::application::services::ProfileWorkspaceService;
use crate::domain::device::CreateProfileDeviceInput;
use crate::domain::profile::CreateProfileFullInput;
use crate::error::AppError;
use crate::infrastructure::database::SqliteProfileRepository;
use crate::state::AppState;

struct SeedProfileSpec {
    name: &'static str,
    description: &'static str,
    platform_label: &'static str,
    hardware_preset_id: &'static str,
}

const SEED_PROFILES: &[SeedProfileSpec] = &[
    SeedProfileSpec {
        name: "Test Windows",
        description: "Seed profile for Windows fingerprint testing",
        platform_label: "Windows",
        hardware_preset_id: "windows-nvidia-desktop",
    },
    SeedProfileSpec {
        name: "Test macOS",
        description: "Seed profile for macOS fingerprint testing",
        platform_label: "macOS",
        hardware_preset_id: "macos-apple-silicon",
    },
    SeedProfileSpec {
        name: "Test Linux",
        description: "Seed profile for Linux fingerprint testing",
        platform_label: "Linux",
        hardware_preset_id: "linux-generic",
    },
];

pub async fn run() -> Result<(), AppError> {
    let state = AppState::initialize().await?;
    let repo = SqliteProfileRepository::new(state.db.pool().clone());
    let existing = repo.list(false, None).await?;
    let existing_names: std::collections::HashSet<String> =
        existing.into_iter().map(|profile| profile.name).collect();

    println!("ProfileDock data directory: {}", state.paths.root.display());
    println!("Seeding test profiles...\n");

    let mut created = 0usize;
    let mut skipped = 0usize;

    for spec in SEED_PROFILES {
        if existing_names.contains(spec.name) {
            println!("  skip  {} (already exists)", spec.name);
            skipped += 1;
            continue;
        }

        let profile = ProfileWorkspaceService::create_full(
            &state,
            CreateProfileFullInput {
                name: spec.name.to_string(),
                description: Some(spec.description.to_string()),
                group_id: None,
                tags: Some(vec!["test".to_string(), "seed".to_string()]),
                remark: Some("Auto-seeded for OS testing".to_string()),
                notes: None,
                platform_label: Some(spec.platform_label.to_string()),
                proxy_mode: Some("none".to_string()),
                proxy_id: None,
                custom_proxy: None,
                browser: None,
                device: Some(CreateProfileDeviceInput {
                    mode: Some("custom".to_string()),
                    platform: None,
                    hardware_preset_id: Some(spec.hardware_preset_id.to_string()),
                    hardware_concurrency: None,
                    device_memory_gb: None,
                    screen_width: None,
                    screen_height: None,
                    timezone_mode: None,
                    timezone: None,
                    locale_mode: None,
                    locale: None,
                    webrtc_mode: None,
                }),
            },
        )
        .await?;

        println!(
            "  create {} [{}] preset={} id={}",
            profile.name,
            profile.display_id.unwrap_or_else(|| "—".to_string()),
            spec.hardware_preset_id,
            profile.id
        );
        created += 1;
    }

    println!("\nDone: {created} created, {skipped} skipped.");
    Ok(())
}
