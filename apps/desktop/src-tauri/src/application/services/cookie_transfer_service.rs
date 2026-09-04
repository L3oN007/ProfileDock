use crate::domain::profile::{validate_profile_id, CookieTransferResult};
use crate::error::AppError;
use crate::state::AppState;

const MAX_COOKIE_FILE_BYTES: u64 = 5 * 1024 * 1024;

#[derive(Debug, Clone, serde::Deserialize, serde::Serialize)]
struct CookieBundle {
    version: u32,
    cookies: Vec<CookieRecord>,
}

#[derive(Debug, Clone, serde::Deserialize, serde::Serialize)]
struct CookieRecord {
    name: String,
    value: String,
    domain: String,
    path: Option<String>,
    secure: Option<bool>,
    http_only: Option<bool>,
    same_site: Option<String>,
    expires: Option<String>,
}

pub struct CookieTransferService;

impl CookieTransferService {
    pub async fn export_cookies(
        state: &AppState,
        profile_id: &str,
        destination_path: String,
    ) -> Result<CookieTransferResult, AppError> {
        validate_profile_id(profile_id)?;
        let source = Self::cookie_file_path(state, profile_id)?;
        let bundle = if source.exists() {
            let content = tokio::fs::read_to_string(&source).await?;
            Self::parse_bundle(&content)?
        } else {
            CookieBundle {
                version: 1,
                cookies: Vec::new(),
            }
        };

        let destination = std::path::PathBuf::from(destination_path);
        if let Some(parent) = destination.parent() {
            tokio::fs::create_dir_all(parent).await?;
        }
        tokio::fs::write(&destination, serde_json::to_string_pretty(&bundle)?).await?;

        Ok(CookieTransferResult {
            path: destination.to_string_lossy().into_owned(),
            count: bundle.cookies.len(),
        })
    }

    pub async fn import_cookies(
        state: &AppState,
        profile_id: &str,
        source_path: String,
    ) -> Result<CookieTransferResult, AppError> {
        validate_profile_id(profile_id)?;
        let source = std::path::PathBuf::from(source_path);
        let metadata = tokio::fs::metadata(&source).await?;
        if metadata.len() > MAX_COOKIE_FILE_BYTES {
            return Err(AppError::InvalidConfiguration(
                "cookie file exceeds 5MB limit".into(),
            ));
        }

        let content = tokio::fs::read_to_string(&source).await?;
        let bundle = Self::parse_bundle(&content)?;
        let destination = Self::cookie_file_path(state, profile_id)?;
        if let Some(parent) = destination.parent() {
            tokio::fs::create_dir_all(parent).await?;
        }
        tokio::fs::write(&destination, serde_json::to_string_pretty(&bundle)?).await?;

        Ok(CookieTransferResult {
            path: destination.to_string_lossy().into_owned(),
            count: bundle.cookies.len(),
        })
    }

    fn cookie_file_path(
        state: &AppState,
        profile_id: &str,
    ) -> Result<std::path::PathBuf, AppError> {
        let paths = state.paths.profile(profile_id)?;
        Ok(paths.root.join("cookies-export.json"))
    }

    fn parse_bundle(content: &str) -> Result<CookieBundle, AppError> {
        let bundle: CookieBundle = serde_json::from_str(content).map_err(|error| {
            AppError::InvalidConfiguration(format!("invalid cookie JSON: {error}"))
        })?;
        if bundle.version != 1 {
            return Err(AppError::InvalidConfiguration(
                "unsupported cookie bundle version".into(),
            ));
        }
        for cookie in &bundle.cookies {
            if cookie.name.trim().is_empty() || cookie.domain.trim().is_empty() {
                return Err(AppError::InvalidConfiguration(
                    "cookie name and domain are required".into(),
                ));
            }
        }
        Ok(bundle)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_valid_cookie_bundle() {
        let json =
            r#"{"version":1,"cookies":[{"name":"sid","value":"abc","domain":".example.com"}]}"#;
        let bundle = CookieTransferService::parse_bundle(json).unwrap();
        assert_eq!(bundle.cookies.len(), 1);
    }
}
