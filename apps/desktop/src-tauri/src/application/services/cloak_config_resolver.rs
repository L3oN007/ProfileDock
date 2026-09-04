use std::path::PathBuf;

use crate::application::services::CloakInstallationService;
use crate::domain::cloak::CloakLaunchConfig;
use crate::domain::profile::{DownloadMode, ProfileBrowserSettings};
use crate::error::AppError;
use crate::infrastructure::database::{
    SqliteBrowserSettingsRepository, SqliteProfileProxyAssignmentRepository, SqliteProfileRepository,
};
use crate::infrastructure::filesystem::AppPaths;
use crate::state::AppState;

pub struct CloakConfigResolver;

impl CloakConfigResolver {
    pub async fn resolve(
        state: &AppState,
        profile_id: &str,
    ) -> Result<(CloakLaunchConfig, ProfileBrowserSettings), AppError> {
        let profile_repo = SqliteProfileRepository::new(state.db.pool().clone());
        let settings_repo = SqliteBrowserSettingsRepository::new(state.db.pool().clone());
        let assignment_repo =
            SqliteProfileProxyAssignmentRepository::new(state.db.pool().clone());

        let profile = profile_repo
            .find_by_id(profile_id)
            .await?
            .ok_or(AppError::ProfileNotFound)?;

        if profile.is_archived {
            return Err(AppError::ProfileArchived);
        }

        let settings = settings_repo
            .get(profile_id)
            .await?
            .ok_or(AppError::ProfileNotFound)?;

        let download_dir = resolve_download_dir(&state.paths, profile_id, &settings)?;
        let paths = state.paths.profile(profile_id)?;

        let assignment = assignment_repo.find_by_profile(profile_id).await?;
        let resolved_proxy = if let Some(assignment) = assignment {
            let proxy = state
                .proxy_service
                .resolve_for_profile(state, profile_id)
                .await?;
            (proxy, Some(assignment.proxy_id))
        } else {
            (None, None)
        };

        let installation = CloakInstallationService::resolve_installation(state).await?;

        Ok((
            CloakLaunchConfig {
                profile_id: profile_id.to_string(),
                user_data_dir: paths.browser_data,
                download_dir,
                startup_urls: settings.startup_urls.clone(),
                proxy: resolved_proxy.0,
                proxy_id: resolved_proxy.1,
                window_mode: settings.window_mode.clone(),
                restore_session: settings.restore_session,
                cloak_version: installation.and_then(|value| value.version),
            },
            settings,
        ))
    }
}

fn resolve_download_dir(
    paths: &AppPaths,
    profile_id: &str,
    settings: &ProfileBrowserSettings,
) -> Result<PathBuf, AppError> {
    match settings.download_mode {
        DownloadMode::Profile => Ok(paths.profile(profile_id)?.downloads),
        DownloadMode::Custom => settings
            .custom_download_dir
            .clone()
            .ok_or_else(|| {
                AppError::CloakConfigInvalid("custom download directory is required".into())
            }),
    }
}

#[cfg(test)]
mod tests {
    use chrono::Utc;

    use super::*;
    use crate::domain::profile::{DownloadMode, WindowMode};

    #[test]
    fn resolve_download_dir_uses_profile_downloads_by_default() {
        let paths = AppPaths {
            root: std::env::temp_dir().join("profiledock-test"),
            database: std::env::temp_dir().join("profiledock-test/profiledock.db"),
            logs: std::env::temp_dir().join("profiledock-test/logs"),
            profiles: std::env::temp_dir().join("profiledock-test/profiles"),
            browsers: std::env::temp_dir().join("profiledock-test/browsers"),
            cache: std::env::temp_dir().join("profiledock-test/cache"),
            temp: std::env::temp_dir().join("profiledock-test/temp"),
            config: std::env::temp_dir().join("profiledock-test/config.json"),
            secrets: std::env::temp_dir().join("profiledock-test/secrets"),
            runtimes: std::env::temp_dir().join("profiledock-test/runtimes/cloak"),
            runtime_downloads: std::env::temp_dir().join("profiledock-test/runtimes/downloads"),
        };

        let profile_id = uuid::Uuid::new_v4().to_string();
        let settings = ProfileBrowserSettings {
            profile_id: profile_id.clone(),
            startup_urls: vec![],
            download_mode: DownloadMode::Profile,
            custom_download_dir: None,
            window_mode: WindowMode::Normal,
            restore_session: true,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };

        let download_dir = resolve_download_dir(&paths, &profile_id, &settings).unwrap();
        assert!(download_dir.ends_with("downloads"));
    }
}
