use std::time::Duration;

use reqwest::Client;
use serde::Deserialize;

use crate::domain::{AppUpdateCheckStatus, AppUpdateInfo};
use crate::error::AppError;

const GITHUB_REPO: &str = "L3oN007/ProfileDock";
const RELEASES_PAGE_URL: &str = "https://github.com/L3oN007/ProfileDock/releases";
const USER_AGENT: &str = "ProfileDock-Updater";

#[derive(Debug, Deserialize)]
struct GitHubRelease {
    tag_name: String,
    html_url: String,
    body: Option<String>,
    draft: bool,
    prerelease: bool,
    published_at: Option<String>,
}

#[derive(Debug, Deserialize)]
struct UpdateManifest {
    version: String,
    url: Option<String>,
    notes: Option<String>,
    published_at: Option<String>,
}

pub async fn check_app_update(current_version: &str) -> AppUpdateInfo {
    let client = match build_client() {
        Ok(client) => client,
        Err(error) => {
            return unavailable_update(current_version, error.to_string());
        }
    };

    if let Some(info) = check_manifest_update(&client, current_version).await {
        return info;
    }

    match check_github_release(&client, current_version).await {
        Ok(info) => info,
        Err(error) => unavailable_update(current_version, error.to_string()),
    }
}

async fn check_manifest_update(client: &Client, current_version: &str) -> Option<AppUpdateInfo> {
    let manifest_url = option_env!("PROFILEDOCK_UPDATE_MANIFEST_URL");
    if manifest_url.is_none() {
        return None;
    }

    let response = client.get(manifest_url.unwrap()).send().await.ok()?;

    if !response.status().is_success() {
        return None;
    }

    let manifest = response.json::<UpdateManifest>().await.ok()?;
    let latest_version = normalize_version(&manifest.version);
    let update_available = is_version_newer(&latest_version, current_version);

    Some(AppUpdateInfo {
        current_version: current_version.to_string(),
        latest_version: Some(latest_version),
        update_available,
        release_url: manifest.url.or(Some(RELEASES_PAGE_URL.to_string())),
        release_notes: manifest.notes,
        published_at: manifest.published_at,
        check_status: AppUpdateCheckStatus::Ok,
        message: None,
    })
}

async fn check_github_release(
    client: &Client,
    current_version: &str,
) -> Result<AppUpdateInfo, AppError> {
    let release = match fetch_latest_release(client).await {
        Ok(release) => release,
        Err(_) => fetch_latest_published_release(client).await?,
    };

    build_update_info(current_version, release, AppUpdateCheckStatus::Ok, None)
}

async fn fetch_latest_release(client: &Client) -> Result<GitHubRelease, AppError> {
    let response = client
        .get(format!(
            "https://api.github.com/repos/{GITHUB_REPO}/releases/latest"
        ))
        .header("Accept", "application/vnd.github+json")
        .send()
        .await
        .map_err(|error| AppError::UpdateCheckFailed(error.to_string()))?;

    if response.status() == reqwest::StatusCode::NOT_FOUND {
        return Err(AppError::UpdateCheckFailed(
            "no published latest release".into(),
        ));
    }

    if !response.status().is_success() {
        return Err(AppError::UpdateCheckFailed(format!(
            "GitHub latest release request failed with status {}",
            response.status()
        )));
    }

    let release = response
        .json::<GitHubRelease>()
        .await
        .map_err(|error| AppError::UpdateCheckFailed(error.to_string()))?;

    if release.draft || release.prerelease {
        return Err(AppError::UpdateCheckFailed(
            "latest release is draft or prerelease".into(),
        ));
    }

    Ok(release)
}

async fn fetch_latest_published_release(client: &Client) -> Result<GitHubRelease, AppError> {
    let response = client
        .get(format!(
            "https://api.github.com/repos/{GITHUB_REPO}/releases"
        ))
        .header("Accept", "application/vnd.github+json")
        .query(&[("per_page", "20")])
        .send()
        .await
        .map_err(|error| AppError::UpdateCheckFailed(error.to_string()))?;

    if response.status() == reqwest::StatusCode::NOT_FOUND {
        return Err(AppError::UpdateCheckFailed(
            "repository is private or not accessible without authentication".into(),
        ));
    }

    if !response.status().is_success() {
        return Err(AppError::UpdateCheckFailed(format!(
            "GitHub releases request failed with status {}",
            response.status()
        )));
    }

    let releases = response
        .json::<Vec<GitHubRelease>>()
        .await
        .map_err(|error| AppError::UpdateCheckFailed(error.to_string()))?;

    if releases.is_empty() {
        return Err(AppError::UpdateCheckFailed("no releases found".into()));
    }

    releases
        .into_iter()
        .find(|release| !release.draft && !release.prerelease)
        .ok_or_else(|| {
            AppError::UpdateCheckFailed(
                "releases exist but none are published yet (draft only)".into(),
            )
        })
}

