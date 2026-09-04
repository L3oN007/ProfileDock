use chrono::Utc;
use uuid::Uuid;

use crate::application::queries::profile_list_query::ProfileListQueryService;
use crate::application::services::{DeviceSettingsService, ProfileService, TagService};
use crate::domain::profile::{
    validate_profile_id, ActivityEventDto, BulkProfileUpdateInput, CreateProfileBrowserInput,
    CreateProfileFullInput, DuplicateProfileInput, Profile, ProfileBrowserSettings, ProfileDto,
    ProfileListPage, ProfileListQuery, UpdateProfileFullInput,
};
use crate::domain::profile::{DownloadMode, WindowMode};
use crate::error::AppError;
use crate::infrastructure::database::{
    SqliteBrowserInstanceRepository, SqliteBrowserSettingsRepository, SqliteProfileEventRepository,
    SqliteProfileProxyAssignmentRepository, SqliteProfileRepository, SqliteTagRepository,
};
use crate::state::AppState;

pub struct ProfileWorkspaceService;

impl ProfileWorkspaceService {
    pub async fn list_page(
        state: &AppState,
        query: ProfileListQuery,
    ) -> Result<ProfileListPage, AppError> {
        let mut page = ProfileListQueryService::execute(state.db.pool(), query).await?;
        let instance_repo = SqliteBrowserInstanceRepository::new(state.db.pool().clone());
        for item in &mut page.items {
            if item.is_archived {
                item.state = "archived".to_string();
                continue;
            }
            let active = instance_repo.find_active_by_profile(&item.id).await?;
            item.pid = active.as_ref().and_then(|instance| instance.pid);
            item.instance_id = active.as_ref().map(|instance| instance.id.clone());
            item.state = ProfileService::derive_state(item.is_archived, active.as_ref());
        }
        Ok(page)
    }

    pub async fn create_full(
        state: &AppState,
        input: CreateProfileFullInput,
    ) -> Result<ProfileDto, AppError> {
        let name = input.name.trim();
        if name.is_empty() || name.len() > 100 {
            return Err(AppError::InvalidConfiguration(
                "profile name must be between 1 and 100 characters".into(),
            ));
        }

        let id = Uuid::new_v4().to_string();
        let now = Utc::now();
        let profile_repo = SqliteProfileRepository::new(state.db.pool().clone());
        let display_id = profile_repo.allocate_display_id().await?;

        let profile = Profile {
            id: id.clone(),
            display_id: Some(display_id),
            name: name.to_string(),
            description: input
                .description
                .map(|value| value.trim().to_string())
                .filter(|value| !value.is_empty()),
            group_id: input.group_id,
            remark: input
                .remark
                .map(|value| value.trim().to_string())
                .filter(|value| !value.is_empty()),
            notes: input
                .notes
                .map(|value| value.trim().to_string())
                .filter(|value| !value.is_empty()),
            platform_label: input
                .platform_label
                .map(|value| value.trim().to_string())
                .filter(|value| !value.is_empty()),
            is_archived: false,
            created_at: now,
            updated_at: now,
        };

        let mut browser_settings = ProfileBrowserSettings::defaults(id.clone(), now);
        if let Some(browser) = input.browser {
            apply_browser_input(&mut browser_settings, browser)?;
        }

        let paths = state.paths.create_profile_directories(&id)?;
        if let Err(error) = profile_repo.create(&profile).await {
            let _ = state.paths.remove_profile_directory(&id);
            return Err(error);
        }

        let settings_repo = SqliteBrowserSettingsRepository::new(state.db.pool().clone());
        if let Err(error) = settings_repo.save(&browser_settings).await {
            let _ = state.paths.remove_profile_directory(&id);
            let _ = profile_repo.delete_permanent(&id).await;
            return Err(error);
        }

        if let Err(error) =
            DeviceSettingsService::create_defaults(state, &id, input.device.clone()).await
        {
            let _ = state.paths.remove_profile_directory(&id);
            let _ = profile_repo.delete_permanent(&id).await;
            return Err(error);
        }

        if let Some(tags) = &input.tags {
            let tag_ids = TagService::ensure_tag_ids(state, tags).await?;
            SqliteTagRepository::new(state.db.pool().clone())
                .set_profile_tags(&id, &tag_ids)
                .await?;
        }

        let proxy_mode = input.proxy_mode.clone();
        let proxy_id = input.proxy_id.clone();
        let custom_proxy = input.custom_proxy.clone();
        Self::apply_proxy_on_create(state, &id, proxy_mode, proxy_id, custom_proxy).await?;

        SqliteProfileEventRepository::new(state.db.pool().clone())
            .insert(&id, "profile_created", None)
            .await?;

        let _ = paths;
        state.profile_service.get(state, &id).await
    }

