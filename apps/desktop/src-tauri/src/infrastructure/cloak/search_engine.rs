use std::path::Path;

use serde_json::{json, Value};

use crate::error::AppError;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SearchEngine {
    Brave,
    #[allow(dead_code)]
    DuckDuckGo,
}

impl SearchEngine {
    pub fn default_engine() -> Self {
        Self::Brave
    }

    fn short_name(self) -> &'static str {
        match self {
            Self::Brave => "Brave",
            Self::DuckDuckGo => "DuckDuckGo",
        }
    }

    fn keyword(self) -> &'static str {
        match self {
            Self::Brave => "brave.com",
            Self::DuckDuckGo => "duckduckgo.com",
        }
    }

    fn search_url(self) -> &'static str {
        match self {
            Self::Brave => "https://search.brave.com/search?q={searchTerms}",
            Self::DuckDuckGo => "https://duckduckgo.com/?q={searchTerms}&ia=web",
        }
    }

    fn favicon_url(self) -> &'static str {
        match self {
            Self::Brave => "https://search.brave.com/favicon.ico",
            Self::DuckDuckGo => "https://duckduckgo.com/favicon.ico",
        }
    }

    fn suggestions_url(self) -> &'static str {
        match self {
            Self::Brave => "https://search.brave.com/api/suggest?q={searchTerms}",
            Self::DuckDuckGo => "https://duckduckgo.com/ac/?q={searchTerms}&type=list",
        }
    }

    fn template_url_data(self) -> Value {
        json!({
            "short_name": self.short_name(),
            "keyword": self.keyword(),
            "url": self.search_url(),
            "new_tab_url": "",
            "suggestions_url": self.suggestions_url(),
            "favicon_url": self.favicon_url(),
            "input_encodings": ["UTF-8"],
            "safe_for_autoreplace": true
        })
    }

    fn default_search_provider(self) -> Value {
        json!({
            "enabled": true,
            "short_name": self.short_name(),
            "keyword": self.keyword(),
            "search_url": self.search_url(),
            "favicon_url": self.favicon_url(),
            "safe_for_autoreplace": true,
            "is_active": 0
        })
    }
}

/// CloakBrowser ships de-Googled without a prepopulated search engine. Without one,
/// the omnibox treats dotless keywords as bare hostnames (`http://query`).
/// Seed Brave Search into Chromium preferences before the first launch of a profile.
pub fn ensure_default_search_engine(user_data_dir: &Path) -> Result<(), AppError> {
    ensure_search_engine(user_data_dir, SearchEngine::default_engine())
}

pub fn ensure_search_engine(user_data_dir: &Path, engine: SearchEngine) -> Result<(), AppError> {
    let profile_dir = user_data_dir.join("Default");
    std::fs::create_dir_all(&profile_dir)?;

    let prefs_file = profile_dir.join("Preferences");
    let mut prefs = read_preferences(&prefs_file)?;

    if search_engine_configured(&prefs) {
        return Ok(());
    }

    let root = prefs
        .as_object_mut()
        .ok_or_else(|| AppError::CloakConfigInvalid("invalid browser preferences root".into()))?;

    root.entry("default_search_provider_data")
        .or_insert_with(|| json!({}))
        .as_object_mut()
        .ok_or_else(|| AppError::CloakConfigInvalid("invalid search provider data".into()))?
        .insert("template_url_data".to_string(), engine.template_url_data());

    root.insert(
        "default_search_provider".to_string(),
        engine.default_search_provider(),
    );

    write_preferences(&prefs_file, &prefs)?;
    Ok(())
}

fn read_preferences(path: &Path) -> Result<Value, AppError> {
    if !path.exists() {
        return Ok(json!({}));
    }

    let raw = std::fs::read_to_string(path)?;
    serde_json::from_str(&raw).map_err(|error| {
        AppError::CloakConfigInvalid(format!("invalid browser preferences JSON: {error}"))
    })
}

fn write_preferences(path: &Path, prefs: &Value) -> Result<(), AppError> {
    std::fs::write(path, serde_json::to_string(prefs)?)?;
    Ok(())
}

