use tauri::State;

use crate::application::services::CloakInstallationService;
use crate::domain::cloak::{
    CloakCapabilities, CloakInstallationDto, CloakValidationResult,
    DiscoveredCloakInstallationDto,
};
use crate::error::AppError;
use crate::state::AppState;

#[tauri::command]
pub async fn cloak_get_installation(
    state: State<'_, AppState>,
) -> Result<CloakInstallationDto, AppError> {
    CloakInstallationService::get_installation(&state).await
}

#[tauri::command]
pub async fn cloak_set_executable(
    state: State<'_, AppState>,
    path: String,
) -> Result<CloakInstallationDto, AppError> {
    CloakInstallationService::set_executable(&state, path).await
}

#[tauri::command]
pub async fn cloak_validate_installation(
    state: State<'_, AppState>,
) -> Result<CloakValidationResult, AppError> {
    CloakInstallationService::validate_installation(&state).await
}

#[tauri::command]
pub async fn cloak_discover_installations(
) -> Result<Vec<DiscoveredCloakInstallationDto>, AppError> {
    CloakInstallationService::discover_installations().await
}

#[tauri::command]
pub async fn cloak_auto_configure(
    state: State<'_, AppState>,
) -> Result<CloakInstallationDto, AppError> {
    CloakInstallationService::auto_configure(&state).await
}

#[tauri::command]
pub async fn cloak_get_capabilities(
    state: State<'_, AppState>,
) -> Result<CloakCapabilities, AppError> {
    CloakInstallationService::get_capabilities(&state).await
}
