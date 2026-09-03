use crate::application::services::{BrowserService, ProfileService};
use crate::domain::AppConfig;
use crate::infrastructure::database::Database;
use crate::infrastructure::filesystem::AppPaths;
use crate::infrastructure::process::ProcessManager;

pub struct AppState {
    pub db: Database,
    pub paths: AppPaths,
    pub process_manager: ProcessManager,
    pub profile_service: ProfileService,
    pub browser_service: BrowserService,
    #[allow(dead_code)]
    pub config: AppConfig,
}

impl AppState {
    pub async fn initialize() -> Result<Self, AppError> {
        let paths = AppPaths::resolve()?;
        let db = Database::connect(&paths.database).await?;
        crate::infrastructure::database::run_migrations(db.pool()).await?;

        let metadata = crate::infrastructure::database::MetadataRepository::new(db.pool().clone());
        let config =
            crate::infrastructure::filesystem::ConfigStore::load(&paths.config, &metadata).await?;

        let process_manager = ProcessManager::new();
        let profile_service = ProfileService::new();
        let browser_service = BrowserService::new();

        let state = Self {
            db,
            paths,
            process_manager,
            profile_service,
            browser_service,
            config,
        };

        state.browser_service.reconcile_instances(&state).await?;

        Ok(state)
    }
}

use crate::error::AppError;