    pub async fn update_full(
        state: &AppState,
        id: &str,
        input: UpdateProfileFullInput,
    ) -> Result<ProfileDto, AppError> {
        validate_profile_id(id)?;
        let profile_repo = SqliteProfileRepository::new(state.db.pool().clone());
        let mut profile = profile_repo
            .find_by_id(id)
            .await?
            .ok_or(AppError::ProfileNotFound)?;

        if profile.is_archived {
            return Err(AppError::ProfileArchived);
        }

        if let Some(name) = input.name {
            let trimmed = name.trim();
            if trimmed.is_empty() || trimmed.len() > 100 {
                return Err(AppError::InvalidConfiguration(
                    "profile name must be between 1 and 100 characters".into(),
                ));
            }
            profile.name = trimmed.to_string();
        }

        if let Some(description) = input.description {
            profile.description = if description.trim().is_empty() {
                None
            } else {
                Some(description.trim().to_string())
            };
        }

        if let Some(group_id) = input.group_id {
            profile.group_id = group_id;
        }

        if let Some(remark) = input.remark {
            profile.remark = if remark.trim().is_empty() {
                None
            } else {
                Some(remark.trim().to_string())
            };
        }

        if let Some(notes) = input.notes {
            profile.notes = if notes.trim().is_empty() {
                None
            } else {
                Some(notes.trim().to_string())
            };
        }

        if let Some(platform_label) = input.platform_label {
            profile.platform_label = if platform_label.trim().is_empty() {
                None
            } else {
                Some(platform_label.trim().to_string())
            };
        }

        profile.updated_at = Utc::now();
        profile_repo.update(&profile).await?;

        if let Some(tags) = input.tags {
            let tag_ids = TagService::ensure_tag_ids(state, &tags).await?;
            SqliteTagRepository::new(state.db.pool().clone())
                .set_profile_tags(id, &tag_ids)
                .await?;
        }

        if let Some(browser) = input.browser {
            let settings_repo = SqliteBrowserSettingsRepository::new(state.db.pool().clone());
            let mut settings = settings_repo
                .get(id)
                .await?
                .ok_or(AppError::ProfileNotFound)?;
            apply_browser_input(&mut settings, browser)?;
            settings.updated_at = Utc::now();
            settings_repo.save(&settings).await?;
        }

        if input.proxy_mode.is_some() || input.proxy_id.is_some() {
            Self::apply_proxy_assignment(state, id, input.proxy_mode, input.proxy_id).await?;
        }

        SqliteProfileEventRepository::new(state.db.pool().clone())
            .insert(id, "profile_updated", None)
            .await?;

        state.profile_service.get(state, id).await
    }

