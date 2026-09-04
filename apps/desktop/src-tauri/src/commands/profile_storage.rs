use tauri::State;

use crate::application::services::ProfileStorageService;
use crate::domain::profile::ProfileStorageDto;
use crate::error::AppError;
use crate::state::AppState;

#[tauri::command]
pub async fn profile_storage_get(
    state: State<'_, AppState>,
    profile_id: String,
) -> Result<ProfileStorageDto, AppError> {
    ProfileStorageService::get_storage(&state, &profile_id).await
}

#[tauri::command]
pub async fn profile_storage_clear_cache(
    state: State<'_, AppState>,
    profile_id: String,
) -> Result<ProfileStorageDto, AppError> {
    ProfileStorageService::clear_cache(&state, &profile_id).await
}
