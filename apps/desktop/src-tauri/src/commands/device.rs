use tauri::State;

use crate::application::services::DeviceSettingsService;
use crate::domain::device::{
    DeviceValidationResult, HardwarePresetDto, ProfileDeviceSettingsDto, ResolvedDeviceOverviewDto,
    UpdateProfileDeviceSettingsInput,
};
use crate::error::AppError;
use crate::state::AppState;

#[tauri::command]
pub async fn profile_device_settings_get(
    state: State<'_, AppState>,
    profile_id: String,
) -> Result<ProfileDeviceSettingsDto, AppError> {
    DeviceSettingsService::get(&state, &profile_id).await
}

#[tauri::command]
pub async fn profile_device_settings_update(
    state: State<'_, AppState>,
    profile_id: String,
    input: UpdateProfileDeviceSettingsInput,
) -> Result<ProfileDeviceSettingsDto, AppError> {
    DeviceSettingsService::update(&state, &profile_id, input).await
}

#[tauri::command]
pub async fn profile_device_settings_regenerate(
    state: State<'_, AppState>,
    profile_id: String,
) -> Result<ProfileDeviceSettingsDto, AppError> {
    DeviceSettingsService::regenerate(&state, &profile_id).await
}

#[tauri::command]
pub async fn profile_device_settings_validate(
    state: State<'_, AppState>,
    profile_id: String,
) -> Result<DeviceValidationResult, AppError> {
    DeviceSettingsService::validate(&state, &profile_id).await
}

#[tauri::command]
pub async fn profile_device_settings_overview(
    state: State<'_, AppState>,
    profile_id: String,
) -> Result<ResolvedDeviceOverviewDto, AppError> {
    DeviceSettingsService::resolve_overview(&state, &profile_id).await
}

#[tauri::command]
pub async fn device_presets_list() -> Result<Vec<HardwarePresetDto>, AppError> {
    Ok(DeviceSettingsService::list_presets())
}
