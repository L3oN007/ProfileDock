use std::path::PathBuf;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use crate::error::AppError;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum DownloadMode {
    Profile,
    Custom,
}

impl DownloadMode {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Profile => "profile",
            Self::Custom => "custom",
        }
    }

    pub fn from_str(value: &str) -> Option<Self> {
        match value {
            "profile" => Some(Self::Profile),
            "custom" => Some(Self::Custom),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum WindowMode {
    Normal,
    Maximized,
}

impl WindowMode {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Normal => "normal",
            Self::Maximized => "maximized",
        }
    }

    pub fn from_str(value: &str) -> Option<Self> {
        match value {
            "normal" => Some(Self::Normal),
            "maximized" => Some(Self::Maximized),
            _ => None,
        }
    }
}

#[derive(Debug, Clone)]
pub struct ProfileBrowserSettings {
    pub profile_id: String,
    pub startup_urls: Vec<String>,
    pub download_mode: DownloadMode,
    pub custom_download_dir: Option<PathBuf>,
    pub window_mode: WindowMode,
    pub restore_session: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProfileBrowserSettingsDto {
    pub profile_id: String,
    pub startup_urls: Vec<String>,
    pub download_mode: String,
    pub custom_download_dir: Option<String>,
    pub window_mode: String,
    pub restore_session: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateBrowserSettingsInput {
    pub startup_urls: Option<Vec<String>>,
    pub download_mode: Option<String>,
    pub custom_download_dir: Option<String>,
    pub window_mode: Option<String>,
    pub restore_session: Option<bool>,
}

pub fn validate_startup_urls(urls: &[String]) -> Result<Vec<String>, AppError> {
    if urls.len() > crate::domain::cloak::STARTUP_URL_MAX_COUNT {
        return Err(AppError::CloakConfigInvalid(format!(
            "startup URLs cannot exceed {}",
            crate::domain::cloak::STARTUP_URL_MAX_COUNT
        )));
    }

    let mut normalized = Vec::with_capacity(urls.len());
    for url in urls {
        let trimmed = url.trim();
        if trimmed.is_empty() {
            continue;
        }

        if !trimmed.starts_with("http://") && !trimmed.starts_with("https://") {
            return Err(AppError::CloakConfigInvalid(format!(
                "invalid startup URL scheme: {trimmed}"
            )));
        }

        normalized.push(trimmed.to_string());
    }

    Ok(normalized)
}

impl ProfileBrowserSettings {
    pub fn defaults(profile_id: String, now: DateTime<Utc>) -> Self {
        Self {
            profile_id,
            startup_urls: Vec::new(),
            download_mode: DownloadMode::Profile,
            custom_download_dir: None,
            window_mode: WindowMode::Normal,
            restore_session: true,
            created_at: now,
            updated_at: now,
        }
    }

    pub fn to_dto(&self) -> ProfileBrowserSettingsDto {
        ProfileBrowserSettingsDto {
            profile_id: self.profile_id.clone(),
            startup_urls: self.startup_urls.clone(),
            download_mode: self.download_mode.as_str().to_string(),
            custom_download_dir: self
                .custom_download_dir
                .as_ref()
                .map(|path| path.to_string_lossy().into_owned()),
            window_mode: self.window_mode.as_str().to_string(),
            restore_session: self.restore_session,
            created_at: self.created_at.to_rfc3339(),
            updated_at: self.updated_at.to_rfc3339(),
        }
    }
}
