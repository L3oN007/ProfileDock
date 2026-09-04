use tauri::State;

use crate::domain::profile::{
    BrowserInstanceDto, CreateProfileInput, ProfileBrowserSettingsDto, ProfileDto, ProfileEventDto,
    UpdateBrowserSettingsInput, UpdateProfileInput,
};
use crate::domain::cloak::PreflightResult;
use crate::error::AppError;
use crate::state::AppState;

#[tauri::command]
pub async fn profile_list(
    state: State<'_, AppState>,
    search: Option<String>,
) -> Result<Vec<ProfileDto>, AppError> {
    state.profile_service.list(&state, search).await
}

#[tauri::command]
pub async fn profile_get(state: State<'_, AppState>, id: String) -> Result<ProfileDto, AppError> {
    state.profile_service.get(&state, &id).await
}

#[tauri::command]
pub async fn profile_create(
    state: State<'_, AppState>,
    input: CreateProfileInput,
) -> Result<ProfileDto, AppError> {
    state.profile_service.create(&state, input).await
}

#[tauri::command]
pub async fn profile_update(
    state: State<'_, AppState>,
    id: String,
    input: UpdateProfileInput,
) -> Result<ProfileDto, AppError> {
    state.profile_service.update(&state, &id, input).await
}

#[tauri::command]
pub async fn profile_archive(state: State<'_, AppState>, id: String) -> Result<(), AppError> {
    state.profile_service.archive(&state, &id).await
}

#[tauri::command]
pub async fn profile_launch(
    state: State<'_, AppState>,
    id: String,
) -> Result<BrowserInstanceDto, AppError> {
    state
        .browser_service
        .launch_profile(&state, &state.profile_service, &id)
        .await
}

#[tauri::command]
pub async fn profile_stop(state: State<'_, AppState>, id: String) -> Result<(), AppError> {
    state.browser_service.stop_profile(&state, &id).await
}

#[tauri::command]
pub async fn profile_get_instance(
    state: State<'_, AppState>,
    id: String,
) -> Result<Option<BrowserInstanceDto>, AppError> {
    state.browser_service.get_instance(&state, &id).await
}

#[tauri::command]
pub async fn profile_preflight(
    state: State<'_, AppState>,
    profile_id: String,
) -> Result<PreflightResult, AppError> {
    state.browser_service.preflight(&state, &profile_id).await
}

#[tauri::command]
pub async fn profile_browser_settings_get(
    state: State<'_, AppState>,
    profile_id: String,
) -> Result<ProfileBrowserSettingsDto, AppError> {
    state
        .browser_service
        .get_browser_settings(&state, &profile_id)
        .await
}

#[tauri::command]
pub async fn profile_browser_settings_update(
    state: State<'_, AppState>,
    profile_id: String,
    input: UpdateBrowserSettingsInput,
) -> Result<ProfileBrowserSettingsDto, AppError> {
    state
        .browser_service
        .update_browser_settings(&state, &profile_id, input)
        .await
}

#[tauri::command]
pub async fn profile_list_events(
    state: State<'_, AppState>,
    id: String,
) -> Result<Vec<ProfileEventDto>, AppError> {
    state.profile_service.list_events(&state, &id).await
}
