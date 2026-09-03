use std::path::{Path, PathBuf};

use crate::error::AppError;

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
