pub mod cloak;
pub mod profile;
pub mod proxy;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum LogLevel {
    Debug,
    Info,
    Warn,
    Error,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub browser_executable: Option<String>,
    pub log_level: LogLevel,
    pub launch_on_startup: bool,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            browser_executable: None,
            log_level: LogLevel::Info,
            launch_on_startup: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppInfo {
    pub name: String,
    pub version: String,
    pub identifier: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemInfo {
    pub os: String,
    pub arch: String,
    pub family: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppPathsInfo {
    pub root: String,
    pub database: String,
    pub logs: String,
    pub profiles: String,
    pub browsers: String,
    pub cache: String,
    pub temp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum HealthStatus {
    Ok,
    Error,
    Detected,
    NotDetected,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthCheck {
    pub database: HealthStatus,
    pub filesystem: HealthStatus,
    pub browser: HealthStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum BrowserDetectionStatus {
    Detected,
    NotDetected,
    Invalid,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BrowserStatus {
    pub provider: String,
    pub status: BrowserDetectionStatus,
    pub executable: Option<String>,
    pub version: Option<String>,
}
