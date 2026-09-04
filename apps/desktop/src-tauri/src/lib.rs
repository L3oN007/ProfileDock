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

            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                loop {
                    tokio::time::sleep(std::time::Duration::from_secs(2)).await;
                    if let Some(state) = handle.try_state::<AppState>() {
                        let _ = state.browser_service.poll_process_exits(&state).await;
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::system::get_app_info,
            commands::system::get_system_info,
            commands::system::get_app_paths,
            commands::system::health_check,
            commands::system::get_browser_status,
            commands::system::set_browser_executable,
            commands::cloak::cloak_get_installation,
            commands::cloak::cloak_set_executable,
            commands::cloak::cloak_validate_installation,
            commands::cloak::cloak_discover_installations,
            commands::cloak::cloak_auto_configure,
            commands::cloak::cloak_get_capabilities,
            commands::cloak_runtime::cloak_runtime_status,
            commands::cloak_runtime::cloak_runtime_list,
            commands::cloak_runtime::cloak_runtime_install,
            commands::cloak_runtime::cloak_runtime_cancel_install,
            commands::cloak_runtime::cloak_runtime_validate,
            commands::cloak_runtime::cloak_runtime_activate,
            commands::cloak_runtime::cloak_runtime_remove,
            commands::cloak_runtime::cloak_runtime_check_update,
            commands::cloak_runtime::cloak_runtime_get_install_progress,
            commands::profile::profile_list,
            commands::profile::profile_list_page,
            commands::profile::profile_get,
            commands::profile::profile_create,
            commands::profile::profile_create_full,
            commands::profile::profile_update,
            commands::profile::profile_update_full,
            commands::profile::profile_archive,
            commands::profile::profile_move_to_trash,
            commands::profile::profile_restore,
            commands::profile::profile_delete_permanent,
            commands::profile::profile_duplicate,
            commands::profile::profile_bulk_update,
            commands::profile::profile_activity_list,
            commands::cookie::profile_cookie_export,
            commands::cookie::profile_cookie_import,
            commands::profile::profile_launch,
            commands::profile::profile_stop,
            commands::profile::profile_get_instance,
            commands::profile::profile_preflight,
            commands::profile::profile_browser_settings_get,
            commands::profile::profile_browser_settings_update,
            commands::profile::profile_list_events,
            commands::proxy::proxy_list,
            commands::proxy::proxy_get,
            commands::proxy::proxy_create,
            commands::proxy::proxy_update,
            commands::proxy::proxy_archive,
            commands::proxy::proxy_check,
            commands::proxy::proxy_test_input,
            commands::proxy::proxy_assign,
            commands::proxy::proxy_unassign,
            commands::proxy::proxy_get_profile_assignment,
            commands::proxy::proxy_list_assignments,
            commands::proxy::proxy_list_checks,
            commands::group::group_list,
            commands::group::group_create,
            commands::group::group_update,
            commands::group::group_delete,
            commands::tag::tag_list,
            commands::tag::tag_create,
            commands::tag::tag_delete,
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
