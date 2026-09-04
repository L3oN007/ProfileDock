use std::path::PathBuf;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum CloakRuntimeSource {
    ProfileDockManaged,
    External,
}

impl CloakRuntimeSource {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::ProfileDockManaged => "profiledock_managed",
            Self::External => "external",
        }
    }

    pub fn from_str(value: &str) -> Option<Self> {
        match value {
            "profiledock_managed" => Some(Self::ProfileDockManaged),
            "external" => Some(Self::External),
            _ => None,
        }
    }
}

#[derive(Debug, Clone)]
pub struct CloakRuntime {
    pub id: String,
    pub version: String,
    pub platform: String,
    pub arch: String,
    pub root_dir: PathBuf,
    pub executable: PathBuf,
    pub sha256: Option<String>,
    pub source: CloakRuntimeSource,
    pub active: bool,
    pub installed_at: DateTime<Utc>,
    pub validated_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CloakRuntimeDto {
    pub id: String,
    pub version: String,
    pub platform: String,
    pub arch: String,
    pub root_dir: String,
    pub executable_path: String,
    pub sha256: Option<String>,
    pub source: String,
    pub active: bool,
    pub installed_at: String,
    pub validated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CloakRuntimeStatusDto {
    pub installed: bool,
    pub active_runtime: Option<CloakRuntimeDto>,
    pub managed_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum CloakInstallPhase {
    Resolving,
    Downloading,
    Verifying,
    Extracting,
    Validating,
    Completed,
    Failed,
    Cancelled,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CloakInstallProgress {
    pub phase: CloakInstallPhase,
    pub version: Option<String>,
    pub downloaded_bytes: u64,
    pub total_bytes: Option<u64>,
    pub percent: Option<u8>,
    pub message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CloakRuntimeUpdateInfo {
    pub current_version: Option<String>,
    pub available_version: Option<String>,
    pub update_available: bool,
}

impl CloakRuntime {
    pub fn to_dto(&self) -> CloakRuntimeDto {
        CloakRuntimeDto {
            id: self.id.clone(),
            version: self.version.clone(),
            platform: self.platform.clone(),
            arch: self.arch.clone(),
            root_dir: self.root_dir.to_string_lossy().into_owned(),
            executable_path: self.executable.to_string_lossy().into_owned(),
            sha256: self.sha256.clone(),
            source: self.source.as_str().to_string(),
            active: self.active,
            installed_at: self.installed_at.to_rfc3339(),
            validated_at: self.validated_at.map(|dt| dt.to_rfc3339()),
        }
    }
}
