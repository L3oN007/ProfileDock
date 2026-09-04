use tauri::State;

use crate::domain::proxy::{
    CreateProxyInput, ProfileProxyAssignmentDto, ProxyAssignmentDto, ProxyCheckResultDto, ProxyDto,
    TestProxyInput, UpdateProxyInput,
};
use crate::error::AppError;
use crate::state::AppState;

#[tauri::command]
pub async fn proxy_list(state: State<'_, AppState>) -> Result<Vec<ProxyDto>, AppError> {
    state.proxy_service.list(&state).await
}

#[tauri::command]
pub async fn proxy_get(state: State<'_, AppState>, id: String) -> Result<ProxyDto, AppError> {
    state.proxy_service.get(&state, &id).await
}

#[tauri::command]
pub async fn proxy_create(
    state: State<'_, AppState>,
    input: CreateProxyInput,
) -> Result<ProxyDto, AppError> {
    state.proxy_service.create(&state, input).await
}

#[tauri::command]
pub async fn proxy_update(
    state: State<'_, AppState>,
    id: String,
    input: UpdateProxyInput,
) -> Result<ProxyDto, AppError> {
    state.proxy_service.update(&state, &id, input).await
}

#[tauri::command]
pub async fn proxy_archive(state: State<'_, AppState>, id: String) -> Result<(), AppError> {
    state.proxy_service.archive(&state, &id).await
}

#[tauri::command]
pub async fn proxy_check(
    state: State<'_, AppState>,
    id: String,
) -> Result<ProxyCheckResultDto, AppError> {
    state.proxy_service.check(&state, &id).await
}

#[tauri::command]
pub async fn proxy_test_input(
    state: State<'_, AppState>,
    input: TestProxyInput,
) -> Result<ProxyCheckResultDto, AppError> {
    state.proxy_service.test_input(&state, input).await
}

#[tauri::command]
pub async fn proxy_assign(
    state: State<'_, AppState>,
    profile_id: String,
    proxy_id: String,
) -> Result<(), AppError> {
    state.proxy_service.assign(&state, &profile_id, &proxy_id).await
}

#[tauri::command]
pub async fn proxy_unassign(
    state: State<'_, AppState>,
    profile_id: String,
) -> Result<(), AppError> {
    state.proxy_service.unassign(&state, &profile_id).await
}

#[tauri::command]
pub async fn proxy_get_profile_assignment(
    state: State<'_, AppState>,
    profile_id: String,
) -> Result<ProfileProxyAssignmentDto, AppError> {
    state.proxy_service.get_profile_assignment(&state, &profile_id).await
}

#[tauri::command]
pub async fn proxy_list_assignments(
    state: State<'_, AppState>,
    proxy_id: String,
) -> Result<Vec<ProxyAssignmentDto>, AppError> {
    state.proxy_service.list_assignments(&state, &proxy_id).await
}

#[tauri::command]
pub async fn proxy_list_checks(
    state: State<'_, AppState>,
    proxy_id: String,
    limit: Option<u32>,
) -> Result<Vec<ProxyCheckResultDto>, AppError> {
    state
        .proxy_service
        .list_checks(&state, &proxy_id, limit.unwrap_or(20))
        .await
}
