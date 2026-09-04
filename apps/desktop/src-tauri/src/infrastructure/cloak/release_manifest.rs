use std::collections::HashMap;

use crate::error::AppError;
use crate::infrastructure::cloak::license::resolve_license_key;

pub const PINNED_CLOAK_VERSION: &str = "146.0.7680.177.5";
pub const RECOMMENDED_FPJS_VERSION: &str = "151.0.7922.108.3";
const DOWNLOAD_BASE_URL: &str = "https://cloakbrowser.dev";
const GITHUB_DOWNLOAD_BASE_URL: &str = "https://github.com/CloakHQ/cloakbrowser/releases/download";

#[derive(Debug, Clone)]
pub struct CloakRelease {
    pub version: String,
    pub asset_url: String,
    pub archive_name: String,
    pub sha256: String,
    pub platform: String,
    pub arch: String,
    pub requires_license: bool,
}

pub fn current_platform() -> (&'static str, &'static str) {
    #[cfg(all(target_os = "windows", target_arch = "x86_64"))]
    {
        ("windows", "x86_64")
    }
    #[cfg(all(target_os = "linux", target_arch = "x86_64"))]
    {
        ("linux", "x86_64")
    }
    #[cfg(all(target_os = "macos", target_arch = "aarch64"))]
    {
        ("macos", "aarch64")
    }
    #[cfg(all(target_os = "macos", target_arch = "x86_64"))]
    {
        ("macos", "x86_64")
    }
    #[cfg(not(any(
        all(target_os = "windows", target_arch = "x86_64"),
        all(target_os = "linux", target_arch = "x86_64"),
        all(target_os = "macos", target_arch = "aarch64"),
        all(target_os = "macos", target_arch = "x86_64")
    )))]
    {
        ("unknown", "unknown")
    }
}

pub fn resolve_release(version: &str) -> Result<CloakRelease, AppError> {
    let (platform, arch) = current_platform();
    if platform == "unknown" {
        return Err(AppError::CloakRuntimeVersionUnsupported(version.to_string()));
    }

    let archive_name = archive_name_for_platform(platform, arch);
    let requires_license = version_newer_than_free(version);
    if requires_license && resolve_license_key().is_none() {
        return Err(AppError::CloakDownloadFailed(format!(
            "CloakBrowser {version} requires a license key. Set CLOAKBROWSER_LICENSE_KEY or save a key to ~/.cloakbrowser/license.key"
        )));
    }

    let asset_url = if requires_license {
        pro_download_url(version)
    } else {
        format!("{DOWNLOAD_BASE_URL}/chromium-v{version}/{archive_name}")
    };

    let sha256 = embedded_checksum(platform)
        .filter(|_| version == PINNED_CLOAK_VERSION)
        .unwrap_or_default()
        .to_string();

    Ok(CloakRelease {
        version: version.to_string(),
        asset_url,
        archive_name,
        sha256,
        platform: platform.to_string(),
        arch: arch.to_string(),
        requires_license,
    })
}

pub fn pinned_release() -> Result<CloakRelease, AppError> {
    resolve_release(&effective_pinned_version())
}

pub fn latest_supported_version() -> &'static str {
    if resolve_license_key().is_some() {
        RECOMMENDED_FPJS_VERSION
    } else {
        PINNED_CLOAK_VERSION
    }
}

pub fn effective_pinned_version() -> String {
    std::env::var("CLOAKBROWSER_VERSION")
        .ok()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| {
            if resolve_license_key().is_some() {
                RECOMMENDED_FPJS_VERSION.to_string()
            } else {
                PINNED_CLOAK_VERSION.to_string()
            }
        })
}

pub fn pro_download_url(version: &str) -> String {
    format!("{DOWNLOAD_BASE_URL}/api/download/{version}")
}

pub async fn fetch_checksums(version: &str, pro: bool) -> Result<HashMap<String, String>, AppError> {
    let urls = if pro {
        vec![format!(
            "{DOWNLOAD_BASE_URL}/releases/pro/chromium-v{version}/SHA256SUMS"
        )]
    } else {
        vec![
            format!("{DOWNLOAD_BASE_URL}/chromium-v{version}/SHA256SUMS"),
            format!("{GITHUB_DOWNLOAD_BASE_URL}/chromium-v{version}/SHA256SUMS"),
        ]
    };

    let client = reqwest::Client::new();
    for url in urls {
        let response = client.get(&url).send().await;
        let Ok(response) = response else {
            continue;
        };
        if !response.status().is_success() {
            continue;
        }
        let text = response
            .text()
            .await
            .map_err(|error| AppError::CloakDownloadFailed(error.to_string()))?;
        return Ok(parse_checksums(&text));
    }

    Err(AppError::CloakDownloadFailed(
        "unable to fetch SHA256SUMS manifest".into(),
    ))
}

pub fn parse_checksums(text: &str) -> HashMap<String, String> {
    let mut result = HashMap::new();
    for line in text.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with("version=") {
            continue;
        }
        let Some((hash, name)) = trimmed.split_once("  ").or_else(|| trimmed.split_once(' '))
        else {
            continue;
        };
        if hash.len() == 64 {
            result.insert(
                name.trim_start_matches('*').to_string(),
                hash.to_lowercase(),
            );
        }
    }
    result
}

fn archive_name_for_platform(platform: &str, arch: &str) -> String {
    match (platform, arch) {
        ("windows", _) => "cloakbrowser-windows-x64.zip".to_string(),
        ("macos", "aarch64") => "cloakbrowser-darwin-arm64.tar.gz".to_string(),
        ("macos", _) => "cloakbrowser-darwin-x64.tar.gz".to_string(),
        _ => "cloakbrowser-linux-x64.tar.gz".to_string(),
    }
}

fn embedded_checksum(platform: &str) -> Option<&'static str> {
    match platform {
        "windows" => Some("b213795cb32c3169f766c74ce1d0275fc89d3df256de39c04da7fb4c23b7fdbe"),
        "linux" => Some("4a12bcde95fa1bb1beef2b41ab5e5c27c36be78e3be3d0dac8c64d705216670e"),
        _ => None,
    }
}

fn version_newer_than_free(version: &str) -> bool {
    crate::infrastructure::cloak::version::version_newer(version, PINNED_CLOAK_VERSION)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_checksums_reads_manifest() {
        let text = "version=146.0.7680.177.5\n4a12bcde95fa1bb1beef2b41ab5e5c27c36be78e3be3d0dac8c64d705216670e  cloakbrowser-linux-x64.tar.gz\n";
        let parsed = parse_checksums(text);
        assert_eq!(
            parsed
                .get("cloakbrowser-linux-x64.tar.gz")
                .map(String::as_str),
            Some("4a12bcde95fa1bb1beef2b41ab5e5c27c36be78e3be3d0dac8c64d705216670e")
        );
    }

    #[test]
    fn marks_versions_above_free_as_license_required() {
        assert!(version_newer_than_free(RECOMMENDED_FPJS_VERSION));
        assert!(!version_newer_than_free(PINNED_CLOAK_VERSION));
    }
}
