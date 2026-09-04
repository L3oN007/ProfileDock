use chrono::{DateTime, Utc};
use sqlx::FromRow;
use sqlx::SqlitePool;

use crate::domain::proxy::{Proxy, ProxyProtocol};
use crate::error::AppError;

#[derive(Clone)]
pub struct SqliteProxyRepository {
    pool: SqlitePool,
}

impl SqliteProxyRepository {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn create(&self, proxy: &Proxy) -> Result<(), AppError> {
        sqlx::query(
            "INSERT INTO proxies (id, name, protocol, host, port, username_ref, password_ref, is_enabled, is_archived, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(&proxy.id)
        .bind(&proxy.name)
        .bind(proxy.protocol.as_str())
        .bind(&proxy.host)
        .bind(proxy.port)
        .bind(&proxy.username_ref)
        .bind(&proxy.password_ref)
        .bind(proxy.is_enabled as i64)
        .bind(proxy.is_archived as i64)
        .bind(proxy.created_at.to_rfc3339())
        .bind(proxy.updated_at.to_rfc3339())
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn find_by_id(&self, id: &str) -> Result<Option<Proxy>, AppError> {
        let row = sqlx::query_as::<_, ProxyRow>(
            "SELECT id, name, protocol, host, port, username_ref, password_ref, is_enabled, is_archived, created_at, updated_at
             FROM proxies WHERE id = ?",
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.map(ProxyRow::into_proxy))
    }

    pub async fn list(&self, include_archived: bool) -> Result<Vec<Proxy>, AppError> {
        let rows = if include_archived {
            sqlx::query_as::<_, ProxyRow>(
                "SELECT id, name, protocol, host, port, username_ref, password_ref, is_enabled, is_archived, created_at, updated_at
                 FROM proxies ORDER BY created_at DESC",
            )
            .fetch_all(&self.pool)
            .await?
        } else {
            sqlx::query_as::<_, ProxyRow>(
                "SELECT id, name, protocol, host, port, username_ref, password_ref, is_enabled, is_archived, created_at, updated_at
                 FROM proxies WHERE is_archived = 0 ORDER BY created_at DESC",
            )
            .fetch_all(&self.pool)
            .await?
        };

        Ok(rows.into_iter().map(ProxyRow::into_proxy).collect())
    }

    pub async fn update(&self, proxy: &Proxy) -> Result<(), AppError> {
        sqlx::query(
            "UPDATE proxies SET name = ?, protocol = ?, host = ?, port = ?, username_ref = ?, password_ref = ?, is_enabled = ?, updated_at = ?
             WHERE id = ?",
        )
        .bind(&proxy.name)
        .bind(proxy.protocol.as_str())
        .bind(&proxy.host)
        .bind(proxy.port)
        .bind(&proxy.username_ref)
        .bind(&proxy.password_ref)
        .bind(proxy.is_enabled as i64)
        .bind(proxy.updated_at.to_rfc3339())
        .bind(&proxy.id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn archive(&self, id: &str, updated_at: DateTime<Utc>) -> Result<(), AppError> {
        sqlx::query(
            "UPDATE proxies SET is_archived = 1, updated_at = ? WHERE id = ? AND is_archived = 0",
        )
        .bind(updated_at.to_rfc3339())
        .bind(id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn count_active_assignments(&self, proxy_id: &str) -> Result<u32, AppError> {
        let count: i64 = sqlx::query_scalar(
            "SELECT COUNT(*)
             FROM profile_proxy_assignments a
             JOIN profiles p ON p.id = a.profile_id
             WHERE a.proxy_id = ? AND p.is_archived = 0",
        )
        .bind(proxy_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(count as u32)
    }
}

#[derive(Debug, FromRow)]
struct ProxyRow {
    id: String,
    name: String,
    protocol: String,
    host: String,
    port: i64,
    username_ref: Option<String>,
    password_ref: Option<String>,
    is_enabled: i64,
    is_archived: i64,
    created_at: String,
    updated_at: String,
}

impl ProxyRow {
    fn into_proxy(self) -> Proxy {
        Proxy {
            id: self.id,
            name: self.name,
            protocol: ProxyProtocol::from_str(&self.protocol).unwrap_or(ProxyProtocol::Http),
            host: self.host,
            port: self.port as u16,
            username_ref: self.username_ref,
            password_ref: self.password_ref,
            is_enabled: self.is_enabled != 0,
            is_archived: self.is_archived != 0,
            created_at: DateTime::parse_from_rfc3339(&self.created_at)
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or_else(|_| Utc::now()),
            updated_at: DateTime::parse_from_rfc3339(&self.updated_at)
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or_else(|_| Utc::now()),
        }
    }
}
