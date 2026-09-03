use crate::domain::{AppInfo, AppPathsInfo, HealthCheck, HealthStatus, SystemInfo};
use crate::error::AppError;
use crate::infrastructure::filesystem::AppPaths;
use crate::state::AppState;

pub struct SystemService;

impl SystemService {
    pub fn get_app_info() -> AppInfo {
        AppInfo {
            name: "ProfileDock".to_string(),
            version: env!("CARGO_PKG_VERSION").to_string(),
            identifier: "com.profiledock.desktop".to_string(),
        }
    }

    pub fn get_system_info() -> SystemInfo {
        SystemInfo {
            os: std::env::consts::OS.to_string(),
            arch: std::env::consts::ARCH.to_string(),
            family: std::env::consts::FAMILY.to_string(),
        }
    }

    pub fn get_app_paths(paths: &AppPaths) -> AppPathsInfo {
        paths.to_info()
    }

    pub async fn health_check(state: &AppState) -> Result<HealthCheck, AppError> {
        let database = match sqlx::query_scalar::<_, i64>("SELECT 1")
            .fetch_one(state.db.pool())
            .await
        {
            Ok(_) => HealthStatus::Ok,
            Err(_) => HealthStatus::Error,
        };

        let filesystem = if state.paths.root.exists() {
            HealthStatus::Ok
        } else {
            HealthStatus::Error
        };

        let browser_status = state.browser_service.status(state).await?;
        let browser = match browser_status.status {
            crate::domain::BrowserDetectionStatus::Detected => HealthStatus::Detected,
            crate::domain::BrowserDetectionStatus::Invalid => HealthStatus::Error,
            crate::domain::BrowserDetectionStatus::NotDetected => HealthStatus::NotDetected,
        };

        Ok(HealthCheck {
            database,
            filesystem,
            browser,
        })
    }
}
