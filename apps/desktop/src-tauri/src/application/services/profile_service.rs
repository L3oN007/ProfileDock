use chrono::Utc;
use uuid::Uuid;

use crate::domain::profile::{
    validate_profile_id, CreateProfileInput, Profile, ProfileBrowserSettings, ProfileDisplayState,
    ProfileDto, ProfileEventDto, UpdateProfileInput,
};
use crate::error::AppError;
use crate::infrastructure::database::{
    SqliteBrowserInstanceRepository, SqliteBrowserSettingsRepository, SqliteProfileEventRepository,
    SqliteProfileGroupRepository, SqliteProfileProxyAssignmentRepository, SqliteProfileRepository,
    SqliteProxyRepository, SqliteTagRepository,
};
use crate::state::AppState;

pub struct ProfileService {
    launch_locks: std::sync::Mutex<std::collections::HashMap<String, ()>>,
}

impl ProfileService {
    pub fn new() -> Self {
        Self {
            launch_locks: std::sync::Mutex::new(std::collections::HashMap::new()),
        }
    }

    pub async fn create(
        &self,
        state: &AppState,
        input: CreateProfileInput,
    ) -> Result<ProfileDto, AppError> {
        let name = input.name.trim();
        if name.is_empty() || name.len() > 100 {
            return Err(AppError::InvalidConfiguration(
                "profile name must be between 1 and 100 characters".into(),
            ));
        }

        let id = Uuid::new_v4().to_string();
        let profile_repo = SqliteProfileRepository::new(state.db.pool().clone());
        let display_id = profile_repo.allocate_display_id().await?;
        let now = Utc::now();
        let profile = Profile {
            id: id.clone(),
            display_id: Some(display_id),
            name: name.to_string(),
            description: input
                .description
                .map(|d| d.trim().to_string())
                .filter(|d| !d.is_empty()),
            group_id: None,
            remark: None,
            notes: None,
            platform_label: None,
            is_archived: false,
            created_at: now,
            updated_at: now,
        };

        let browser_settings = ProfileBrowserSettings::defaults(id.clone(), now);

        let profile_repo = SqliteProfileRepository::new(state.db.pool().clone());
        let settings_repo = SqliteBrowserSettingsRepository::new(state.db.pool().clone());
        let event_repo = SqliteProfileEventRepository::new(state.db.pool().clone());

        let paths = match state.paths.create_profile_directories(&id) {
            Ok(paths) => paths,
            Err(error) => return Err(error),
        };

        if let Err(error) = profile_repo.create(&profile).await {
            let _ = state.paths.remove_profile_directory(&id);
            return Err(error);
        }

        if let Err(error) = settings_repo.save(&browser_settings).await {
            let _ = state.paths.remove_profile_directory(&id);
            let _ = profile_repo.archive(&id).await;
            return Err(error);
        }

        event_repo.insert(&id, "profile_created", None).await?;

        let _ = paths;
        self.to_dto(state, profile).await
    }

    pub async fn list(
        &self,
        state: &AppState,
        search: Option<String>,
    ) -> Result<Vec<ProfileDto>, AppError> {
        let profile_repo = SqliteProfileRepository::new(state.db.pool().clone());
        let profiles = profile_repo.list(false, search.as_deref()).await?;
        let mut dtos = Vec::with_capacity(profiles.len());
        for profile in profiles {
            dtos.push(self.to_dto(state, profile).await?);
        }
        Ok(dtos)
    }

    pub async fn get(&self, state: &AppState, id: &str) -> Result<ProfileDto, AppError> {
        validate_profile_id(id)?;
        let repo = SqliteProfileRepository::new(state.db.pool().clone());
        let profile = repo
            .find_by_id(id)
            .await?
            .ok_or(AppError::ProfileNotFound)?;
        self.to_dto(state, profile).await
    }

    pub async fn update(
        &self,
        state: &AppState,
        id: &str,
        input: UpdateProfileInput,
    ) -> Result<ProfileDto, AppError> {
        validate_profile_id(id)?;
        let repo = SqliteProfileRepository::new(state.db.pool().clone());
        let event_repo = SqliteProfileEventRepository::new(state.db.pool().clone());

        let mut profile = repo
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

        profile.updated_at = Utc::now();
        repo.update(&profile).await?;
        event_repo.insert(id, "profile_updated", None).await?;

        self.to_dto(state, profile).await
    }

