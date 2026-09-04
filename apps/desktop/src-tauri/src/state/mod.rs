use std::sync::Arc;

use crate::application::services::{
    BrowserService, CloakRuntimeManager, ProfileService, ProxyService,
};
use crate::domain::AppConfig;
use crate::error::AppError;
use crate::infrastructure::database::Database;
use crate::infrastructure::filesystem::AppPaths;
use crate::infrastructure::network::HttpProxyChecker;
use crate::infrastructure::process::ProcessManager;
use crate::infrastructure::secrets::{FileSecretStore, SecretStore};

pub struct AppState {
    pub db: Database,
    pub paths: AppPaths,
    pub process_manager: ProcessManager,
    pub profile_service: ProfileService,
    pub proxy_service: ProxyService,
    pub browser_service: BrowserService,
    pub cloak_runtime_manager: Arc<CloakRuntimeManager>,
    pub secret_store: Arc<dyn SecretStore>,
    pub proxy_checker: Arc<HttpProxyChecker>,
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
        let proxy_service = ProxyService::new();
        let browser_service = BrowserService::new();
        let cloak_runtime_manager = Arc::new(CloakRuntimeManager::new());
        let secret_store = Arc::new(FileSecretStore::new(paths.secrets.clone())?);
        let proxy_checker = Arc::new(HttpProxyChecker);

        CloakRuntimeManager::cleanup_incomplete_installs(&paths).await?;

        let state = Self {
            db,
            paths,
            process_manager,
            profile_service,
            proxy_service,
            browser_service,
            cloak_runtime_manager,
            secret_store,
            proxy_checker,
            config,
        };

        state.browser_service.reconcile_instances(&state).await?;

        Ok(state)
    }
}
