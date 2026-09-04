use std::path::PathBuf;

use crate::error::AppError;

const LICENSE_FILE_NAME: &str = "license.key";

pub fn resolve_license_key() -> Option<String> {
    std::env::var("CLOAKBROWSER_LICENSE_KEY")
        .ok()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .or_else(read_license_file)
}

fn read_license_file() -> Option<String> {
    let path = license_file_path()?;
    let contents = std::fs::read_to_string(path).ok()?;
    let trimmed = contents.trim();
    if trimmed.is_empty() {
        None
    } else {
        Some(trimmed.to_string())
    }
}

fn license_file_path() -> Option<PathBuf> {
    dirs::home_dir().map(|home| home.join(".cloakbrowser").join(LICENSE_FILE_NAME))
}

pub fn store_license_key(value: &str) -> Result<(), AppError> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Err(AppError::InvalidConfiguration(
            "CloakBrowser license key cannot be empty".into(),
        ));
    }

    let path = license_file_path().ok_or_else(|| {
        AppError::InvalidConfiguration("unable to resolve CloakBrowser license path".into())
    })?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|error| {
            AppError::InvalidConfiguration(format!(
                "unable to create CloakBrowser cache directory: {error}"
            ))
        })?;
    }
    std::fs::write(&path, format!("{trimmed}\n")).map_err(|error| {
        AppError::InvalidConfiguration(format!("unable to save CloakBrowser license key: {error}"))
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_empty_license_key() {
        let result = store_license_key("   ");
        assert!(result.is_err());
    }
}
