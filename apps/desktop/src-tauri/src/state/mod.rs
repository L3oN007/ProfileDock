use crate::application::services::BrowserService;
use crate::domain::AppConfig;
use crate::infrastructure::database::Database;
use crate::infrastructure::filesystem::AppPaths;
use crate::infrastructure::process::ProcessManager;

pub struct AppState {
    pub db: Database,
    pub paths: AppPaths,
    #[allow(dead_code)]
    pub process_manager: ProcessManager,
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

        Ok(Self {
            db,
            paths,
            process_manager: ProcessManager::new(),
            browser_service: BrowserService::new(),
            config,
        })
    }
}

use crate::error::AppError;
