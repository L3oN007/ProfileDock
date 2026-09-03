use std::fs;
use std::path::Path;

use crate::domain::AppConfig;
use crate::error::AppError;
use crate::infrastructure::database::repositories::metadata_repository::MetadataRepository;

pub struct ConfigStore;

impl ConfigStore {
    pub async fn load(path: &Path, metadata: &MetadataRepository) -> Result<AppConfig, AppError> {
        let mut config = if path.exists() {
            let contents = fs::read_to_string(path)?;
            serde_json::from_str(&contents)?
        } else {
            AppConfig::default()
        };

        if let Some(executable) = metadata.get("browser_executable").await? {
            config.browser_executable = Some(executable);
        }

        Ok(config)
    }

    pub fn save(path: &Path, config: &AppConfig) -> Result<(), AppError> {
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }
        let contents = serde_json::to_string_pretty(config)?;
        fs::write(path, contents)?;
        Ok(())
    }
}
