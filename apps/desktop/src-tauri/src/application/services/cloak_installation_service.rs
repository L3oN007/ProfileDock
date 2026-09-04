use std::path::{Path, PathBuf};
use std::process::Command;

use chrono::Utc;

use crate::domain::cloak::{
    CloakCapabilities, CloakInstallation, CloakInstallationDto, CloakValidationResult,
    DiscoveredCloakInstallationDto,
};
use crate::application::services::CloakRuntimeManager;
use crate::error::AppError;
use crate::infrastructure::cloak::{
    cloak_cache_dir, discover_best_installation, discover_installations,
    validate_installation_root, DiscoveredCloakInstallation,
};
use crate::infrastructure::database::MetadataRepository;
use crate::infrastructure::filesystem::ConfigStore;
use crate::state::AppState;

pub struct CloakInstallationService;

impl CloakInstallationService {
    pub async fn get_installation(state: &AppState) -> Result<CloakInstallationDto, AppError> {
        match Self::resolve_installation(state).await? {
            Some(installation) => Ok(Self::to_dto(&installation, true)),
            None => Ok(CloakInstallationDto {
                executable: None,
                version: None,
                valid: false,
                compatible: false,
                last_checked_at: Utc::now().to_rfc3339(),
                source: None,
                root_dir: None,
                cache_dir: Some(cloak_cache_dir().to_string_lossy().into_owned()),
            }),
        }
    }

    pub async fn discover_installations() -> Result<Vec<DiscoveredCloakInstallationDto>, AppError> {
        Ok(discover_installations()?
            .into_iter()
            .map(Self::to_discovered_dto)
            .collect())
    }

    pub async fn auto_configure(state: &AppState) -> Result<CloakInstallationDto, AppError> {
        let best = discover_best_installation()?.ok_or(AppError::CloakNotInstalled)?;
        Self::persist_installation(state, &best).await
    }

    pub async fn set_executable(
        state: &AppState,
        path: String,
    ) -> Result<CloakInstallationDto, AppError> {
        let trimmed = path.trim().to_string();
        let executable = PathBuf::from(&trimmed);
        Self::validate_executable(&executable)?;

        let root_dir = executable
            .parent()
            .ok_or_else(|| {
                AppError::CloakInstallationInvalid(
                    "executable must live inside an installation directory".into(),
                )
            })?
            .to_path_buf();
        validate_installation_root(&root_dir)?;

        let discovered = DiscoveredCloakInstallation {
            executable,
            root_dir,
            version: Self::read_version(Path::new(&trimmed)).ok().flatten(),
            source: crate::infrastructure::cloak::CloakDiscoverySource::ManualPath,
        };

        Self::persist_installation(state, &discovered).await
    }

    pub async fn validate_installation(
        state: &AppState,
    ) -> Result<CloakValidationResult, AppError> {
        match Self::resolve_installation(state).await? {
            Some(installation) => {
                let root_dir = installation
                    .executable
                    .parent()
                    .ok_or_else(|| {
                        AppError::CloakInstallationInvalid(
                            "executable must live inside an installation directory".into(),
                        )
                    })?;
                validate_installation_root(root_dir)?;

                let compatible = Self::is_compatible(installation.version.as_deref());
                Ok(CloakValidationResult {
                    valid: installation.valid,
                    compatible,
                    executable: Some(installation.executable.to_string_lossy().into_owned()),
                    version: installation.version,
                    message: if compatible {
                        Some("CloakBrowser installation is valid".into())
                    } else {
                        Some("CloakBrowser version may not be fully supported".into())
                    },
                })
            }
            None => Ok(CloakValidationResult {
                valid: false,
                compatible: false,
                executable: None,
                version: None,
                message: Some("CloakBrowser executable could not be found".into()),
            }),
        }
    }

    pub async fn get_capabilities(state: &AppState) -> Result<CloakCapabilities, AppError> {
        let installation = Self::resolve_installation(state).await?;
        Ok(Self::resolve_capabilities(installation.as_ref()))
    }

    pub async fn resolve_installation(
        state: &AppState,
    ) -> Result<Option<CloakInstallation>, AppError> {
        if let Some(runtime) = CloakRuntimeManager::active_runtime(state).await? {
            return Self::build_installation(
                runtime.executable,
                crate::infrastructure::cloak::CloakDiscoverySource::ManualPath,
            );
        }

        let metadata = MetadataRepository::new(state.db.pool().clone());
        let configured = metadata.get("browser_executable").await?;

        if let Some(path) = configured {
            let candidate = PathBuf::from(&path);
            if candidate.exists() {
                return Self::build_installation(
                    candidate,
                    crate::infrastructure::cloak::CloakDiscoverySource::ManualPath,
                );
            }
        }

        if let Some(best) = discover_best_installation()? {
            return Self::build_installation(
                best.executable,
                best.source,
            );
        }

        Ok(None)
    }

