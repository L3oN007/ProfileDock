use crate::application::services::browser_provider::{BrowserProvider, CloakBrowserProvider};
use crate::domain::BrowserStatus;
use crate::error::AppError;
use crate::infrastructure::database::MetadataRepository;
use crate::infrastructure::filesystem::ConfigStore;
use crate::state::AppState;

pub struct BrowserService {
    provider: CloakBrowserProvider,
}

impl BrowserService {
    pub fn new() -> Self {
        Self {
            provider: CloakBrowserProvider,
        }
    }

    pub async fn status(&self, state: &AppState) -> Result<BrowserStatus, AppError> {
        let configured = self.configured_path(state).await?;
        self.provider.status(configured.as_deref())
    }

    pub async fn set_executable(
        &self,
        state: &AppState,
        path: String,
    ) -> Result<BrowserStatus, AppError> {
        self.provider
            .validate_executable(std::path::Path::new(&path))?;

        let metadata = MetadataRepository::new(state.db.pool().clone());
        metadata.set("browser_executable", &path).await?;

        let mut config = ConfigStore::load(&state.paths.config, &metadata).await?;
        config.browser_executable = Some(path.clone());
        ConfigStore::save(&state.paths.config, &config)?;

        self.provider.status(Some(&path))
    }

    async fn configured_path(&self, state: &AppState) -> Result<Option<String>, AppError> {
        let metadata = MetadataRepository::new(state.db.pool().clone());
        metadata.get("browser_executable").await
    }
}
