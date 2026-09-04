use chrono::{DateTime, Utc};
use sqlx::SqlitePool;

use crate::domain::profile::{BrowserInstance, InstanceState};
use crate::error::AppError;

#[derive(Clone)]
pub struct SqliteBrowserInstanceRepository {
    pool: SqlitePool,
}

impl SqliteBrowserInstanceRepository {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn insert(&self, instance: &BrowserInstance) -> Result<(), AppError> {
        sqlx::query(
            "INSERT INTO browser_instances
             (id, profile_id, pid, state, started_at, stopped_at, exit_code, error_message, config_snapshot_json, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(&instance.id)
        .bind(&instance.profile_id)
        .bind(instance.pid.map(|pid| pid as i64))
        .bind(instance.state.as_str())
        .bind(instance.started_at.map(|dt| dt.to_rfc3339()))
        .bind(instance.stopped_at.map(|dt| dt.to_rfc3339()))
        .bind(instance.exit_code)
        .bind(&instance.error_message)
        .bind(&instance.config_snapshot_json)
        .bind(instance.created_at.to_rfc3339())
        .bind(instance.updated_at.to_rfc3339())
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn update(&self, instance: &BrowserInstance) -> Result<(), AppError> {
        sqlx::query(
            "UPDATE browser_instances
             SET pid = ?, state = ?, started_at = ?, stopped_at = ?, exit_code = ?, error_message = ?, updated_at = ?
             WHERE id = ?",
        )
        .bind(instance.pid.map(|pid| pid as i64))
        .bind(instance.state.as_str())
        .bind(instance.started_at.map(|dt| dt.to_rfc3339()))
        .bind(instance.stopped_at.map(|dt| dt.to_rfc3339()))
        .bind(instance.exit_code)
        .bind(&instance.error_message)
        .bind(instance.updated_at.to_rfc3339())
        .bind(&instance.id)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn find_active_by_profile(
        &self,
        profile_id: &str,
    ) -> Result<Option<BrowserInstance>, AppError> {
        let row = sqlx::query_as::<_, InstanceRow>(
            "SELECT id, profile_id, pid, state, started_at, stopped_at, exit_code, error_message, config_snapshot_json, created_at, updated_at
             FROM browser_instances
             WHERE profile_id = ? AND state IN ('starting', 'running', 'stopping')
             ORDER BY created_at DESC LIMIT 1",
        )
        .bind(profile_id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.map(InstanceRow::into_instance))
    }

    pub async fn find_by_id(&self, id: &str) -> Result<Option<BrowserInstance>, AppError> {
        let row = sqlx::query_as::<_, InstanceRow>(
            "SELECT id, profile_id, pid, state, started_at, stopped_at, exit_code, error_message, config_snapshot_json, created_at, updated_at
             FROM browser_instances WHERE id = ?",
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.map(InstanceRow::into_instance))
    }

    #[allow(dead_code)]
    pub async fn list_active(&self) -> Result<Vec<BrowserInstance>, AppError> {
        let rows = sqlx::query_as::<_, InstanceRow>(
            "SELECT id, profile_id, pid, state, started_at, stopped_at, exit_code, error_message, config_snapshot_json, created_at, updated_at
             FROM browser_instances WHERE state IN ('starting', 'running', 'stopping')",
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(rows.into_iter().map(InstanceRow::into_instance).collect())
    }

    pub async fn list_running_states(&self) -> Result<Vec<BrowserInstance>, AppError> {
        let rows = sqlx::query_as::<_, InstanceRow>(
            "SELECT id, profile_id, pid, state, started_at, stopped_at, exit_code, error_message, config_snapshot_json, created_at, updated_at
             FROM browser_instances WHERE state = 'running'",
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(rows.into_iter().map(InstanceRow::into_instance).collect())
    }

    pub async fn last_stopped_at(
        &self,
        profile_id: &str,
    ) -> Result<Option<DateTime<Utc>>, AppError> {
        let value: Option<String> = sqlx::query_scalar(
            "SELECT stopped_at FROM browser_instances
             WHERE profile_id = ? AND stopped_at IS NOT NULL
             ORDER BY stopped_at DESC LIMIT 1",
        )
        .bind(profile_id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(value.and_then(|ts| {
            DateTime::parse_from_rfc3339(&ts)
                .ok()
                .map(|dt| dt.with_timezone(&Utc))
        }))
    }
}

#[derive(sqlx::FromRow)]
struct InstanceRow {
    id: String,
    profile_id: String,
    pid: Option<i64>,
    state: String,
    started_at: Option<String>,
    stopped_at: Option<String>,
    exit_code: Option<i32>,
    error_message: Option<String>,
    config_snapshot_json: Option<String>,
    created_at: String,
    updated_at: String,
}

impl InstanceRow {
    fn into_instance(self) -> BrowserInstance {
        BrowserInstance {
            id: self.id,
            profile_id: self.profile_id,
            pid: self.pid.map(|pid| pid as u32),
            state: InstanceState::from_str(&self.state).unwrap_or(InstanceState::Failed),
            started_at: self.started_at.and_then(|ts| {
                DateTime::parse_from_rfc3339(&ts)
                    .ok()
                    .map(|dt| dt.with_timezone(&Utc))
            }),
            stopped_at: self.stopped_at.and_then(|ts| {
                DateTime::parse_from_rfc3339(&ts)
                    .ok()
                    .map(|dt| dt.with_timezone(&Utc))
            }),
            exit_code: self.exit_code,
            error_message: self.error_message,
            config_snapshot_json: self.config_snapshot_json,
            created_at: DateTime::parse_from_rfc3339(&self.created_at)
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or_else(|_| Utc::now()),
            updated_at: DateTime::parse_from_rfc3339(&self.updated_at)
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or_else(|_| Utc::now()),
        }
    }
}
