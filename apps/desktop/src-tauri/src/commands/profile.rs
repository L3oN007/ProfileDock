use tauri::State;

use crate::application::services::ProfileWorkspaceService;
use crate::domain::cloak::PreflightResult;
use crate::domain::profile::{
    ActivityEventDto, BrowserInstanceDto, BulkProfileUpdateInput, CreateProfileFullInput,
    CreateProfileInput, DuplicateProfileInput, ProfileBrowserSettingsDto, ProfileDto,
    ProfileEventDto, ProfileListPage, ProfileListQuery, UpdateBrowserSettingsInput,
    UpdateProfileFullInput, UpdateProfileInput,
};
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

#[tauri::command]
pub async fn profile_list_page(
    state: State<'_, AppState>,
    query: ProfileListQuery,
) -> Result<ProfileListPage, AppError> {
    ProfileWorkspaceService::list_page(&state, query).await
}

#[tauri::command]
pub async fn profile_create_full(
    state: State<'_, AppState>,
    input: CreateProfileFullInput,
) -> Result<ProfileDto, AppError> {
    ProfileWorkspaceService::create_full(&state, input).await
}

#[tauri::command]
pub async fn profile_update_full(
    state: State<'_, AppState>,
    id: String,
    input: UpdateProfileFullInput,
) -> Result<ProfileDto, AppError> {
    ProfileWorkspaceService::update_full(&state, &id, input).await
}

#[tauri::command]
pub async fn profile_bulk_update(
    state: State<'_, AppState>,
    input: BulkProfileUpdateInput,
) -> Result<(), AppError> {
    ProfileWorkspaceService::bulk_update(&state, input).await
}

#[tauri::command]
pub async fn profile_restore(
    state: State<'_, AppState>,
    id: String,
) -> Result<ProfileDto, AppError> {
    ProfileWorkspaceService::restore(&state, &id).await
}

#[tauri::command]
pub async fn profile_delete_permanent(
    state: State<'_, AppState>,
    id: String,
) -> Result<(), AppError> {
    ProfileWorkspaceService::delete_permanent(&state, &id).await
}

#[tauri::command]
pub async fn profile_duplicate(
    state: State<'_, AppState>,
    id: String,
    input: DuplicateProfileInput,
) -> Result<ProfileDto, AppError> {
    ProfileWorkspaceService::duplicate(&state, &id, input).await
}

#[tauri::command]
pub async fn profile_activity_list(
    state: State<'_, AppState>,
    limit: Option<i64>,
) -> Result<Vec<ActivityEventDto>, AppError> {
    ProfileWorkspaceService::list_activity(&state, limit).await
}

#[tauri::command]
pub async fn profile_move_to_trash(state: State<'_, AppState>, id: String) -> Result<(), AppError> {
    state.profile_service.archive(&state, &id).await
}
