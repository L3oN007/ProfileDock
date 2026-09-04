use tauri::State;

use crate::application::services::GroupService;
use crate::domain::group::{CreateGroupInput, ProfileGroupDto, UpdateGroupInput};
use crate::error::AppError;
use crate::state::AppState;

#[tauri::command]
pub async fn group_list(state: State<'_, AppState>) -> Result<Vec<ProfileGroupDto>, AppError> {
    GroupService::list(&state).await
}

#[tauri::command]
pub async fn group_create(
    state: State<'_, AppState>,
    input: CreateGroupInput,
) -> Result<ProfileGroupDto, AppError> {
    GroupService::create(&state, input).await
}

#[tauri::command]
pub async fn group_update(
    state: State<'_, AppState>,
    id: String,
    input: UpdateGroupInput,
) -> Result<ProfileGroupDto, AppError> {
    GroupService::update(&state, &id, input).await
}

#[tauri::command]
pub async fn group_delete(state: State<'_, AppState>, id: String) -> Result<(), AppError> {
    GroupService::delete(&state, &id).await
}