    pub async fn bulk_update(
        state: &AppState,
        input: BulkProfileUpdateInput,
    ) -> Result<(), AppError> {
        if input.profile_ids.is_empty() {
            return Ok(());
        }

        let profile_repo = SqliteProfileRepository::new(state.db.pool().clone());
        let tag_repo = SqliteTagRepository::new(state.db.pool().clone());
        let assignment_repo = SqliteProfileProxyAssignmentRepository::new(state.db.pool().clone());
        let instance_repo = SqliteBrowserInstanceRepository::new(state.db.pool().clone());

        let add_tag_ids = if let Some(tags) = input.add_tags {
            TagService::ensure_tag_ids(state, &tags).await?
        } else {
            Vec::new()
        };
        let remove_tag_ids = if let Some(tags) = input.remove_tags {
            TagService::ensure_tag_ids(state, &tags).await?
        } else {
            Vec::new()
        };

        for profile_id in &input.profile_ids {
            validate_profile_id(profile_id)?;
            let profile = profile_repo
                .find_by_id(profile_id)
                .await?
                .ok_or(AppError::ProfileNotFound)?;
            if profile.is_archived {
                continue;
            }
            if instance_repo
                .find_active_by_profile(profile_id)
                .await?
                .is_some()
            {
                return Err(AppError::ProfileRunning);
            }

            if let Some(group_id) = &input.group_id {
                let mut updated = profile.clone();
                updated.group_id = group_id.clone();
                updated.updated_at = Utc::now();
                profile_repo.update(&updated).await?;
            }

            if !add_tag_ids.is_empty() {
                tag_repo
                    .add_tags_to_profile(profile_id, &add_tag_ids)
                    .await?;
            }

            if !remove_tag_ids.is_empty() {
                tag_repo
                    .remove_tags_from_profile(profile_id, &remove_tag_ids)
                    .await?;
            }

            if let Some(proxy_id) = &input.proxy_id {
                match proxy_id {
                    Some(id) => {
                        state.proxy_service.assign(state, profile_id, id).await?;
                    }
                    None => {
                        assignment_repo.unassign(profile_id).await?;
                    }
                }
            }
        }

        Ok(())
    }

    pub async fn restore(state: &AppState, id: &str) -> Result<ProfileDto, AppError> {
        validate_profile_id(id)?;
        let profile_repo = SqliteProfileRepository::new(state.db.pool().clone());
        let profile = profile_repo
            .find_by_id(id)
            .await?
            .ok_or(AppError::ProfileNotFound)?;
        if !profile.is_archived {
            return state.profile_service.get(state, id).await;
        }
        profile_repo.restore(id).await?;
        SqliteProfileEventRepository::new(state.db.pool().clone())
            .insert(id, "profile_restored", None)
            .await?;
        state.profile_service.get(state, id).await
    }

    pub async fn delete_permanent(state: &AppState, id: &str) -> Result<(), AppError> {
        validate_profile_id(id)?;
        let instance_repo = SqliteBrowserInstanceRepository::new(state.db.pool().clone());
        if instance_repo.find_active_by_profile(id).await?.is_some() {
            return Err(AppError::ProfileRunning);
        }

        let profile_repo = SqliteProfileRepository::new(state.db.pool().clone());
        if profile_repo.find_by_id(id).await?.is_none() {
            return Err(AppError::ProfileNotFound);
        }

        state.paths.remove_profile_directory(id)?;
        profile_repo.delete_permanent(id).await?;
        Ok(())
    }

    pub async fn duplicate(
        state: &AppState,
        id: &str,
        input: DuplicateProfileInput,
    ) -> Result<ProfileDto, AppError> {
        validate_profile_id(id)?;
        let source = state.profile_service.get(state, id).await?;
        let settings_repo = SqliteBrowserSettingsRepository::new(state.db.pool().clone());
        let settings = settings_repo
            .get(id)
            .await?
            .ok_or(AppError::ProfileNotFound)?;

        let assignment_repo = SqliteProfileProxyAssignmentRepository::new(state.db.pool().clone());
        let assignment = assignment_repo.find_by_profile(id).await?;

        let create_input = CreateProfileFullInput {
            name: input
                .name
                .unwrap_or_else(|| format!("{} (Copy)", source.name)),
            description: source.description,
            group_id: source.group_id,
            tags: Some(source.tags),
            remark: source.remark,
            notes: source.notes,
            platform_label: source.platform_label,
            proxy_mode: if assignment.is_some() {
                Some("saved".to_string())
            } else {
                Some("none".to_string())
            },
            proxy_id: assignment.map(|value| value.proxy_id),
            custom_proxy: None,
            browser: Some(CreateProfileBrowserInput {
                startup_urls: Some(settings.startup_urls),
                download_mode: Some(settings.download_mode.as_str().to_string()),
                custom_download_dir: settings
                    .custom_download_dir
                    .as_ref()
                    .map(|path| path.to_string_lossy().into_owned()),
                window_mode: Some(settings.window_mode.as_str().to_string()),
                restore_session: Some(settings.restore_session),
            }),
            device: None,
        };

        Self::create_full(state, create_input).await
    }

