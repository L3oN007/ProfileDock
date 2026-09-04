use chrono::{DateTime, Utc};
use sqlx::SqlitePool;

use crate::domain::profile::{
    DownloadMode, ProfileBrowserSettings, UpdateBrowserSettingsInput, WindowMode,
    validate_startup_urls,
};
use crate::error::AppError;

#[derive(Clone)]
pub struct SqliteBrowserSettingsRepository {
    pool: SqlitePool,
}

impl SqliteBrowserSettingsRepository {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn get(&self, profile_id: &str) -> Result<Option<ProfileBrowserSettings>, AppError> {
        let row = sqlx::query_as::<_, SettingsRow>(
            "SELECT profile_id, startup_urls_json, download_mode, custom_download_dir, window_mode,
                    restore_session, created_at, updated_at
             FROM profile_browser_settings WHERE profile_id = ?",
        )
        .bind(profile_id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.map(SettingsRow::into_settings))
    }

    pub async fn save(&self, settings: &ProfileBrowserSettings) -> Result<(), AppError> {
        let startup_urls = serde_json::to_string(&settings.startup_urls)?;
        let custom_download_dir = settings
            .custom_download_dir
            .as_ref()
            .map(|path| path.to_string_lossy().into_owned());

        sqlx::query(
            "INSERT INTO profile_browser_settings
             (profile_id, startup_urls_json, download_mode, custom_download_dir, window_mode,
              restore_session, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(profile_id) DO UPDATE SET
                startup_urls_json = excluded.startup_urls_json,
                download_mode = excluded.download_mode,
                custom_download_dir = excluded.custom_download_dir,
                window_mode = excluded.window_mode,
                restore_session = excluded.restore_session,
                updated_at = excluded.updated_at",
        )
        .bind(&settings.profile_id)
        .bind(startup_urls)
        .bind(settings.download_mode.as_str())
        .bind(custom_download_dir)
        .bind(settings.window_mode.as_str())
        .bind(settings.restore_session as i64)
        .bind(settings.created_at.to_rfc3339())
        .bind(settings.updated_at.to_rfc3339())
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn update(
        &self,
        profile_id: &str,
        input: UpdateBrowserSettingsInput,
    ) -> Result<ProfileBrowserSettings, AppError> {
        let mut settings = self
            .get(profile_id)
            .await?
            .ok_or(AppError::ProfileNotFound)?;

        if let Some(urls) = input.startup_urls {
            settings.startup_urls = validate_startup_urls(&urls)?;
        }

        if let Some(mode) = input.download_mode {
            settings.download_mode = DownloadMode::from_str(&mode).ok_or_else(|| {
                AppError::CloakConfigInvalid(format!("invalid download mode: {mode}"))
            })?;
        }

        if let Some(dir) = input.custom_download_dir {
            let trimmed = dir.trim();
            settings.custom_download_dir = if trimmed.is_empty() {
                None
            } else {
                Some(std::path::PathBuf::from(trimmed))
            };
        }

        if let Some(mode) = input.window_mode {
            settings.window_mode = WindowMode::from_str(&mode).ok_or_else(|| {
                AppError::CloakConfigInvalid(format!("invalid window mode: {mode}"))
            })?;
        }

        if let Some(restore_session) = input.restore_session {
            settings.restore_session = restore_session;
        }

        if settings.download_mode == DownloadMode::Custom
            && settings.custom_download_dir.as_ref().is_none_or(|path| path.as_os_str().is_empty())
        {
            return Err(AppError::CloakConfigInvalid(
                "custom download directory is required".into(),
            ));
        }

        settings.updated_at = Utc::now();
        self.save(&settings).await?;
        Ok(settings)
    }
}

#[derive(sqlx::FromRow)]
struct SettingsRow {
    profile_id: String,
    startup_urls_json: String,
    download_mode: String,
    custom_download_dir: Option<String>,
    window_mode: String,
    restore_session: i64,
    created_at: String,
    updated_at: String,
}

impl SettingsRow {
    fn into_settings(self) -> ProfileBrowserSettings {
        let startup_urls = serde_json::from_str(&self.startup_urls_json).unwrap_or_default();

        ProfileBrowserSettings {
            profile_id: self.profile_id,
            startup_urls,
            download_mode: DownloadMode::from_str(&self.download_mode).unwrap_or(DownloadMode::Profile),
            custom_download_dir: self.custom_download_dir.map(std::path::PathBuf::from),
            window_mode: WindowMode::from_str(&self.window_mode).unwrap_or(WindowMode::Normal),
            restore_session: self.restore_session != 0,
            created_at: parse_ts(&self.created_at),
            updated_at: parse_ts(&self.updated_at),
        }
    }
}

fn parse_ts(value: &str) -> DateTime<Utc> {
    DateTime::parse_from_rfc3339(value)
        .map(|dt| dt.with_timezone(&Utc))
        .unwrap_or_else(|_| Utc::now())
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;

    #[test]
    fn validate_startup_urls_rejects_invalid_scheme() {
        let result = validate_startup_urls(&["ftp://example.com".into()]);
        assert!(matches!(result, Err(AppError::CloakConfigInvalid(_))));
    }
}
