use std::path::Path;

use serde_json::{json, Value};

use crate::error::AppError;

const PROFILE_DIRECTORY: &str = "Default";
const LOCAL_STATE_FILE: &str = "Local State";
const AVATAR_COUNT: usize = 26;

/// Chrome profile theme colors (RGB) used for avatar fill/highlight.
const PROFILE_COLORS: [(u8, u8, u8); 8] = [
    (26, 115, 232),
    (234, 67, 53),
    (251, 188, 4),
    (52, 168, 83),
    (255, 109, 1),
    (156, 39, 176),
    (0, 172, 193),
    (233, 30, 99),
];

/// Seed Chromium's Local State so the in-browser profile avatar shows the
/// ProfileDock profile name and a stable color derived from the profile id.
pub fn ensure_profile_identity(
    user_data_dir: &Path,
    profile_name: &str,
    profile_id: &str,
) -> Result<(), AppError> {
    let trimmed = profile_name.trim();
    if trimmed.is_empty() {
        return Err(AppError::InvalidConfiguration(
            "profile name cannot be empty".into(),
        ));
    }

    let display_name = if trimmed.len() > 100 {
        trimmed[..100].to_string()
    } else {
        trimmed.to_string()
    };

    let local_state_path = user_data_dir.join(LOCAL_STATE_FILE);
    let mut local_state = read_local_state(&local_state_path)?;
    let theme = profile_theme(profile_id);

    let root = local_state
        .as_object_mut()
        .ok_or_else(|| AppError::CloakConfigInvalid("invalid browser local state root".into()))?;

    let profile = root
        .entry("profile")
        .or_insert_with(|| json!({}))
        .as_object_mut()
        .ok_or_else(|| AppError::CloakConfigInvalid("invalid browser profile root".into()))?;

    let info_cache = profile
        .entry("info_cache")
        .or_insert_with(|| json!({}))
        .as_object_mut()
        .ok_or_else(|| AppError::CloakConfigInvalid("invalid browser profile info cache".into()))?;

    let entry = info_cache
        .entry(PROFILE_DIRECTORY)
        .or_insert_with(|| json!({}))
        .as_object_mut()
        .ok_or_else(|| {
            AppError::CloakConfigInvalid("invalid browser profile info cache entry".into())
        })?;

    entry.insert("name".to_string(), json!(display_name));
    entry.insert("user_name".to_string(), json!(display_name));
    entry.insert(
        "avatar_icon".to_string(),
        json!(format!(
            "chrome://theme/IDR_PROFILE_AVATAR_{}",
            theme.avatar_index
        )),
    );
    entry.insert("background_apps".to_string(), json!(false));
    entry.insert("using_default_name".to_string(), json!(false));
    entry.insert(
        "profile_highlight_color".to_string(),
        json!(theme.highlight_color),
    );
    entry.insert(
        "default_avatar_fill_color".to_string(),
        json!(theme.fill_color),
    );
    entry.insert(
        "default_avatar_stroke_color".to_string(),
        json!(theme.stroke_color),
    );
    entry.insert("profile_color_seed".to_string(), json!(theme.color_seed));

    profile.insert("last_used".to_string(), json!(PROFILE_DIRECTORY));
    profile.insert(
        "last_active_profiles".to_string(),
        json!([PROFILE_DIRECTORY]),
    );

    write_local_state(&local_state_path, &local_state)?;
    Ok(())
}

struct ProfileTheme {
    avatar_index: usize,
    highlight_color: i32,
    fill_color: i32,
    stroke_color: i32,
    color_seed: i32,
}

fn profile_theme(profile_id: &str) -> ProfileTheme {
    let hash = stable_hash(profile_id);
    let avatar_index = (hash % AVATAR_COUNT as u64) as usize;
    let (red, green, blue) = PROFILE_COLORS[(hash % PROFILE_COLORS.len() as u64) as usize];
    let fill_color = sk_color_from_rgb(red, green, blue);
    let stroke_color = sk_color_from_rgb(
        darken_component(red),
        darken_component(green),
        darken_component(blue),
    );

    ProfileTheme {
        avatar_index,
        highlight_color: fill_color,
        fill_color,
        stroke_color,
        color_seed: fill_color,
    }
}

