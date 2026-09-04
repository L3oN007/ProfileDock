use tauri::{AppHandle, State};

use crate::application::services::CloakRuntimeManager;
use crate::domain::cloak::{
    CloakInstallProgress, CloakRuntimeDto, CloakRuntimeStatusDto, CloakRuntimeUpdateInfo,
};
use crate::error::AppError;
use crate::state::AppState;

#[tauri::command]
pub async fn cloak_runtime_status(
    state: State<'_, AppState>,
) -> Result<CloakRuntimeStatusDto, AppError> {
    CloakRuntimeManager::status(&state).await
}

#[tauri::command]
pub async fn cloak_runtime_list(state: State<'_, AppState>) -> Result<Vec<CloakRuntimeDto>, AppError> {
    CloakRuntimeManager::list(&state).await
}

#[tauri::command]
pub async fn cloak_runtime_install(
    state: State<'_, AppState>,
    app: AppHandle,
    version: Option<String>,
) -> Result<CloakRuntimeDto, AppError> {
    state
        .cloak_runtime_manager
        .install(&state, version, Some(app))
        .await
}

#[tauri::command]
pub async fn cloak_runtime_cancel_install(state: State<'_, AppState>) -> Result<(), AppError> {
    state.cloak_runtime_manager.cancel_install();
    Ok(())
}

#[tauri::command]
pub async fn cloak_runtime_validate(
    state: State<'_, AppState>,
    runtime_id: String,
) -> Result<CloakRuntimeDto, AppError> {
    CloakRuntimeManager::validate_runtime(&state, &runtime_id).await
}

#[tauri::command]
pub async fn cloak_runtime_activate(
    state: State<'_, AppState>,
    runtime_id: String,
) -> Result<CloakRuntimeDto, AppError> {
    state
        .cloak_runtime_manager
        .activate(&state, &runtime_id)
        .await
}

#[tauri::command]
pub async fn cloak_runtime_remove(
    state: State<'_, AppState>,
    runtime_id: String,
) -> Result<(), AppError> {
    state
        .cloak_runtime_manager
        .remove(&state, &runtime_id)
        .await
}

#[tauri::command]
pub async fn cloak_runtime_check_update(
    state: State<'_, AppState>,
) -> Result<CloakRuntimeUpdateInfo, AppError> {
    CloakRuntimeManager::check_update(&state).await
}

#[tauri::command]
pub async fn cloak_runtime_get_install_progress(
    state: State<'_, AppState>,
) -> Result<CloakInstallProgress, AppError> {
    Ok(state.cloak_runtime_manager.get_install_progress().await)
}
