use std::collections::HashMap;

use crate::error::AppError;

pub const PINNED_CLOAK_VERSION: &str = "146.0.7680.177.5";
const DOWNLOAD_BASE_URL: &str = "https://cloakbrowser.dev";
const GITHUB_DOWNLOAD_BASE_URL: &str =
    "https://github.com/CloakHQ/cloakbrowser/releases/download";

#[derive(Debug, Clone)]
pub struct CloakRelease {
    pub version: String,
    pub asset_url: String,
    pub archive_name: String,
    pub sha256: String,
    pub platform: String,
    pub arch: String,
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
    let archive_name = archive_name_for_platform(platform);
    let asset_url = format!(
        "{DOWNLOAD_BASE_URL}/chromium-v{version}/{archive_name}"
    );

    let sha256 = embedded_checksum(platform)
        .ok_or_else(|| AppError::CloakRuntimeVersionUnsupported(version.to_string()))?;

    Ok(CloakRelease {
        version: version.to_string(),
        asset_url,
        archive_name,
        sha256: sha256.to_string(),
        platform: platform.to_string(),
        arch: arch.to_string(),
    })
}

pub fn pinned_release() -> Result<CloakRelease, AppError> {
    resolve_release(PINNED_CLOAK_VERSION)
}

pub fn latest_supported_version() -> &'static str {
    PINNED_CLOAK_VERSION
}

pub async fn fetch_checksums(version: &str) -> Result<HashMap<String, String>, AppError> {
    let urls = [
        format!("{DOWNLOAD_BASE_URL}/chromium-v{version}/SHA256SUMS"),
        format!("{GITHUB_DOWNLOAD_BASE_URL}/chromium-v{version}/SHA256SUMS"),
    ];

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
            result.insert(name.trim_start_matches('*').to_string(), hash.to_lowercase());
        }
    }
    result
}

fn archive_name_for_platform(platform: &str) -> String {
    match platform {
        "windows" => "cloakbrowser-windows-x64.zip".to_string(),
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_checksums_reads_manifest() {
        let text = "version=146.0.7680.177.5\n4a12bcde95fa1bb1beef2b41ab5e5c27c36be78e3be3d0dac8c64d705216670e  cloakbrowser-linux-x64.tar.gz\n";
        let parsed = parse_checksums(text);
        assert_eq!(
            parsed.get("cloakbrowser-linux-x64.tar.gz").map(String::as_str),
            Some("4a12bcde95fa1bb1beef2b41ab5e5c27c36be78e3be3d0dac8c64d705216670e")
        );
    }
}
