mod application;
mod commands;
mod domain;
mod error;
mod infrastructure;
mod state;

use tauri::Manager;
use tracing::info;
use tracing_subscriber::{fmt, layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

use crate::state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let runtime = tokio::runtime::Runtime::new().expect("failed to create tokio runtime");
            let app_state = runtime
                .block_on(AppState::initialize())
                .expect("failed to initialize application state");

            init_logging(&app_state.paths.log_file())?;
            info!("app started");
            info!(data_dir = %app_state.paths.root.display(), "application data directory resolved");
            info!("database initialized");

            let browser_status = runtime
                .block_on(app_state.browser_service.status(&app_state))
                .expect("failed to detect browser");

            if matches!(
                browser_status.status,
                crate::domain::BrowserDetectionStatus::Detected
            ) {
                info!(
                    executable = ?browser_status.executable,
                    version = ?browser_status.version,
                    "browser installation detected"
                );
            } else {
                info!("browser installation not detected");
            }

            app.manage(app_state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::system::get_app_info,
            commands::system::get_system_info,
            commands::system::get_app_paths,
            commands::system::health_check,
            commands::system::get_browser_status,
            commands::system::set_browser_executable,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn init_logging(log_file: &std::path::Path) -> Result<(), Box<dyn std::error::Error>> {
    if let Some(parent) = log_file.parent() {
        std::fs::create_dir_all(parent)?;
    }

    let file_appender = tracing_appender::rolling::never(
        log_file
            .parent()
            .unwrap_or_else(|| std::path::Path::new(".")),
        log_file
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("profiledock.log"),
    );
    let (non_blocking, _guard) = tracing_appender::non_blocking(file_appender);
    std::mem::forget(_guard);

    let env_filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info"));

    tracing_subscriber::registry()
        .with(env_filter)
        .with(fmt::layer().with_writer(std::io::stdout))
        .with(fmt::layer().with_writer(non_blocking).with_ansi(false))
        .init();

    Ok(())
}
