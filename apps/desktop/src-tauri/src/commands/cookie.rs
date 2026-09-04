use tauri::State;

use crate::application::services::CookieTransferService;
use crate::domain::profile::CookieTransferResult;
use crate::error::AppError;
use crate::state::AppState;

#[tauri::command]
pub async fn profile_cookie_export(
    state: State<'_, AppState>,
    profile_id: String,
    destination_path: String,
) -> Result<CookieTransferResult, AppError> {
    CookieTransferService::export_cookies(&state, &profile_id, destination_path).await
}

#[tauri::command]
pub async fn profile_cookie_import(
    state: State<'_, AppState>,
    profile_id: String,
    source_path: String,
) -> Result<CookieTransferResult, AppError> {
    CookieTransferService::import_cookies(&state, &profile_id, source_path).await
}