fn stable_hash(input: &str) -> u64 {
    let mut hash = 5381u64;
    for byte in input.bytes() {
        hash = hash.wrapping_mul(33).wrapping_add(byte as u64);
    }
    hash
}

fn sk_color_from_rgb(red: u8, green: u8, blue: u8) -> i32 {
    let argb = 0xFF000000u32 | ((red as u32) << 16) | ((green as u32) << 8) | blue as u32;
    argb as i32
}

fn darken_component(value: u8) -> u8 {
    ((value as u16 * 80) / 100) as u8
}

fn read_local_state(path: &Path) -> Result<Value, AppError> {
    if !path.exists() {
        return Ok(json!({}));
    }

    let raw = std::fs::read_to_string(path)?;
    serde_json::from_str(&raw).map_err(|error| {
        AppError::CloakConfigInvalid(format!("invalid browser local state JSON: {error}"))
    })
}

fn write_local_state(path: &Path, state: &Value) -> Result<(), AppError> {
    std::fs::write(path, serde_json::to_string(state)?)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ensure_profile_identity_writes_name_and_theme_colors() {
        let temp = std::env::temp_dir().join(format!(
            "profiledock-profile-identity-{}",
            uuid::Uuid::new_v4()
        ));
        let user_data_dir = temp.join("browser-data");
        std::fs::create_dir_all(&user_data_dir).unwrap();

        ensure_profile_identity(&user_data_dir, "TikTok Ads", "profile-abc").unwrap();

        let state: Value = serde_json::from_str(
            &std::fs::read_to_string(user_data_dir.join(LOCAL_STATE_FILE)).unwrap(),
        )
        .unwrap();
        let entry = &state["profile"]["info_cache"]["Default"];
        assert_eq!(entry["name"], "TikTok Ads");
        assert_eq!(entry["user_name"], "TikTok Ads");
        assert_eq!(entry["using_default_name"], false);
        assert!(entry["avatar_icon"]
            .as_str()
            .unwrap()
            .starts_with("chrome://theme/IDR_PROFILE_AVATAR_"));
        assert!(entry["profile_highlight_color"].is_number());
        assert!(entry["default_avatar_fill_color"].is_number());
        assert!(entry["default_avatar_stroke_color"].is_number());
        assert_eq!(state["profile"]["last_used"], "Default");

        std::fs::remove_dir_all(temp).ok();
    }

    #[test]
    fn ensure_profile_identity_updates_name_but_keeps_stable_theme() {
        let temp = std::env::temp_dir().join(format!(
            "profiledock-profile-identity-update-{}",
            uuid::Uuid::new_v4()
        ));
        let user_data_dir = temp.join("browser-data");
        std::fs::create_dir_all(&user_data_dir).unwrap();

        ensure_profile_identity(&user_data_dir, "Alpha", "profile-stable").unwrap();
        let first: Value = serde_json::from_str(
            &std::fs::read_to_string(user_data_dir.join(LOCAL_STATE_FILE)).unwrap(),
        )
        .unwrap();
        let first_color = first["profile"]["info_cache"]["Default"]["profile_color_seed"].clone();

        ensure_profile_identity(&user_data_dir, "Beta", "profile-stable").unwrap();
        let second: Value = serde_json::from_str(
            &std::fs::read_to_string(user_data_dir.join(LOCAL_STATE_FILE)).unwrap(),
        )
        .unwrap();
        let entry = &second["profile"]["info_cache"]["Default"];

        assert_eq!(entry["name"], "Beta");
        assert_eq!(entry["profile_color_seed"], first_color);

        std::fs::remove_dir_all(temp).ok();
    }

    #[test]
    fn rejects_empty_profile_name() {
        let temp = std::env::temp_dir().join(format!(
            "profiledock-profile-identity-empty-{}",
            uuid::Uuid::new_v4()
        ));
        let user_data_dir = temp.join("browser-data");
        std::fs::create_dir_all(&user_data_dir).unwrap();

        let result = ensure_profile_identity(&user_data_dir, "   ", "profile-1");
        assert!(result.is_err());

        std::fs::remove_dir_all(temp).ok();
    }
}
