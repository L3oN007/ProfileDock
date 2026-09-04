use std::path::PathBuf;

use crate::application::services::{CloakInstallationService, DeviceSettingsService};
use crate::domain::cloak::CloakLaunchConfig;
use crate::domain::device::{DeviceConfigResolver, EnvironmentMode, ProfileDeviceSettings};
use crate::domain::profile::{DownloadMode, ProfileBrowserSettings};
use crate::error::AppError;
use crate::infrastructure::database::{
    SqliteBrowserSettingsRepository, SqliteProfileProxyAssignmentRepository,
    SqliteProfileRepository,
};
use crate::infrastructure::filesystem::AppPaths;
use crate::infrastructure::network::{resolve_direct, resolve_through_proxy};
use crate::infrastructure::system::host_display::primary_display_size;
use crate::state::AppState;

pub struct CloakConfigResolver;

impl CloakConfigResolver {
    pub async fn resolve(
        state: &AppState,
        profile_id: &str,
    ) -> Result<
        (
            CloakLaunchConfig,
            ProfileBrowserSettings,
            ProfileDeviceSettings,
        ),
        AppError,
    > {
        let profile_repo = SqliteProfileRepository::new(state.db.pool().clone());
        let settings_repo = SqliteBrowserSettingsRepository::new(state.db.pool().clone());
        let assignment_repo = SqliteProfileProxyAssignmentRepository::new(state.db.pool().clone());

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
        let device_settings =
            DeviceSettingsService::normalize_cross_platform_for_fpjs(state, profile_id).await?;
        let capabilities = CloakInstallationService::get_capabilities(state).await?;
        let has_proxy = resolved_proxy.0.is_some();
        let mut resolved_device =
            DeviceConfigResolver::resolve(&device_settings, &capabilities, has_proxy);

        apply_geoip(
            &device_settings,
            has_proxy,
            resolved_proxy.0.as_ref(),
            &mut resolved_device,
        )
        .await;

        let host_display = primary_display_size();

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
                host_screen_width: host_display.map(|size| size.width),
                host_screen_height: host_display.map(|size| size.height),
                device: resolved_device,
            },
            settings,
            device_settings,
        ))
    }
}

async fn apply_geoip(
    device_settings: &ProfileDeviceSettings,
    has_proxy: bool,
    proxy: Option<&crate::domain::proxy::ResolvedBrowserProxy>,
    resolved_device: &mut crate::domain::device::ResolvedDeviceConfig,
) {
    let geo = if let Some(proxy) = proxy.filter(|_| has_proxy) {
        resolve_through_proxy(proxy).await.ok()
    } else if device_settings.timezone_mode != EnvironmentMode::Custom
        || device_settings.locale_mode != EnvironmentMode::Custom
    {
        resolve_direct().await.ok()
    } else {
        None
    };

    let Some(geo) = geo else {
        return;
    };

    if device_settings.timezone_mode != EnvironmentMode::Custom {
        resolved_device.timezone = Some(geo.timezone);
    }
    if device_settings.locale_mode != EnvironmentMode::Custom {
        resolved_device.locale = Some(geo.locale);
    }
}

fn resolve_download_dir(
    paths: &AppPaths,
    profile_id: &str,
    settings: &ProfileBrowserSettings,
) -> Result<PathBuf, AppError> {
    match settings.download_mode {
        DownloadMode::Profile => Ok(paths.profile(profile_id)?.downloads),
        DownloadMode::Custom => settings.custom_download_dir.clone().ok_or_else(|| {
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