    pub async fn list_activity(
        state: &AppState,
        limit: Option<i64>,
    ) -> Result<Vec<ActivityEventDto>, AppError> {
        let limit = limit.unwrap_or(100).clamp(1, 500);
        let rows = sqlx::query_as::<_, ActivityRow>(
            "SELECT e.id, e.profile_id, p.name, p.display_id, e.event_type, e.metadata_json, e.created_at
             FROM profile_events e
             JOIN profiles p ON p.id = e.profile_id
             ORDER BY e.created_at DESC
             LIMIT ?",
        )
        .bind(limit)
        .fetch_all(state.db.pool())
        .await?;

        Ok(rows
            .into_iter()
            .map(|row| ActivityEventDto {
                id: row.id,
                profile_id: row.profile_id,
                profile_name: row.profile_name,
                display_id: row.display_id,
                event_type: row.event_type,
                metadata_json: row.metadata_json,
                created_at: row.created_at,
            })
            .collect())
    }

    async fn apply_proxy_on_create(
        state: &AppState,
        profile_id: &str,
        proxy_mode: Option<String>,
        proxy_id: Option<String>,
        custom_proxy: Option<crate::domain::proxy::CreateProxyInput>,
    ) -> Result<(), AppError> {
        let mode = proxy_mode.as_deref().unwrap_or("none");
        match mode {
            "saved" => {
                if let Some(proxy_id) = proxy_id {
                    state
                        .proxy_service
                        .assign(state, profile_id, &proxy_id)
                        .await?;
                }
            }
            "custom" => {
                if let Some(custom) = custom_proxy {
                    let proxy = state.proxy_service.create(state, custom).await?;
                    state
                        .proxy_service
                        .assign(state, profile_id, &proxy.id)
                        .await?;
                }
            }
            _ => {}
        }
        Ok(())
    }

    async fn apply_proxy_assignment(
        state: &AppState,
        profile_id: &str,
        proxy_mode: Option<String>,
        proxy_id: Option<String>,
    ) -> Result<(), AppError> {
        let mode = proxy_mode.as_deref().unwrap_or("none");
        match mode {
            "saved" => {
                if let Some(id) = proxy_id {
                    state.proxy_service.assign(state, profile_id, &id).await?;
                }
            }
            "none" => {
                SqliteProfileProxyAssignmentRepository::new(state.db.pool().clone())
                    .unassign(profile_id)
                    .await?;
            }
            _ => {}
        }
        Ok(())
    }
}

fn apply_browser_input(
    settings: &mut ProfileBrowserSettings,
    input: CreateProfileBrowserInput,
) -> Result<(), AppError> {
    if let Some(urls) = input.startup_urls {
        settings.startup_urls = urls;
    }
    if let Some(mode) = input.download_mode {
        settings.download_mode = DownloadMode::from_str(&mode)
            .ok_or_else(|| AppError::InvalidConfiguration("invalid download mode".into()))?;
    }
    if let Some(dir) = input.custom_download_dir {
        settings.custom_download_dir = if dir.trim().is_empty() {
            None
        } else {
            Some(dir.into())
        };
    }
    if let Some(mode) = input.window_mode {
        settings.window_mode = WindowMode::from_str(&mode)
            .ok_or_else(|| AppError::InvalidConfiguration("invalid window mode".into()))?;
    }
    if let Some(restore) = input.restore_session {
        settings.restore_session = restore;
    }
    Ok(())
}

#[derive(sqlx::FromRow)]
struct ActivityRow {
    id: i64,
    profile_id: String,
    profile_name: String,
    display_id: Option<String>,
    event_type: String,
    metadata_json: Option<String>,
    created_at: String,
}
