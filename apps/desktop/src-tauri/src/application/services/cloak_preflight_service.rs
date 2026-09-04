use crate::application::services::{
    CloakConfigResolver, CloakInstallationService, DeviceSettingsService,
};
use crate::domain::cloak::{PreflightResult, PreflightWarning};
use crate::domain::device::{is_wsl, DeviceConfigurationMode, DevicePlatform};
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

        let device_settings = DeviceSettingsService::get_or_create(state, profile_id).await?;
        let host = DevicePlatform::host_platform();
        if let Some(platform) = device_settings.platform {
            if platform != host {
                warnings.push(PreflightWarning {
                    code: "DEVICE_PLATFORM_HOST_MISMATCH".into(),
                    message: format!(
                        "Profile platform is {} but this machine is {}. Cross-platform spoofing typically scores 15-35 on FingerprintJS. Use a {} profile for scores under 10.",
                        platform.label(),
                        host.label(),
                        host.label()
                    ),
                });
            }
        }

        if is_wsl()
            && device_settings
                .platform
                .is_some_and(|platform| platform != host)
        {
            warnings.push(PreflightWarning {
                code: "WSL_CROSS_PLATFORM".into(),
                message: "Running from WSL: only Linux automatic profiles score well. Windows/macOS profiles launched from WSL are detected as VM/tampering.".into(),
            });
        }

        if device_settings.mode == DeviceConfigurationMode::Custom
            && (device_settings.screen_width.is_none() || device_settings.screen_height.is_none())
        {
            warnings.push(PreflightWarning {
                code: "DEVICE_SCREEN_INCOMPLETE".into(),
                message: "Custom device profile is missing screen dimensions. CloakBrowser recommends matching screen size and window-size to avoid VM detection.".into(),
            });
        }

        let assignment_repo =
            crate::infrastructure::database::SqliteProfileProxyAssignmentRepository::new(
                state.db.pool().clone(),
            );
        if assignment_repo.find_by_profile(profile_id).await?.is_none() {
            warnings.push(PreflightWarning {
                code: "NO_PROXY_ASSIGNED".into(),
                message: "No proxy assigned. FingerprintJS commonly flags raw ISP/VPN IPs (suspect score +4 to +10). Use a residential proxy with timezone/locale aligned to the exit IP for lower scores.".into(),
            });
        }

        warnings.push(PreflightWarning {
            code: "FPJS_BINARY_VERSION".into(),
            message: "Tampering/VM scores below 10 require CloakBrowser Chromium 151. Save a license key to %USERPROFILE%\\.cloakbrowser\\license.key (or set CLOAKBROWSER_LICENSE_KEY), reinstall runtime from Settings, then relaunch.".into(),
        });

        Ok(PreflightResult { ready, warnings })
    }
}
