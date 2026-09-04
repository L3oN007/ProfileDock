use std::time::Duration;

use chrono::Utc;
use uuid::Uuid;

use crate::application::services::{
    CloakConfigResolver, CloakInstallationService, CloakLaunchBuilder, CloakPreflightService,
    ProfileService,
};
use crate::domain::cloak::ConfigSnapshot;
use crate::domain::profile::{BrowserInstance, BrowserInstanceDto, InstanceState};
use crate::domain::BrowserStatus;
use crate::error::AppError;
use crate::infrastructure::cloak::ensure_default_search_engine;
use crate::infrastructure::database::{
    MetadataRepository, SqliteBrowserInstanceRepository, SqliteBrowserSettingsRepository,
    SqliteProfileEventRepository,
};
use crate::infrastructure::process::ProcessManager;
use crate::state::AppState;

const STARTUP_OBSERVATION_MS: u64 = 500;

pub struct BrowserService;

impl BrowserService {
    pub fn new() -> Self {
        Self
    }

    pub async fn status(&self, state: &AppState) -> Result<BrowserStatus, AppError> {
        let installation = CloakInstallationService::get_installation(state).await?;
        let status = if installation.valid {
            crate::domain::BrowserDetectionStatus::Detected
        } else if installation.executable.is_some() {
            crate::domain::BrowserDetectionStatus::Invalid
        } else {
            crate::domain::BrowserDetectionStatus::NotDetected
        };

        Ok(BrowserStatus {
            provider: "CloakBrowser".to_string(),
            status,
            executable: installation.executable,
            version: installation.version,
        })
    }

    pub async fn set_executable(
        &self,
        state: &AppState,
        path: String,
    ) -> Result<BrowserStatus, AppError> {
        let installation = CloakInstallationService::set_executable(state, path).await?;

        Ok(BrowserStatus {
            provider: "CloakBrowser".to_string(),
            status: if installation.valid {
                crate::domain::BrowserDetectionStatus::Detected
            } else {
                crate::domain::BrowserDetectionStatus::Invalid
            },
            executable: installation.executable,
            version: installation.version,
        })
    }

    pub async fn launch_profile(
        &self,
        state: &AppState,
        profile_service: &ProfileService,
        profile_id: &str,
    ) -> Result<BrowserInstanceDto, AppError> {
        let _lock = profile_service.lock_profile(profile_id)?;
        let preflight = CloakPreflightService::check(state, profile_id).await?;
        if !preflight.ready {
            let event_repo = SqliteProfileEventRepository::new(state.db.pool().clone());
            event_repo
                .insert(
                    profile_id,
                    "browser_preflight_failed",
                    Some(serde_json::json!({ "warnings": preflight.warnings })),
                )
                .await?;
            return Err(AppError::CloakConfigInvalid(
                "browser preflight checks failed".into(),
            ));
        }

        let installation = CloakInstallationService::resolve_installation(state)
            .await?
            .ok_or(AppError::CloakExecutableNotFound)?;

        let (launch_config, browser_settings, device_settings) =
            CloakConfigResolver::resolve(state, profile_id).await?;

        ensure_default_search_engine(&launch_config.user_data_dir)?;

        let instance_repo = SqliteBrowserInstanceRepository::new(state.db.pool().clone());
        let event_repo = SqliteProfileEventRepository::new(state.db.pool().clone());

        let instance_id = Uuid::new_v4().to_string();
        let now = Utc::now();
        let metadata = MetadataRepository::new(state.db.pool().clone());
        let cloak_runtime_id = metadata.get("cloak_active_runtime_id").await?;

        let snapshot = ConfigSnapshot::from_launch_config(
            &launch_config,
            &browser_settings.download_mode,
            launch_config.proxy_id.clone(),
            cloak_runtime_id,
            &device_settings,
        );
        let snapshot_json = serde_json::to_string(&snapshot)?;

        let mut instance = BrowserInstance {
            id: instance_id.clone(),
            profile_id: profile_id.to_string(),
            pid: None,
            state: InstanceState::Starting,
            started_at: Some(now),
            stopped_at: None,
            exit_code: None,
            error_message: None,
            config_snapshot_json: Some(snapshot_json),
            created_at: now,
            updated_at: now,
        };

        instance_repo.insert(&instance).await?;
        event_repo
            .insert(profile_id, "browser_launch_started", None)
            .await?;

        let builder = CloakLaunchBuilder::new(installation);
        let spec = builder.build(&launch_config, instance_id.clone())?;

        let managed = match state.process_manager.spawn_spec(&spec) {
            Ok(managed) => managed,
            Err(error) => {
                instance.state = InstanceState::Failed;
                instance.stopped_at = Some(Utc::now());
                instance.error_message = Some(error.to_string());
                instance_repo.update(&instance).await?;
                event_repo
                    .insert(
                        profile_id,
                        "browser_launch_failed",
                        Some(serde_json::json!({ "error": error.to_string() })),
                    )
                    .await?;
                return Err(error);
            }
        };

        instance.pid = Some(managed.pid);
        instance.updated_at = Utc::now();
        instance_repo.update(&instance).await?;

        tokio::time::sleep(Duration::from_millis(STARTUP_OBSERVATION_MS)).await;

        let alive = instance
            .pid
            .map(ProcessManager::is_pid_alive)
            .unwrap_or(false);

        if !alive {
            instance.state = InstanceState::Failed;
            instance.stopped_at = Some(Utc::now());
            instance.error_message = Some("CloakBrowser exited during startup".into());
            instance.pid = None;
            instance_repo.update(&instance).await?;
            event_repo
                .insert(
                    profile_id,
                    "browser_launch_failed",
                    Some(serde_json::json!({ "reason": "early_exit" })),
                )
                .await?;
            return Err(AppError::CloakProcessExitedEarly);
        }

        instance.state = InstanceState::Running;
        instance.updated_at = Utc::now();
        instance_repo.update(&instance).await?;

        event_repo
            .insert(
                profile_id,
                "browser_launch_success",
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

    pub async fn get_browser_settings(
        &self,
        state: &AppState,
        profile_id: &str,
    ) -> Result<crate::domain::profile::ProfileBrowserSettingsDto, AppError> {
        let settings_repo = SqliteBrowserSettingsRepository::new(state.db.pool().clone());
        let settings = settings_repo
            .get(profile_id)
            .await?
            .ok_or(AppError::ProfileNotFound)?;
        Ok(settings.to_dto())
    }

    pub async fn update_browser_settings(
        &self,
        state: &AppState,
        profile_id: &str,
        input: crate::domain::profile::UpdateBrowserSettingsInput,
    ) -> Result<crate::domain::profile::ProfileBrowserSettingsDto, AppError> {
        let instance_repo = SqliteBrowserInstanceRepository::new(state.db.pool().clone());
        if instance_repo
            .find_active_by_profile(profile_id)
            .await?
            .is_some()
        {
            return Err(AppError::ProfileRunning);
        }

        let settings_repo = SqliteBrowserSettingsRepository::new(state.db.pool().clone());
        let settings = settings_repo.update(profile_id, input).await?;

        let event_repo = SqliteProfileEventRepository::new(state.db.pool().clone());
        event_repo
            .insert(profile_id, "browser_settings_updated", None)
            .await?;

        Ok(settings.to_dto())
    }

    pub async fn preflight(
        &self,
        state: &AppState,
        profile_id: &str,
    ) -> Result<crate::domain::cloak::PreflightResult, AppError> {
        CloakPreflightService::check(state, profile_id).await
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
