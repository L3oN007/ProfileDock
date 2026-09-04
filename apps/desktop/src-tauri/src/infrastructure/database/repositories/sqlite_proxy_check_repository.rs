use chrono::{DateTime, Utc};
use sqlx::FromRow;
use sqlx::SqlitePool;

use crate::domain::proxy::ProxyCheckRecord;
use crate::error::AppError;

#[derive(Clone)]
pub struct SqliteProxyCheckRepository {
    pool: SqlitePool,
}

impl SqliteProxyCheckRepository {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn insert(&self, record: &ProxyCheckRecord) -> Result<(), AppError> {
        sqlx::query(
            "INSERT INTO proxy_checks (id, proxy_id, success, latency_ms, observed_ip, error_code, error_message, checked_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(&record.id)
        .bind(&record.proxy_id)
        .bind(record.success as i64)
        .bind(record.latency_ms.map(|v| v as i64))
        .bind(&record.observed_ip)
        .bind(&record.error_code)
        .bind(&record.error_message)
        .bind(record.checked_at.to_rfc3339())
        .execute(&self.pool)
        .await?;

        self.trim_old_checks(&record.proxy_id, 50).await?;
        Ok(())
    }

    pub async fn latest_for_proxy(
        &self,
        proxy_id: &str,
    ) -> Result<Option<ProxyCheckRecord>, AppError> {
        let row = sqlx::query_as::<_, CheckRow>(
            "SELECT id, proxy_id, success, latency_ms, observed_ip, error_code, error_message, checked_at
             FROM proxy_checks WHERE proxy_id = ? ORDER BY checked_at DESC LIMIT 1",
        )
        .bind(proxy_id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.map(CheckRow::into_record))
    }

    pub async fn list_for_proxy(
        &self,
        proxy_id: &str,
        limit: u32,
    ) -> Result<Vec<ProxyCheckRecord>, AppError> {
        let rows = sqlx::query_as::<_, CheckRow>(
            "SELECT id, proxy_id, success, latency_ms, observed_ip, error_code, error_message, checked_at
             FROM proxy_checks WHERE proxy_id = ? ORDER BY checked_at DESC LIMIT ?",
        )
        .bind(proxy_id)
        .bind(limit)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows.into_iter().map(CheckRow::into_record).collect())
    }

    async fn trim_old_checks(&self, proxy_id: &str, keep: u32) -> Result<(), AppError> {
        sqlx::query(
            "DELETE FROM proxy_checks
             WHERE proxy_id = ?
             AND id NOT IN (
                SELECT id FROM proxy_checks
                WHERE proxy_id = ?
                ORDER BY checked_at DESC
                LIMIT ?
             )",
        )
        .bind(proxy_id)
        .bind(proxy_id)
        .bind(keep)
        .execute(&self.pool)
        .await?;

        Ok(())
    }
}

#[derive(Debug, FromRow)]
struct CheckRow {
    id: String,
    proxy_id: String,
    success: i64,
    latency_ms: Option<i64>,
    observed_ip: Option<String>,
    error_code: Option<String>,
    error_message: Option<String>,
    checked_at: String,
}

impl CheckRow {
    fn into_record(self) -> ProxyCheckRecord {
        ProxyCheckRecord {
            id: self.id,
            proxy_id: self.proxy_id,
            success: self.success != 0,
            latency_ms: self.latency_ms.map(|v| v as u64),
            observed_ip: self.observed_ip,
            error_code: self.error_code,
            error_message: self.error_message,
            checked_at: DateTime::parse_from_rfc3339(&self.checked_at)
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or_else(|_| Utc::now()),
        }
    }
}
