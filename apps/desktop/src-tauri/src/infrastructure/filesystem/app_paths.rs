use std::path::{Path, PathBuf};

use crate::domain::profile::validate_profile_id;
use crate::error::AppError;

#[derive(Debug, Clone)]
pub struct ProfilePaths {
    pub root: PathBuf,
    pub browser_data: PathBuf,
    pub downloads: PathBuf,
    pub cache: PathBuf,
}

#[derive(Debug, Clone)]
pub struct AppPaths {
    pub root: PathBuf,
    pub database: PathBuf,
    pub logs: PathBuf,
    pub profiles: PathBuf,
    pub browsers: PathBuf,
    pub cache: PathBuf,
    pub temp: PathBuf,
    pub config: PathBuf,
}

impl AppPaths {
    pub fn resolve() -> Result<Self, AppError> {
        let root = dirs::data_local_dir()
            .map(|dir| dir.join("ProfileDock"))
            .ok_or_else(|| {
                AppError::InvalidConfiguration("unable to resolve app data directory".into())
            })?;

        let paths = Self {
            database: root.join("profiledock.db"),
            logs: root.join("logs"),
            profiles: root.join("profiles"),
            browsers: root.join("browsers"),
            cache: root.join("cache"),
            temp: root.join("temp"),
            config: root.join("config.json"),
            root,
        };

        paths.ensure_directories()?;
        Ok(paths)
    }

    pub fn ensure_directories(&self) -> Result<(), AppError> {
        for dir in [
            &self.root,
            &self.logs,
            &self.profiles,
            &self.browsers,
            &self.cache,
            &self.temp,
        ] {
            std::fs::create_dir_all(dir)?;
        }
        Ok(())
    }

    pub fn log_file(&self) -> PathBuf {
        self.logs.join("profiledock.log")
    }

    pub fn profile(&self, id: &str) -> Result<ProfilePaths, AppError> {
        validate_profile_id(id)?;
        let root = self.profiles.join(id);
        Ok(ProfilePaths {
            root: root.clone(),
            browser_data: root.join("browser-data"),
            downloads: root.join("downloads"),
            cache: root.join("cache"),
        })
    }

    pub fn create_profile_directories(&self, id: &str) -> Result<ProfilePaths, AppError> {
        let paths = self.profile(id)?;
        for dir in [
            &paths.root,
            &paths.browser_data,
            &paths.downloads,
            &paths.cache,
        ] {
            std::fs::create_dir_all(dir)?;
        }

        let metadata = serde_json::json!({
            "profile_id": id,
            "version": 1,
        });
        std::fs::write(
            paths.root.join("profile.json"),
            serde_json::to_string_pretty(&metadata)?,
        )?;

        Ok(paths)
    }

    pub fn remove_profile_directory(&self, id: &str) -> Result<(), AppError> {
        let paths = self.profile(id)?;
        if paths.root.exists() {
            std::fs::remove_dir_all(&paths.root)?;
        }
        Ok(())
    }

    pub fn to_info(&self) -> crate::domain::AppPathsInfo {
        crate::domain::AppPathsInfo {
            root: path_to_string(&self.root),
            database: path_to_string(&self.database),
            logs: path_to_string(&self.logs),
            profiles: path_to_string(&self.profiles),
            browsers: path_to_string(&self.browsers),
            cache: path_to_string(&self.cache),
            temp: path_to_string(&self.temp),
        }
    }
}

fn path_to_string(path: &Path) -> String {
    path.to_string_lossy().into_owned()
}
