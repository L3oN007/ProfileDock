use crate::application::services::{CloakConfigResolver, CloakInstallationService};
use crate::domain::cloak::{PreflightResult, PreflightWarning};
use crate::error::AppError;
use crate::infrastructure::database::{
    SqliteBrowserInstanceRepository, SqliteBrowserSettingsRepository, SqliteProfileRepository,
};
use crate::state::AppState;

pub struct CloakPreflightService;

impl CloakPreflightService {
    pub async fn check(state: &AppState, profile_id: &str) -> Result<PreflightResult, AppError> {
        let mut warnings = Vec::new();
        let mut ready = true;

        let installation = CloakInstallationService::resolve_installation(state).await?;
        if installation.is_none() {
            return Err(AppError::CloakExecutableNotFound);
        }

        let profile_repo = SqliteProfileRepository::new(state.db.pool().clone());
        let settings_repo = SqliteBrowserSettingsRepository::new(state.db.pool().clone());
        let instance_repo = SqliteBrowserInstanceRepository::new(state.db.pool().clone());

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

        let settings = settings_repo
            .get(profile_id)
            .await?
            .ok_or(AppError::ProfileNotFound)?;

        let paths = state.paths.profile(profile_id)?;
        for (label, path) in [
            ("browser data", paths.browser_data.as_path()),
            ("downloads", paths.downloads.as_path()),
        ] {
            if !path.exists() {
                std::fs::create_dir_all(path).map_err(|error| {
                    AppError::CloakProfileDirectoryInvalid(format!(
                        "{label} directory is not writable: {error}"
                    ))
                })?;
            }
        }

        if settings.download_mode == crate::domain::profile::DownloadMode::Custom {
            if let Some(custom_dir) = &settings.custom_download_dir {
                if !custom_dir.exists() {
                    ready = false;
                    warnings.push(PreflightWarning {
                        code: "CUSTOM_DOWNLOAD_DIR_MISSING".into(),
                        message: "Custom download directory does not exist".into(),
                    });
                }
            } else {
                ready = false;
            }
        }

        if let Err(error) = CloakConfigResolver::resolve(state, profile_id).await {
            ready = false;
            warnings.push(PreflightWarning {
                code: "CONFIG_RESOLUTION_FAILED".into(),
                message: error.to_string(),
            });
        }

        Ok(PreflightResult { ready, warnings })
    }
}