    pub async fn archive(&self, state: &AppState, id: &str) -> Result<(), AppError> {
        validate_profile_id(id)?;
        let repo = SqliteProfileRepository::new(state.db.pool().clone());
        let instance_repo = SqliteBrowserInstanceRepository::new(state.db.pool().clone());
        let event_repo = SqliteProfileEventRepository::new(state.db.pool().clone());

        let profile = repo
            .find_by_id(id)
            .await?
            .ok_or(AppError::ProfileNotFound)?;

        if profile.is_archived {
            return Ok(());
        }

        if instance_repo.find_active_by_profile(id).await?.is_some() {
            return Err(AppError::ProfileRunning);
        }

        repo.archive(id).await?;
        event_repo.insert(id, "profile_archived", None).await?;
        Ok(())
    }

    pub async fn list_events(
        &self,
        state: &AppState,
        id: &str,
    ) -> Result<Vec<ProfileEventDto>, AppError> {
        validate_profile_id(id)?;
        let event_repo = SqliteProfileEventRepository::new(state.db.pool().clone());
        event_repo.list_by_profile(id, 50).await
    }

    pub fn lock_profile(&self, profile_id: &str) -> Result<ProfileLockGuard<'_>, AppError> {
        let mut locks = self
            .launch_locks
            .lock()
            .map_err(|_| AppError::InvalidConfiguration("profile lock poisoned".into()))?;

        if locks.contains_key(profile_id) {
            return Err(AppError::ProfileAlreadyRunning);
        }

        locks.insert(profile_id.to_string(), ());
        Ok(ProfileLockGuard {
            profile_id: profile_id.to_string(),
            locks: &self.launch_locks,
        })
    }

    pub fn derive_state(
        is_archived: bool,
        active: Option<&crate::domain::profile::BrowserInstance>,
    ) -> String {
        if is_archived {
            return ProfileDisplayState::Archived.as_str().to_string();
        }

        if let Some(instance) = active {
            if instance.state.is_active() {
                return ProfileDisplayState::Running.as_str().to_string();
            }
            if matches!(
                instance.state,
                crate::domain::profile::InstanceState::Failed
            ) {
                return ProfileDisplayState::Error.as_str().to_string();
            }
        }

        ProfileDisplayState::Ready.as_str().to_string()
    }

    async fn to_dto(&self, state: &AppState, profile: Profile) -> Result<ProfileDto, AppError> {
        let instance_repo = SqliteBrowserInstanceRepository::new(state.db.pool().clone());
        let tag_repo = SqliteTagRepository::new(state.db.pool().clone());
        let group_repo = SqliteProfileGroupRepository::new(state.db.pool().clone());
        let assignment_repo = SqliteProfileProxyAssignmentRepository::new(state.db.pool().clone());

        let active = instance_repo.find_active_by_profile(&profile.id).await?;
        let last_opened = instance_repo.last_stopped_at(&profile.id).await?;
        let tags = tag_repo.list_profile_tag_names(&profile.id).await?;
        let group_name = if let Some(group_id) = &profile.group_id {
            group_repo
                .find_by_id(group_id)
                .await?
                .map(|group| group.name)
        } else {
            None
        };
        let assignment = assignment_repo.find_by_profile(&profile.id).await?;
        let proxy_id = assignment.as_ref().map(|value| value.proxy_id.clone());
        let proxy_name = if let Some(proxy_id) = &proxy_id {
            SqliteProxyRepository::new(state.db.pool().clone())
                .find_by_id(proxy_id)
                .await?
                .map(|proxy| proxy.name)
        } else {
            None
        };

        Ok(ProfileDto {
            id: profile.id,
            display_id: profile.display_id,
            name: profile.name,
            description: profile.description,
            group_id: profile.group_id,
            group_name,
            tags,
            remark: profile.remark,
            notes: profile.notes,
            platform_label: profile.platform_label,
            state: Self::derive_state(profile.is_archived, active.as_ref()),
            is_archived: profile.is_archived,
            pid: active.as_ref().and_then(|i| i.pid),
            instance_id: active.map(|i| i.id),
            proxy_id,
            proxy_name,
            last_opened_at: last_opened.map(|dt| dt.to_rfc3339()),
            created_at: profile.created_at.to_rfc3339(),
            updated_at: profile.updated_at.to_rfc3339(),
        })
    }
}

pub struct ProfileLockGuard<'a> {
    profile_id: String,
    locks: &'a std::sync::Mutex<std::collections::HashMap<String, ()>>,
}

impl Drop for ProfileLockGuard<'_> {
    fn drop(&mut self) {
        if let Ok(mut locks) = self.locks.lock() {
            locks.remove(&self.profile_id);
        }
    }
}
