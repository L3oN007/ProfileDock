use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

pub const DEFAULT_TAG_COLOR: &str = "gray";

pub const VALID_TAG_COLORS: &[&str] = &[
    "gray",
    "brown",
    "orange",
    "yellow",
    "green",
    "blue",
    "purple",
    "pink",
    "red",
];

pub fn normalize_tag_color(color: Option<&str>) -> String {
    let value = color.unwrap_or(DEFAULT_TAG_COLOR);
    if VALID_TAG_COLORS.contains(&value) {
        value.to_string()
    } else {
        DEFAULT_TAG_COLOR.to_string()
    }
}

#[derive(Debug, Clone)]
pub struct Tag {
    pub id: String,
    pub name: String,
    pub color: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProfileTagDto {
    pub id: String,
    pub name: String,
    pub color: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TagDto {
    pub id: String,
    pub name: String,
    pub color: String,
    pub profile_count: usize,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateTagInput {
    pub name: String,
    pub color: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateTagInput {
    pub color: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TagAssignmentInput {
    pub name: String,
    pub color: Option<String>,
}