fn build_update_info(
    current_version: &str,
    release: GitHubRelease,
    check_status: AppUpdateCheckStatus,
    message: Option<String>,
) -> Result<AppUpdateInfo, AppError> {
    let latest_version = normalize_version(&release.tag_name);
    let update_available = is_version_newer(&latest_version, current_version);

    Ok(AppUpdateInfo {
        current_version: current_version.to_string(),
        latest_version: Some(latest_version),
        update_available,
        release_url: Some(release.html_url),
        release_notes: release.body,
        published_at: release.published_at,
        check_status,
        message,
    })
}

fn unavailable_update(current_version: &str, reason: String) -> AppUpdateInfo {
    let check_status = if reason.contains("draft only") || reason.contains("no published") {
        AppUpdateCheckStatus::NoPublishedRelease
    } else {
        AppUpdateCheckStatus::Unavailable
    };

    let message = match check_status {
        AppUpdateCheckStatus::NoPublishedRelease => Some(
            "No published GitHub release yet. Publish the draft release to enable update checks."
                .into(),
        ),
        AppUpdateCheckStatus::Unavailable => Some(
            "Automatic update check is unavailable. Open the releases page to download manually."
                .into(),
        ),
        AppUpdateCheckStatus::Ok => None,
    };

    AppUpdateInfo {
        current_version: current_version.to_string(),
        latest_version: None,
        update_available: false,
        release_url: Some(RELEASES_PAGE_URL.to_string()),
        release_notes: None,
        published_at: None,
        check_status,
        message,
    }
}

fn build_client() -> Result<Client, AppError> {
    Client::builder()
        .timeout(Duration::from_secs(10))
        .user_agent(USER_AGENT)
        .build()
        .map_err(|error| AppError::UpdateCheckFailed(error.to_string()))
}

fn normalize_version(version: &str) -> String {
    version.trim().trim_start_matches('v').to_string()
}

fn parse_version_parts(version: &str) -> Vec<u64> {
    normalize_version(version)
        .split('.')
        .map(str::trim)
        .filter(|part| !part.is_empty())
        .filter_map(|part| {
            let numeric = part
                .chars()
                .take_while(|ch| ch.is_ascii_digit())
                .collect::<String>();
            numeric.parse().ok()
        })
        .collect()
}

fn is_version_newer(latest: &str, current: &str) -> bool {
    let latest_parts = parse_version_parts(latest);
    let current_parts = parse_version_parts(current);
    let max_len = latest_parts.len().max(current_parts.len());

    for index in 0..max_len {
        let latest_value = latest_parts.get(index).copied().unwrap_or(0);
        let current_value = current_parts.get(index).copied().unwrap_or(0);

        if latest_value != current_value {
            return latest_value > current_value;
        }
    }

    false
}

pub fn releases_page_url() -> &'static str {
    RELEASES_PAGE_URL
}

#[cfg(test)]
mod tests {
    use super::{is_version_newer, normalize_version, parse_version_parts, unavailable_update};
    use crate::domain::AppUpdateCheckStatus;

    #[test]
    fn normalizes_tag_names() {
        assert_eq!(normalize_version("v0.2.1"), "0.2.1");
    }

    #[test]
    fn compares_semver_like_versions() {
        assert!(is_version_newer("0.2.1", "0.2.0"));
        assert!(!is_version_newer("0.2.0", "0.2.1"));
        assert!(!is_version_newer("0.2.1", "0.2.1"));
        assert!(is_version_newer("1.0.0", "0.9.9"));
    }

    #[test]
    fn parses_numeric_prefixes() {
        assert_eq!(parse_version_parts("0.2.1-rc1"), vec![0, 2, 1]);
    }

    #[test]
    fn unavailable_update_marks_draft_only_as_no_published_release() {
        let info = unavailable_update(
            "0.2.1",
            "releases exist but none are published yet (draft only)".into(),
        );
        assert_eq!(info.check_status, AppUpdateCheckStatus::NoPublishedRelease);
    }
}
