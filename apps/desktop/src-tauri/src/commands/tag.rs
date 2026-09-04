use tauri::State;

use crate::application::services::TagService;
use crate::domain::tag::{CreateTagInput, TagDto};
use crate::error::AppError;
use crate::state::AppState;

#[tauri::command]
pub async fn tag_list(state: State<'_, AppState>) -> Result<Vec<TagDto>, AppError> {
    TagService::list(&state).await
}

#[tauri::command]
pub async fn tag_create(
    state: State<'_, AppState>,
    input: CreateTagInput,
) -> Result<TagDto, AppError> {
    TagService::create(&state, input).await
}

#[tauri::command]
pub async fn tag_delete(state: State<'_, AppState>, id: String) -> Result<(), AppError> {
    TagService::delete(&state, &id).await
}