fn search_engine_configured(prefs: &Value) -> bool {
    let search_url = prefs
        .pointer("/default_search_provider/search_url")
        .and_then(Value::as_str)
        .or_else(|| {
            prefs
                .pointer("/default_search_provider_data/template_url_data/url")
                .and_then(Value::as_str)
        });

    search_url.is_some_and(|url| url.starts_with("https://") && url.contains("{searchTerms}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ensure_default_writes_brave_template() {
        let temp = std::env::temp_dir().join(format!(
            "profiledock-search-engine-{}",
            uuid::Uuid::new_v4()
        ));
        let user_data_dir = temp.join("browser-data");
        std::fs::create_dir_all(&user_data_dir).unwrap();

        ensure_default_search_engine(&user_data_dir).unwrap();

        let prefs: Value = serde_json::from_str(
            &std::fs::read_to_string(user_data_dir.join("Default/Preferences")).unwrap(),
        )
        .unwrap();
        let template = &prefs["default_search_provider_data"]["template_url_data"];
        assert_eq!(template["short_name"], "Brave");
        assert_eq!(template["keyword"], "brave.com");
        assert!(template["url"]
            .as_str()
            .unwrap()
            .starts_with("https://search.brave.com"));
        assert_eq!(
            prefs["default_search_provider"]["search_url"]
                .as_str()
                .unwrap()
                .starts_with("https://search.brave.com"),
            true
        );

        ensure_default_search_engine(&user_data_dir).unwrap();
        let prefs_again: Value = serde_json::from_str(
            &std::fs::read_to_string(user_data_dir.join("Default/Preferences")).unwrap(),
        )
        .unwrap();
        assert_eq!(
            prefs_again["default_search_provider_data"]["template_url_data"]["short_name"],
            "Brave"
        );

        std::fs::remove_dir_all(temp).ok();
    }

    #[test]
    fn ensure_default_skips_when_search_engine_already_configured() {
        let temp = std::env::temp_dir().join(format!(
            "profiledock-search-engine-skip-{}",
            uuid::Uuid::new_v4()
        ));
        let user_data_dir = temp.join("browser-data");
        let profile_dir = user_data_dir.join("Default");
        std::fs::create_dir_all(&profile_dir).unwrap();

        let existing = json!({
            "default_search_provider_data": {
                "template_url_data": {
                    "short_name": "Google",
                    "keyword": "google.com",
                    "url": "https://www.google.com/search?q={searchTerms}"
                }
            }
        });
        std::fs::write(
            profile_dir.join("Preferences"),
            serde_json::to_string(&existing).unwrap(),
        )
        .unwrap();

        ensure_default_search_engine(&user_data_dir).unwrap();

        let prefs: Value = serde_json::from_str(
            &std::fs::read_to_string(profile_dir.join("Preferences")).unwrap(),
        )
        .unwrap();
        assert_eq!(
            prefs["default_search_provider_data"]["template_url_data"]["short_name"],
            "Google"
        );

        std::fs::remove_dir_all(temp).ok();
    }

    #[test]
    fn ensure_duckduckgo_writes_template() {
        let temp = std::env::temp_dir().join(format!(
            "profiledock-search-engine-ddg-{}",
            uuid::Uuid::new_v4()
        ));
        let user_data_dir = temp.join("browser-data");
        std::fs::create_dir_all(&user_data_dir).unwrap();

        ensure_search_engine(&user_data_dir, SearchEngine::DuckDuckGo).unwrap();

        let prefs: Value = serde_json::from_str(
            &std::fs::read_to_string(user_data_dir.join("Default/Preferences")).unwrap(),
        )
        .unwrap();
        let template = &prefs["default_search_provider_data"]["template_url_data"];
        assert_eq!(template["short_name"], "DuckDuckGo");
        assert_eq!(template["keyword"], "duckduckgo.com");
        assert!(template["url"]
            .as_str()
            .unwrap()
            .starts_with("https://duckduckgo.com"));

        std::fs::remove_dir_all(temp).ok();
    }

    #[test]
    fn ensure_default_repairs_broken_search_engine() {
        let temp = std::env::temp_dir().join(format!(
            "profiledock-search-engine-broken-{}",
            uuid::Uuid::new_v4()
        ));
        let user_data_dir = temp.join("browser-data");
        let profile_dir = user_data_dir.join("Default");
        std::fs::create_dir_all(&profile_dir).unwrap();

        let broken = json!({
            "default_search_provider_data": {
                "template_url_data": {
                    "short_name": "",
                    "url": "http://{searchTerms}"
                }
            }
        });
        std::fs::write(
            profile_dir.join("Preferences"),
            serde_json::to_string(&broken).unwrap(),
        )
        .unwrap();

        ensure_default_search_engine(&user_data_dir).unwrap();

        let prefs: Value = serde_json::from_str(
            &std::fs::read_to_string(profile_dir.join("Preferences")).unwrap(),
        )
        .unwrap();
        assert_eq!(
            prefs["default_search_provider_data"]["template_url_data"]["short_name"],
            "Brave"
        );

        std::fs::remove_dir_all(temp).ok();
    }
}
