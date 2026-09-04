use tauri::State;

use crate::application::services::SystemService;
use crate::domain::{
    AppInfo, AppPathsInfo, AppUpdateInfo, BrowserStatus, HealthCheck, NetworkInfo, SystemInfo,
};
use crate::error::AppError;
use crate::infrastructure::network::lookup_public_network_info;
use crate::infrastructure::release::{
    check_app_update as fetch_latest_app_update, releases_page_url,
};
use crate::state::AppState;

#[tauri::command]
pub async fn get_app_info() -> Result<AppInfo, AppError> {
    Ok(SystemService::get_app_info())
}

#[tauri::command]
pub async fn get_system_info() -> Result<SystemInfo, AppError> {
    Ok(SystemService::get_system_info())
}

#[tauri::command]
pub async fn get_app_paths(state: State<'_, AppState>) -> Result<AppPathsInfo, AppError> {
    Ok(SystemService::get_app_paths(&state.paths))
}

#[tauri::command]
pub async fn health_check(state: State<'_, AppState>) -> Result<HealthCheck, AppError> {
    SystemService::health_check(&state).await
}

#[tauri::command]
pub async fn get_browser_status(state: State<'_, AppState>) -> Result<BrowserStatus, AppError> {
    state.browser_service.status(&state).await
}

#[tauri::command]
pub async fn set_browser_executable(
    state: State<'_, AppState>,
    path: String,
) -> Result<BrowserStatus, AppError> {
    state.browser_service.set_executable(&state, path).await
}

#[tauri::command]
pub async fn get_network_info() -> Result<NetworkInfo, AppError> {
    lookup_public_network_info().await
}

#[tauri::command]
pub async fn check_app_update() -> Result<AppUpdateInfo, AppError> {
    let current_version = SystemService::get_app_info().version;
    Ok(fetch_latest_app_update(&current_version).await)
}

#[tauri::command]
pub async fn open_external_url(url: String) -> Result<(), AppError> {
    if !url.starts_with("https://") {
        return Err(AppError::InvalidConfiguration(
            "only https URLs are allowed".into(),
        ));
    }

    open::that(&url).map_err(AppError::from)
}

#[tauri::command]
pub async fn get_releases_page_url() -> Result<String, AppError> {
    Ok(releases_page_url().to_string())
}
