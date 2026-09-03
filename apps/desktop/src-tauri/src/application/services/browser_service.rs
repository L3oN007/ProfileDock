use std::time::Duration;

use chrono::Utc;
use uuid::Uuid;

use crate::application::services::browser_provider::{BrowserProvider, CloakBrowserProvider};
use crate::application::services::ProfileService;
use crate::domain::profile::{
    BrowserInstance, BrowserInstanceDto, BrowserLaunchRequest, InstanceState,
};
use crate::domain::BrowserStatus;
use crate::error::AppError;
use crate::infrastructure::database::{
    MetadataRepository, SqliteBrowserInstanceRepository, SqliteProfileEventRepository,
    SqliteProfileRepository,
};
use crate::infrastructure::filesystem::ConfigStore;
use crate::infrastructure::process::ProcessManager;
use crate::state::AppState;

pub struct BrowserService {
    provider: CloakBrowserProvider,
}

impl BrowserService {
    pub fn new() -> Self {
        Self {
            provider: CloakBrowserProvider,
        }
    }

    pub async fn status(&self, state: &AppState) -> Result<BrowserStatus, AppError> {
        let configured = self.configured_path(state).await?;
        self.provider.status(configured.as_deref())
    }

    pub async fn set_executable(
        &self,
        state: &AppState,
        path: String,
    ) -> Result<BrowserStatus, AppError> {
        self.provider
            .validate_executable(std::path::Path::new(&path))?;

        let metadata = MetadataRepository::new(state.db.pool().clone());
        metadata.set("browser_executable", &path).await?;

        let mut config = ConfigStore::load(&state.paths.config, &metadata).await?;
        config.browser_executable = Some(path.clone());
        ConfigStore::save(&state.paths.config, &config)?;

        self.provider.status(Some(&path))
    }

    pub async fn launch_profile(
        &self,
        state: &AppState,
        profile_service: &ProfileService,
        profile_id: &str,
    ) -> Result<BrowserInstanceDto, AppError> {
        let _lock = profile_service.lock_profile(profile_id)?;

        let profile_repo = SqliteProfileRepository::new(state.db.pool().clone());
        let instance_repo = SqliteBrowserInstanceRepository::new(state.db.pool().clone());
        let event_repo = SqliteProfileEventRepository::new(state.db.pool().clone());

        let profile = profile_repo
            .find_by_id(profile_id)
            .await?
            .ok_or(AppError::ProfileNotFound)?;

        if profile.is_archived {
            return Err(AppError::ProfileArchived);
        }

        if instance_repo
            .find_active_by_profile(profile_id)
            .await?
            .is_some()
        {
            return Err(AppError::ProfileAlreadyRunning);
        }

        let executable = self
            .configured_path(state)
            .await?
            .and_then(|path| {
                let candidate = std::path::PathBuf::from(path);
                if candidate.exists() {
                    Some(candidate)
                } else {
                    None
                }
            })
            .or_else(|| self.provider.detect(None).ok().flatten())
            .ok_or(AppError::BrowserNotFound)?;

        let settings = profile_repo
            .get_settings(profile_id)
            .await?
            .ok_or(AppError::ProfileNotFound)?;

        let paths = state.paths.profile(profile_id)?;
        let instance_id = Uuid::new_v4().to_string();
        let now = Utc::now();

        let mut instance = BrowserInstance {
            id: instance_id.clone(),
            profile_id: profile_id.to_string(),
            pid: None,
            state: InstanceState::Starting,
            started_at: Some(now),
            stopped_at: None,
            exit_code: None,
            error_message: None,
            created_at: now,
            updated_at: now,
        };

        instance_repo.insert(&instance).await?;

        let spec = self.provider.build_launch_spec(
            &executable,
            BrowserLaunchRequest {
                profile_id: profile_id.to_string(),
                user_data_dir: paths.browser_data,
                download_dir: paths.downloads,
                startup_urls: settings.startup_urls,
            },
            instance_id.clone(),
        )?;

        let managed = match state.process_manager.spawn_spec(&spec) {
            Ok(managed) => managed,
            Err(error) => {
                instance.state = InstanceState::Failed;
                instance.stopped_at = Some(Utc::now());
                instance.error_message = Some(error.to_string());
                instance_repo.update(&instance).await?;
                return Err(error);
            }
        };

        instance.pid = Some(managed.pid);
        instance.state = InstanceState::Running;
        instance.updated_at = Utc::now();
        instance_repo.update(&instance).await?;

        event_repo
            .insert(
                profile_id,
                "browser_started",
                Some(serde_json::json!({ "pid": managed.pid, "instance_id": instance_id })),
            )
            .await?;

        Ok(to_instance_dto(&instance))
    }

