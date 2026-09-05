use std::path::{Path, PathBuf};

use crate::error::AppError;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DiscoveredCloakInstallation {
    pub executable: PathBuf,
    pub root_dir: PathBuf,
    pub version: Option<String>,
    pub source: CloakDiscoverySource,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum CloakDiscoverySource {
    EnvOverride,
    CloakBrowserCache,
    ManualPath,
}

impl CloakDiscoverySource {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::EnvOverride => "env_override",
            Self::CloakBrowserCache => "cloakbrowser_cache",
            Self::ManualPath => "manual_path",
        }
    }
}

pub fn cloak_cache_dir() -> PathBuf {
    if let Ok(custom) = std::env::var("CLOAKBROWSER_CACHE_DIR") {
        return PathBuf::from(custom);
    }

    dirs::home_dir()
        .map(|home| home.join(".cloakbrowser"))
        .unwrap_or_else(|| PathBuf::from(".cloakbrowser"))
}

pub fn discover_installations() -> Result<Vec<DiscoveredCloakInstallation>, AppError> {
    let mut discovered = Vec::new();

    if let Ok(path) = std::env::var("CLOAKBROWSER_BINARY_PATH") {
        let trimmed = path.trim();
        if !trimmed.is_empty() {
            let executable = PathBuf::from(trimmed);
            if executable.exists() {
                let root_dir = executable
                    .parent()
                    .map(Path::to_path_buf)
                    .unwrap_or_else(|| executable.clone());
                discovered.push(DiscoveredCloakInstallation {
                    version: version_from_root_dir(&root_dir),
                    executable,
                    root_dir,
                    source: CloakDiscoverySource::EnvOverride,
                });
            }
        }
    }

    discovered.extend(discover_from_cache_dir(&cloak_cache_dir())?);

    discovered.sort_by(|left, right| {
        version_sort_key(right.version.as_deref()).cmp(&version_sort_key(left.version.as_deref()))
    });
    discovered.dedup_by(|left, right| left.executable == right.executable);

    Ok(discovered)
}

pub fn discover_best_installation() -> Result<Option<DiscoveredCloakInstallation>, AppError> {
    let mut installations = discover_installations()?;
    installations.retain(|installation| validate_installation_root(&installation.root_dir).is_ok());
    Ok(installations.into_iter().next())
}

pub fn validate_installation_root(root_dir: &Path) -> Result<(), AppError> {
    let executable = executable_path_for_root(root_dir);
    if !executable.exists() {
        return Err(AppError::CloakInstallationInvalid(format!(
            "executable not found in {}",
            root_dir.display()
        )));
    }

    if !executable.is_file() {
        return Err(AppError::CloakInstallationInvalid(
            "cloak executable path is not a file".into(),
        ));
    }

    #[cfg(target_os = "windows")]
    {
        let chrome_dll = root_dir.join("chrome.dll");
        if !chrome_dll.exists() {
            return Err(AppError::CloakInstallationInvalid(
                "chrome.dll is missing from CloakBrowser installation directory".into(),
            ));
        }
    }

    #[cfg(unix)]
    {
        let resources = root_dir.join("resources.pak");
        let icu = root_dir.join("icudtl.dat");
        if !resources.exists() || !icu.exists() {
            return Err(AppError::CloakInstallationInvalid(
                "CloakBrowser installation directory is incomplete".into(),
            ));
        }

        use std::os::unix::fs::PermissionsExt;
        let metadata = std::fs::metadata(&executable)?;
        if metadata.permissions().mode() & 0o111 == 0 {
            return Err(AppError::CloakInstallationInvalid(
                "cloak executable is not executable".into(),
            ));
        }
    }

    Ok(())
}

pub fn executable_path_for_root(root_dir: &Path) -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        return root_dir.join("chrome.exe");
    }

    #[cfg(target_os = "macos")]
    {
        return root_dir.join("Chromium.app/Contents/MacOS/Chromium");
    }

    #[cfg(all(unix, not(target_os = "macos")))]
    {
        return root_dir.join("chrome");
    }
}

