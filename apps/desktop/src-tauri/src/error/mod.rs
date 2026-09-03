use serde::Serialize;
use thiserror::Error;

#[allow(dead_code)]
#[derive(Debug, Error)]
pub enum AppError {
    #[error("database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("io error: {0}")]
    Io(#[from] std::io::Error),

    #[error("browser not found")]
    BrowserNotFound,

    #[error("invalid browser executable: {0}")]
    InvalidBrowserExecutable(String),

    #[error("process launch failed: {0}")]
    ProcessLaunchFailed(String),

    #[error("process not found: {0}")]
    ProcessNotFound(String),

    #[error("invalid configuration: {0}")]
    InvalidConfiguration(String),

    #[error("profile not found")]
    ProfileNotFound,

    #[error("profile already running")]
    ProfileAlreadyRunning,

    #[error("profile is running")]
    ProfileRunning,

    #[error("profile is archived")]
    ProfileArchived,

    #[error("profile is not running")]
    ProfileNotRunning,

    #[error("serialization error: {0}")]
    Serialization(#[from] serde_json::Error),
}

#[derive(Debug, Clone, Serialize)]
pub struct AppErrorResponse {
    pub code: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<serde_json::Value>,
}

impl AppError {
    pub fn code(&self) -> &'static str {
        match self {
            Self::Database(_) => "DATABASE_ERROR",
            Self::Io(_) => "IO_ERROR",
            Self::BrowserNotFound => "BROWSER_NOT_FOUND",
            Self::InvalidBrowserExecutable(_) => "INVALID_BROWSER_EXECUTABLE",
            Self::ProcessLaunchFailed(_) => "PROCESS_LAUNCH_FAILED",
            Self::ProcessNotFound(_) => "PROCESS_NOT_FOUND",
            Self::InvalidConfiguration(_) => "INVALID_CONFIGURATION",
            Self::ProfileNotFound => "PROFILE_NOT_FOUND",
            Self::ProfileAlreadyRunning => "PROFILE_ALREADY_RUNNING",
            Self::ProfileRunning => "PROFILE_RUNNING",
            Self::ProfileArchived => "PROFILE_ARCHIVED",
            Self::ProfileNotRunning => "PROFILE_NOT_RUNNING",
            Self::Serialization(_) => "SERIALIZATION_ERROR",
        }
    }

    pub fn to_response(&self) -> AppErrorResponse {
        AppErrorResponse {
            code: self.code().to_string(),
            message: self.to_string(),
            details: None,
        }
    }
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        self.to_response().serialize(serializer)
    }
}