    pub fn resolve_capabilities(installation: Option<&CloakInstallation>) -> CloakCapabilities {
        let mut capabilities = CloakCapabilities::default();
        if installation.is_none() || !installation.is_some_and(|value| value.valid) {
            capabilities.startup_urls = false;
            capabilities.custom_download_dir = false;
            capabilities.proxy = false;
            capabilities.proxy_auth = false;
            capabilities.window_configuration = false;
        }
        capabilities
    }

    pub fn validate_executable(path: &Path) -> Result<(), AppError> {
        if !path.exists() {
            return Err(AppError::CloakExecutableNotFound);
        }

        if !path.is_file() {
            return Err(AppError::CloakInstallationInvalid(
                "path is not a file".into(),
            ));
        }

        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let metadata = std::fs::metadata(path)?;
            if metadata.permissions().mode() & 0o111 == 0 {
                return Err(AppError::CloakInstallationInvalid(
                    "file is not executable".into(),
                ));
            }
        }

        Ok(())
    }

    async fn persist_installation(
        state: &AppState,
        discovered: &DiscoveredCloakInstallation,
    ) -> Result<CloakInstallationDto, AppError> {
        validate_installation_root(&discovered.root_dir)?;
        Self::validate_executable(&discovered.executable)?;

        let executable = discovered.executable.to_string_lossy().into_owned();
        let version = discovered
            .version
            .clone()
            .or_else(|| Self::read_version(&discovered.executable).ok().flatten());

        let metadata = MetadataRepository::new(state.db.pool().clone());
        metadata.set("browser_executable", &executable).await?;
        metadata
            .set("cloak_installation_root", &discovered.root_dir.to_string_lossy())
            .await?;
        metadata
            .set("cloak_installation_source", discovered.source.as_str())
            .await?;

        let mut config = ConfigStore::load(&state.paths.config, &metadata).await?;
        config.browser_executable = Some(executable.clone());
        ConfigStore::save(&state.paths.config, &config)?;

        let installation = CloakInstallation {
            executable: PathBuf::from(executable),
            version: version.clone(),
            valid: true,
            last_checked_at: Utc::now(),
        };

        Ok(Self::to_dto(
            &installation,
            Self::is_compatible(version.as_deref()),
        ))
    }

    fn build_installation(
        executable: PathBuf,
        _source: crate::infrastructure::cloak::CloakDiscoverySource,
    ) -> Result<Option<CloakInstallation>, AppError> {
        Self::validate_executable(&executable)?;

        if let Some(root_dir) = executable.parent() {
            validate_installation_root(root_dir)?;
        }

        let version = Self::read_version(&executable)?;
        Ok(Some(CloakInstallation {
            executable,
            version,
            valid: true,
            last_checked_at: Utc::now(),
        }))
    }

    fn read_version(executable: &Path) -> Result<Option<String>, AppError> {
        let output = Command::new(executable)
            .arg("--version")
            .output()
            .map_err(|error| AppError::CloakInstallationInvalid(error.to_string()))?;

        if !output.status.success() {
            if let Some(parent) = executable.parent().and_then(|path| path.file_name()) {
                if let Some(version) = parent
                    .to_str()
                    .and_then(|name| name.strip_prefix("chromium-"))
                {
                    return Ok(Some(version.trim_end_matches("-pro").to_string()));
                }
            }
            return Ok(None);
        }

        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if stdout.is_empty() {
            Ok(None)
        } else {
            Ok(Some(stdout))
        }
    }

    fn is_compatible(version: Option<&str>) -> bool {
        version.is_some()
    }

    fn to_dto(installation: &CloakInstallation, compatible: bool) -> CloakInstallationDto {
        let root_dir = installation
            .executable
            .parent()
            .map(|path| path.to_string_lossy().into_owned());

        CloakInstallationDto {
            executable: Some(installation.executable.to_string_lossy().into_owned()),
            version: installation.version.clone(),
            valid: installation.valid,
            compatible,
            last_checked_at: installation.last_checked_at.to_rfc3339(),
            source: Some("configured".into()),
            root_dir,
            cache_dir: Some(cloak_cache_dir().to_string_lossy().into_owned()),
        }
    }

    fn to_discovered_dto(installation: DiscoveredCloakInstallation) -> DiscoveredCloakInstallationDto {
        let valid = validate_installation_root(&installation.root_dir).is_ok();
        DiscoveredCloakInstallationDto {
            executable: installation.executable.to_string_lossy().into_owned(),
            root_dir: installation.root_dir.to_string_lossy().into_owned(),
            version: installation.version,
            source: installation.source.as_str().to_string(),
            valid,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validate_rejects_missing_executable() {
        let result = CloakInstallationService::validate_executable(Path::new("/tmp/does-not-exist-cloak"));
        assert!(matches!(
            result,
            Err(AppError::CloakExecutableNotFound) | Err(AppError::CloakInstallationInvalid(_))
        ));
    }
}