    pub async fn stop_profile(&self, state: &AppState, profile_id: &str) -> Result<(), AppError> {
        let instance_repo = SqliteBrowserInstanceRepository::new(state.db.pool().clone());
        let event_repo = SqliteProfileEventRepository::new(state.db.pool().clone());

        let mut instance = instance_repo
            .find_active_by_profile(profile_id)
            .await?
            .ok_or(AppError::ProfileNotRunning)?;

        instance.state = InstanceState::Stopping;
        instance.updated_at = Utc::now();
        instance_repo.update(&instance).await?;

        if let Some(managed) = state.process_manager.list_by_instance_id(&instance.id)? {
            let exit_code = state
                .process_manager
                .terminate(&managed.id, Duration::from_secs(8))?;
            instance.exit_code = Some(exit_code);
        }

        instance.state = InstanceState::Stopped;
        instance.stopped_at = Some(Utc::now());
        instance.updated_at = Utc::now();
        instance.pid = None;
        instance_repo.update(&instance).await?;

        event_repo
            .insert(profile_id, "browser_stopped", None)
            .await?;

        Ok(())
    }

    pub async fn get_instance(
        &self,
        state: &AppState,
        profile_id: &str,
    ) -> Result<Option<BrowserInstanceDto>, AppError> {
        let instance_repo = SqliteBrowserInstanceRepository::new(state.db.pool().clone());
        let instance = instance_repo.find_active_by_profile(profile_id).await?;
        Ok(instance.as_ref().map(to_instance_dto))
    }

    pub async fn reconcile_instances(&self, state: &AppState) -> Result<(), AppError> {
        let instance_repo = SqliteBrowserInstanceRepository::new(state.db.pool().clone());
        let instances = instance_repo.list_running_states().await?;

        for mut instance in instances {
            let alive = instance
                .pid
                .map(ProcessManager::is_pid_alive)
                .unwrap_or(false);

            if alive {
                continue;
            }

            instance.state = InstanceState::Stopped;
            instance.stopped_at = Some(Utc::now());
            instance.updated_at = Utc::now();
            instance.pid = None;
            instance_repo.update(&instance).await?;
        }

        Ok(())
    }

    pub async fn poll_process_exits(&self, state: &AppState) -> Result<(), AppError> {
        let exited = state.process_manager.poll_exited()?;
        if exited.is_empty() {
            return Ok(());
        }

        let instance_repo = SqliteBrowserInstanceRepository::new(state.db.pool().clone());
        let event_repo = SqliteProfileEventRepository::new(state.db.pool().clone());

        for exit in exited {
            let Some(instance_id) = exit.instance_id else {
                continue;
            };

            let Some(mut instance) = instance_repo.find_by_id(&instance_id).await? else {
                continue;
            };

            if !instance.state.is_active() {
                continue;
            }

            instance.state = if exit.exit_code == 0 {
                InstanceState::Stopped
            } else {
                InstanceState::Crashed
            };
            instance.stopped_at = Some(Utc::now());
            instance.updated_at = Utc::now();
            instance.exit_code = Some(exit.exit_code);
            instance.pid = None;
            instance_repo.update(&instance).await?;

            let event_type = if exit.exit_code == 0 {
                "browser_stopped"
            } else {
                "browser_crashed"
            };
            event_repo
                .insert(
                    &instance.profile_id,
                    event_type,
                    Some(serde_json::json!({ "exit_code": exit.exit_code })),
                )
                .await?;
        }

        Ok(())
    }

    async fn configured_path(&self, state: &AppState) -> Result<Option<String>, AppError> {
        let metadata = MetadataRepository::new(state.db.pool().clone());
        metadata.get("browser_executable").await
    }
}

fn to_instance_dto(instance: &BrowserInstance) -> BrowserInstanceDto {
    BrowserInstanceDto {
        id: instance.id.clone(),
        profile_id: instance.profile_id.clone(),
        pid: instance.pid,
        state: instance.state.as_str().to_string(),
        started_at: instance.started_at.map(|dt| dt.to_rfc3339()),
        stopped_at: instance.stopped_at.map(|dt| dt.to_rfc3339()),
        exit_code: instance.exit_code,
        error_message: instance.error_message.clone(),
    }
}
