use serde::Serialize;
use thiserror::Error;

#[allow(dead_code)]
#[derive(Debug, Error)]
pub enum AppError {
    #[error("database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("io error: {0}")]
    Io(#[from] std::io::Error),

    #[error("cloak not installed")]
    CloakNotInstalled,

    #[error("cloak executable not found")]
    CloakExecutableNotFound,

    #[error("cloak installation invalid: {0}")]
    CloakInstallationInvalid(String),

    #[error("cloak version unsupported: {0}")]
    CloakVersionUnsupported(String),

    #[error("cloak capability unsupported: {0}")]
    CloakCapabilityUnsupported(String),

    #[error("cloak config invalid: {0}")]
    CloakConfigInvalid(String),

    #[error("cloak launch failed: {0}")]
    CloakLaunchFailed(String),

    #[error("cloak profile directory invalid: {0}")]
    CloakProfileDirectoryInvalid(String),

    #[error("cloak process exited early")]
    CloakProcessExitedEarly,

    #[error("cloak runtime not installed")]
    CloakRuntimeNotInstalled,

    #[error("cloak runtime not found")]
    CloakRuntimeNotFound,

    #[error("cloak runtime in use")]
    CloakRuntimeInUse,

    #[error("cloak download failed: {0}")]
    CloakDownloadFailed(String),

    #[error("cloak download timeout")]
    CloakDownloadTimeout,

    #[error("cloak checksum mismatch")]
    CloakChecksumMismatch,

    #[error("cloak archive invalid: {0}")]
    CloakArchiveInvalid(String),

    #[error("cloak extraction failed: {0}")]
    CloakExtractionFailed(String),

    #[error("cloak runtime invalid: {0}")]
    CloakRuntimeInvalid(String),

    #[error("cloak runtime version unsupported: {0}")]
    CloakRuntimeVersionUnsupported(String),

    #[error("cloak runtime activation failed: {0}")]
    CloakRuntimeActivationFailed(String),

    #[error("cloak runtime remove failed: {0}")]
    CloakRuntimeRemoveFailed(String),

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

    #[error("profile proxy not assigned")]
    ProfileProxyNotAssigned,

    #[error("proxy not found")]
    ProxyNotFound,

    #[error("proxy invalid host: {0}")]
    ProxyInvalidHost(String),

    #[error("proxy invalid port: {0}")]
    ProxyInvalidPort(u16),

    #[error("proxy invalid protocol: {0}")]
    ProxyInvalidProtocol(String),

    #[error("proxy auth failed")]
    ProxyAuthFailed,

    #[error("proxy connection failed: {0}")]
    ProxyConnectionFailed(String),

    #[error("proxy connection timeout")]
    ProxyConnectionTimeout,

    #[error("proxy secret not found")]
    ProxySecretNotFound,

    #[error("proxy in use")]
    ProxyInUse,

    #[error("proxy archived")]
    ProxyArchived,

    #[error("network lookup failed: {0}")]
    NetworkLookupFailed(String),

    #[error("update check failed: {0}")]
    UpdateCheckFailed(String),

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
            Self::CloakNotInstalled => "CLOAK_NOT_INSTALLED",
            Self::CloakExecutableNotFound => "CLOAK_EXECUTABLE_NOT_FOUND",
            Self::CloakInstallationInvalid(_) => "CLOAK_INSTALLATION_INVALID",
            Self::CloakVersionUnsupported(_) => "CLOAK_VERSION_UNSUPPORTED",
            Self::CloakCapabilityUnsupported(_) => "CLOAK_CAPABILITY_UNSUPPORTED",
            Self::CloakConfigInvalid(_) => "CLOAK_CONFIG_INVALID",
            Self::CloakLaunchFailed(_) => "CLOAK_LAUNCH_FAILED",
            Self::CloakProfileDirectoryInvalid(_) => "CLOAK_PROFILE_DIRECTORY_INVALID",
            Self::CloakProcessExitedEarly => "CLOAK_PROCESS_EXITED_EARLY",
            Self::CloakRuntimeNotInstalled => "CLOAK_RUNTIME_NOT_INSTALLED",
            Self::CloakRuntimeNotFound => "CLOAK_RUNTIME_NOT_FOUND",
            Self::CloakRuntimeInUse => "CLOAK_RUNTIME_IN_USE",
            Self::CloakDownloadFailed(_) => "CLOAK_DOWNLOAD_FAILED",
            Self::CloakDownloadTimeout => "CLOAK_DOWNLOAD_TIMEOUT",
            Self::CloakChecksumMismatch => "CLOAK_CHECKSUM_MISMATCH",
            Self::CloakArchiveInvalid(_) => "CLOAK_ARCHIVE_INVALID",
            Self::CloakExtractionFailed(_) => "CLOAK_EXTRACTION_FAILED",
            Self::CloakRuntimeInvalid(_) => "CLOAK_RUNTIME_INVALID",
            Self::CloakRuntimeVersionUnsupported(_) => "CLOAK_RUNTIME_VERSION_UNSUPPORTED",
            Self::CloakRuntimeActivationFailed(_) => "CLOAK_RUNTIME_ACTIVATION_FAILED",
            Self::CloakRuntimeRemoveFailed(_) => "CLOAK_RUNTIME_REMOVE_FAILED",
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
            Self::ProfileProxyNotAssigned => "PROFILE_PROXY_NOT_ASSIGNED",
            Self::ProxyNotFound => "PROXY_NOT_FOUND",
            Self::ProxyInvalidHost(_) => "PROXY_INVALID_HOST",
            Self::ProxyInvalidPort(_) => "PROXY_INVALID_PORT",
            Self::ProxyInvalidProtocol(_) => "PROXY_INVALID_PROTOCOL",
            Self::ProxyAuthFailed => "PROXY_AUTH_FAILED",
            Self::ProxyConnectionFailed(_) => "PROXY_CONNECTION_FAILED",
            Self::ProxyConnectionTimeout => "PROXY_CONNECTION_TIMEOUT",
            Self::ProxySecretNotFound => "PROXY_SECRET_NOT_FOUND",
            Self::ProxyInUse => "PROXY_IN_USE",
            Self::ProxyArchived => "PROXY_ARCHIVED",
            Self::NetworkLookupFailed(_) => "NETWORK_LOOKUP_FAILED",
            Self::UpdateCheckFailed(_) => "UPDATE_CHECK_FAILED",
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
