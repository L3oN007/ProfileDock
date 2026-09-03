use chrono::{DateTime, Utc};
use sqlx::SqlitePool;

use crate::domain::profile::ProfileEventDto;
use crate::error::AppError;

#[derive(Clone)]
pub struct SqliteProfileEventRepository {
    pool: SqlitePool,
}

impl SqliteProfileEventRepository {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn insert(
        &self,
        profile_id: &str,
        event_type: &str,
        metadata: Option<serde_json::Value>,
    ) -> Result<(), AppError> {
        let metadata_json = metadata
            .map(|value| serde_json::to_string(&value))
            .transpose()?;
        let now = Utc::now().to_rfc3339();

        sqlx::query(
            "INSERT INTO profile_events (profile_id, event_type, metadata_json, created_at)
             VALUES (?, ?, ?, ?)",
        )
        .bind(profile_id)
        .bind(event_type)
        .bind(metadata_json)
        .bind(now)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn list_by_profile(
        &self,
        profile_id: &str,
        limit: i64,
    ) -> Result<Vec<ProfileEventDto>, AppError> {
        let rows = sqlx::query_as::<_, EventRow>(
            "SELECT id, profile_id, event_type, metadata_json, created_at
             FROM profile_events WHERE profile_id = ?
             ORDER BY created_at DESC LIMIT ?",
        )
        .bind(profile_id)
        .bind(limit)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows
            .into_iter()
            .map(|row| ProfileEventDto {
                id: row.id,
                profile_id: row.profile_id,
                event_type: row.event_type,
                metadata_json: row.metadata_json,
                created_at: row.created_at,
            })
            .collect())
    }
}

#[derive(sqlx::FromRow)]
struct EventRow {
    id: i64,
    profile_id: String,
    event_type: String,
    metadata_json: Option<String>,
    created_at: String,
}

#[allow(dead_code)]
struct ProfileEvent {
    id: i64,
    profile_id: String,
    event_type: String,
    metadata_json: Option<String>,
    created_at: DateTime<Utc>,
}
