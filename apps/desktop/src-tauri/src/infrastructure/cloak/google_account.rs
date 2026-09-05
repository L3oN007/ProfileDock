use std::path::Path;

use serde_json::Value;

const PROFILE_DIRECTORY: &str = "Default";

/// Read the Google account email linked in a Chromium profile, if any.
pub fn read_linked_google_account(user_data_dir: &Path) -> Option<String> {
    read_from_preferences(user_data_dir).or_else(|| read_from_local_state(user_data_dir))
}

fn read_from_preferences(user_data_dir: &Path) -> Option<String> {
    let path = user_data_dir.join(PROFILE_DIRECTORY).join("Preferences");
    if !path.exists() {
        return None;
    }

    let raw = std::fs::read_to_string(path).ok()?;
    let prefs: Value = serde_json::from_str(&raw).ok()?;

    if let Some(email) = prefs
        .pointer("/account_info/0/email")
        .and_then(Value::as_str)
        .and_then(normalize_email)
    {
        return Some(email);
    }

    for entry in prefs
        .get("account_info")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
    {
        if let Some(email) = entry.get("email").and_then(Value::as_str).and_then(normalize_email) {
            return Some(email);
        }
    }

    prefs
        .pointer("/signin.allowed_username")
        .and_then(Value::as_str)
        .and_then(normalize_email)
}

fn read_from_local_state(user_data_dir: &Path) -> Option<String> {
    let path = user_data_dir.join("Local State");
    if !path.exists() {
        return None;
    }

    let raw = std::fs::read_to_string(path).ok()?;
    let state: Value = serde_json::from_str(&raw).ok()?;

    let cache_paths = [
        format!("/profile/info_cache/{PROFILE_DIRECTORY}/user_name"),
        format!("/profile/info_cache/{PROFILE_DIRECTORY}/gaia_name"),
    ];

    for pointer in cache_paths {
        if let Some(email) = state
            .pointer(&pointer)
            .and_then(Value::as_str)
            .and_then(normalize_email)
        {
            return Some(email);
        }
    }

    None
}

fn normalize_email(value: &str) -> Option<String> {
    let trimmed = value.trim();
    if trimmed.is_empty() || trimmed.contains(char::is_whitespace) {
        return None;
    }

    if trimmed.contains('@') && trimmed.len() <= 254 {
        Some(trimmed.to_string())
    } else {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_google_account_from_preferences_account_info() {
        let temp = std::env::temp_dir().join(format!(
            "profiledock-google-account-prefs-{}",
            uuid::Uuid::new_v4()
        ));
        let user_data_dir = temp.join("browser-data");
        let profile_dir = user_data_dir.join("Default");
        std::fs::create_dir_all(&profile_dir).unwrap();
        std::fs::write(
            profile_dir.join("Preferences"),
            r#"{
                "account_info": [
                    {
                        "account_id": "123",
                        "email": "ads.test@gmail.com",
                        "full_name": "Ads Test"
                    }
                ]
            }"#,
        )
        .unwrap();

        assert_eq!(
            read_linked_google_account(&user_data_dir),
            Some("ads.test@gmail.com".to_string())
        );

        std::fs::remove_dir_all(temp).ok();
    }

    #[test]
    fn reads_google_account_from_local_state_user_name() {
        let temp = std::env::temp_dir().join(format!(
            "profiledock-google-account-local-{}",
            uuid::Uuid::new_v4()
        ));
        let user_data_dir = temp.join("browser-data");
        std::fs::create_dir_all(&user_data_dir).unwrap();
        std::fs::write(
            user_data_dir.join("Local State"),
            r#"{
                "profile": {
                    "info_cache": {
                        "Default": {
                            "user_name": "workspace.user@gmail.com"
                        }
                    }
                }
            }"#,
        )
        .unwrap();

        assert_eq!(
            read_linked_google_account(&user_data_dir),
            Some("workspace.user@gmail.com".to_string())
        );

        std::fs::remove_dir_all(temp).ok();
    }

    #[test]
    fn returns_none_when_no_google_account_is_linked() {
        let temp = std::env::temp_dir().join(format!(
            "profiledock-google-account-empty-{}",
            uuid::Uuid::new_v4()
        ));
        let user_data_dir = temp.join("browser-data");
        std::fs::create_dir_all(&user_data_dir).unwrap();

        assert_eq!(read_linked_google_account(&user_data_dir), None);

        std::fs::remove_dir_all(temp).ok();
    }
}
