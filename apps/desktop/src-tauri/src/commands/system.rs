use tauri::State;

use crate::application::services::SystemService;
use crate::domain::{AppInfo, AppPathsInfo, BrowserStatus, HealthCheck, NetworkInfo, SystemInfo};
use crate::error::AppError;
use crate::infrastructure::network::lookup_public_network_info;
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
