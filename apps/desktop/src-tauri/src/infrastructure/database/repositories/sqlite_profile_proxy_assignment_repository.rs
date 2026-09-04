use chrono::{DateTime, Utc};
use sqlx::FromRow;
use sqlx::SqlitePool;

use crate::domain::proxy::ProfileProxyAssignment;
use crate::error::AppError;

#[derive(Clone)]
pub struct SqliteProfileProxyAssignmentRepository {
    pool: SqlitePool,
}

impl SqliteProfileProxyAssignmentRepository {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn assign(
        &self,
        profile_id: &str,
        proxy_id: &str,
        assigned_at: DateTime<Utc>,
    ) -> Result<(), AppError> {
        sqlx::query(
            "INSERT INTO profile_proxy_assignments (profile_id, proxy_id, assigned_at, updated_at)
             VALUES (?, ?, ?, ?)
             ON CONFLICT(profile_id) DO UPDATE SET proxy_id = excluded.proxy_id, updated_at = excluded.updated_at",
        )
        .bind(profile_id)
        .bind(proxy_id)
        .bind(assigned_at.to_rfc3339())
        .bind(assigned_at.to_rfc3339())
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn unassign(&self, profile_id: &str) -> Result<(), AppError> {
        sqlx::query("DELETE FROM profile_proxy_assignments WHERE profile_id = ?")
            .bind(profile_id)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    pub async fn find_by_profile(
        &self,
        profile_id: &str,
    ) -> Result<Option<ProfileProxyAssignment>, AppError> {
        let row = sqlx::query_as::<_, AssignmentRow>(
            "SELECT profile_id, proxy_id, assigned_at, updated_at
             FROM profile_proxy_assignments WHERE profile_id = ?",
        )
        .bind(profile_id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.map(AssignmentRow::into_assignment))
    }

    pub async fn list_by_proxy(
        &self,
        proxy_id: &str,
    ) -> Result<Vec<ProfileProxyAssignment>, AppError> {
        let rows = sqlx::query_as::<_, AssignmentRow>(
            "SELECT profile_id, proxy_id, assigned_at, updated_at
             FROM profile_proxy_assignments WHERE proxy_id = ?",
        )
        .bind(proxy_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows.into_iter().map(AssignmentRow::into_assignment).collect())
    }
}

#[derive(Debug, FromRow)]
struct AssignmentRow {
    profile_id: String,
    proxy_id: String,
    assigned_at: String,
    updated_at: String,
}

impl AssignmentRow {
    fn into_assignment(self) -> ProfileProxyAssignment {
        ProfileProxyAssignment {
            profile_id: self.profile_id,
            proxy_id: self.proxy_id,
            assigned_at: DateTime::parse_from_rfc3339(&self.assigned_at)
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or_else(|_| Utc::now()),
            updated_at: DateTime::parse_from_rfc3339(&self.updated_at)
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or_else(|_| Utc::now()),
        }
    }
}