fn discover_from_cache_dir(cache_dir: &Path) -> Result<Vec<DiscoveredCloakInstallation>, AppError> {
    if !cache_dir.exists() {
        return Ok(Vec::new());
    }

    let mut installations = Vec::new();
    for entry in std::fs::read_dir(cache_dir)? {
        let entry = entry?;
        if !entry.file_type()?.is_dir() {
            continue;
        }

        let root_dir = entry.path();
        let Some(dir_name) = root_dir.file_name().and_then(|name| name.to_str()) else {
            continue;
        };

        if !dir_name.starts_with("chromium-") {
            continue;
        }

        let executable = executable_path_for_root(&root_dir);
        if !executable.exists() {
            continue;
        }

        installations.push(DiscoveredCloakInstallation {
            executable,
            root_dir: root_dir.clone(),
            version: version_from_root_dir(&root_dir),
            source: CloakDiscoverySource::CloakBrowserCache,
        });
    }

    Ok(installations)
}

/// Derive the CloakBrowser version from an installation directory name.
///
/// Supports ProfileDock-managed folders (`146.0.7680.177.5`) and the upstream
/// cache layout (`chromium-146.0.7680.177.5-pro`).
pub fn version_from_root_dir(root_dir: &Path) -> Option<String> {
    root_dir
        .file_name()
        .and_then(|name| name.to_str())
        .and_then(parse_version_dir_name)
}

/// Derive the CloakBrowser version from an executable path without launching
/// the browser. On Windows, `chrome.exe --version` is ignored by Chromium and
/// opens a visible browser window instead of printing the version.
pub fn version_from_executable(executable: &Path) -> Option<String> {
    let Some(parent) = executable.parent() else {
        return None;
    };

    if let Some(version) = version_from_root_dir(parent) {
        return Some(version);
    }

    for ancestor in parent.ancestors() {
        if let Some(version) = version_from_root_dir(ancestor) {
            return Some(version);
        }

        if ancestor
            .extension()
            .is_some_and(|extension| extension == "app")
        {
            break;
        }
    }

    None
}

fn parse_version_dir_name(name: &str) -> Option<String> {
    let version = name.strip_prefix("chromium-").unwrap_or(name);
    let version = version.trim_end_matches("-pro");
    if looks_like_version(version) {
        Some(version.to_string())
    } else {
        None
    }
}

fn looks_like_version(value: &str) -> bool {
    let parts: Vec<&str> = value.split('.').collect();
    parts.len() >= 2 && parts.iter().all(|part| part.parse::<u32>().is_ok())
}

pub fn version_sort_key(version: Option<&str>) -> Vec<u32> {
    version
        .unwrap_or_default()
        .split('.')
        .filter_map(|part| part.parse().ok())
        .collect()
}

#[cfg(test)]
mod tests {
    use std::fs;

    use super::*;

    #[test]
    fn version_from_root_dir_strips_pro_suffix() {
        let root = PathBuf::from("/tmp/.cloakbrowser/chromium-146.0.7680.177.5-pro");
        assert_eq!(
            version_from_root_dir(&root).as_deref(),
            Some("146.0.7680.177.5")
        );
    }

    #[test]
    fn version_from_root_dir_handles_profiledock_managed_layout() {
        let root = PathBuf::from(r"C:\Users\Admin\AppData\Local\ProfileDock\runtimes\cloak\146.0.7680.177.5");
        assert_eq!(
            version_from_root_dir(&root).as_deref(),
            Some("146.0.7680.177.5")
        );
    }

    #[test]
    fn version_from_executable_uses_parent_directory() {
        let executable = PathBuf::from(
            r"C:\Users\Admin\AppData\Local\ProfileDock\runtimes\cloak\146.0.7680.177.5\chrome.exe",
        );
        assert_eq!(
            version_from_executable(&executable).as_deref(),
            Some("146.0.7680.177.5")
        );
    }

    #[test]
    fn version_from_root_dir_rejects_non_version_names() {
        let root = PathBuf::from("/tmp/.cloakbrowser/cache");
        assert_eq!(version_from_root_dir(&root), None);
    }

    #[test]
    fn validate_rejects_incomplete_linux_installation() {
        let temp =
            std::env::temp_dir().join(format!("profiledock-cloak-test-{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(&temp).unwrap();
        fs::write(temp.join("chrome"), b"").unwrap();

        let result = validate_installation_root(&temp);
        assert!(matches!(result, Err(AppError::CloakInstallationInvalid(_))));

        let _ = fs::remove_dir_all(&temp);
    }
}
