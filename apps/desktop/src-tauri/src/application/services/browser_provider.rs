use std::path::{Path, PathBuf};
use std::process::Command;

use crate::domain::profile::BrowserLaunchRequest;
use crate::domain::{BrowserDetectionStatus, BrowserStatus};
use crate::error::AppError;
use crate::infrastructure::process::{ProcessSpec, ProcessType};

pub trait BrowserProvider: Send + Sync {
    fn name(&self) -> &'static str;
    fn detect(&self, configured_path: Option<&str>) -> Result<Option<PathBuf>, AppError>;
    fn version(&self, executable: &Path) -> Result<Option<String>, AppError>;
    fn validate_executable(&self, path: &Path) -> Result<(), AppError>;
    fn build_launch_spec(
        &self,
        executable: &Path,
        request: BrowserLaunchRequest,
        instance_id: String,
    ) -> Result<ProcessSpec, AppError>;
    fn status(&self, configured_path: Option<&str>) -> Result<BrowserStatus, AppError> {
        let detected = self.detect(configured_path)?;
        let executable = detected
            .as_ref()
            .map(|path| path.to_string_lossy().into_owned());

        let (status, version) = match detected {
            Some(path) => match self.validate_executable(&path) {
                Ok(()) => (
                    BrowserDetectionStatus::Detected,
                    self.version(&path).ok().flatten(),
                ),
                Err(_) => (BrowserDetectionStatus::Invalid, None),
            },
            None => (BrowserDetectionStatus::NotDetected, None),
        };

        Ok(BrowserStatus {
            provider: self.name().to_string(),
            status,
            executable,
            version,
        })
    }
}

pub struct CloakBrowserProvider;

impl BrowserProvider for CloakBrowserProvider {
    fn name(&self) -> &'static str {
        "CloakBrowser"
    }

    fn detect(&self, configured_path: Option<&str>) -> Result<Option<PathBuf>, AppError> {
        if let Some(path) = configured_path {
            let candidate = PathBuf::from(path);
            if candidate.exists() {
                return Ok(Some(candidate));
            }
        }

        for candidate in default_candidate_paths() {
            if candidate.exists() {
                return Ok(Some(candidate));
            }
        }

        Ok(None)
    }

    fn version(&self, executable: &Path) -> Result<Option<String>, AppError> {
        let output = Command::new(executable)
            .arg("--version")
            .output()
            .map_err(|error| AppError::InvalidBrowserExecutable(error.to_string()))?;

        if !output.status.success() {
            return Ok(None);
        }

        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if stdout.is_empty() {
            Ok(None)
        } else {
            Ok(Some(stdout))
        }
    }

    fn validate_executable(&self, path: &Path) -> Result<(), AppError> {
        if !path.exists() {
            return Err(AppError::InvalidBrowserExecutable(
                "executable does not exist".into(),
            ));
        }

        if !path.is_file() {
            return Err(AppError::InvalidBrowserExecutable(
                "path is not a file".into(),
            ));
        }

        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let metadata = std::fs::metadata(path)?;
            if metadata.permissions().mode() & 0o111 == 0 {
                return Err(AppError::InvalidBrowserExecutable(
                    "file is not executable".into(),
                ));
            }
        }

        Ok(())
    }

    fn build_launch_spec(
        &self,
        executable: &Path,
        request: BrowserLaunchRequest,
        instance_id: String,
    ) -> Result<ProcessSpec, AppError> {
        self.validate_executable(executable)?;

        let mut args = vec![
            format!(
                "--user-data-dir={}",
                request.user_data_dir.to_string_lossy()
            ),
            format!("--download-dir={}", request.download_dir.to_string_lossy()),
            "--no-first-run".to_string(),
            "--no-default-browser-check".to_string(),
        ];

        for url in request.startup_urls {
            args.push(url);
        }

        Ok(ProcessSpec {
            executable: executable.to_path_buf(),
            args,
            working_dir: None,
            process_type: ProcessType::Browser,
            profile_id: request.profile_id,
            instance_id,
        })
    }
}

fn default_candidate_paths() -> Vec<PathBuf> {
    let mut paths = Vec::new();

    if let Some(home) = dirs::home_dir() {
        paths.push(home.join(".local/bin/cloak-browser"));
        paths.push(home.join(".local/bin/cloak"));
        paths.push(home.join("bin/cloak-browser"));
    }

    paths.push(PathBuf::from("/usr/local/bin/cloak-browser"));
    paths.push(PathBuf::from("/usr/bin/cloak-browser"));

    #[cfg(target_os = "windows")]
    {
        if let Some(local_app_data) = dirs::data_local_dir() {
            paths.push(local_app_data.join("CloakBrowser/cloak.exe"));
        }
        paths.push(PathBuf::from(r"C:\Program Files\CloakBrowser\cloak.exe"));
    }

    paths
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validate_rejects_missing_executable() {
        let provider = CloakBrowserProvider;
        let result = provider.validate_executable(Path::new("/tmp/does-not-exist-cloak"));
        assert!(matches!(result, Err(AppError::InvalidBrowserExecutable(_))));
    }
}
