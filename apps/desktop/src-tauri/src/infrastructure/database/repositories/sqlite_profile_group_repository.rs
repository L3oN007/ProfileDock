use chrono::{DateTime, Utc};
use sqlx::SqlitePool;

use crate::domain::group::ProfileGroup;
use crate::error::AppError;

#[derive(Clone)]
pub struct SqliteProfileGroupRepository {
    pool: SqlitePool,
}

impl SqliteProfileGroupRepository {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn create(&self, group: &ProfileGroup) -> Result<(), AppError> {
        sqlx::query(
            "INSERT INTO profile_groups (id, name, sort_order, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?)",
        )
        .bind(&group.id)
        .bind(&group.name)
        .bind(group.sort_order)
        .bind(group.created_at.to_rfc3339())
        .bind(group.updated_at.to_rfc3339())
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn list_all(&self) -> Result<Vec<ProfileGroup>, AppError> {
        let rows = sqlx::query_as::<_, GroupRow>(
            "SELECT id, name, sort_order, created_at, updated_at
             FROM profile_groups ORDER BY sort_order ASC, name ASC",
        )
        .fetch_all(&self.pool)
        .await?;
        Ok(rows.into_iter().map(GroupRow::into_group).collect())
    }

    pub async fn find_by_id(&self, id: &str) -> Result<Option<ProfileGroup>, AppError> {
        let row = sqlx::query_as::<_, GroupRow>(
            "SELECT id, name, sort_order, created_at, updated_at
             FROM profile_groups WHERE id = ?",
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;
        Ok(row.map(GroupRow::into_group))
    }

    pub async fn count_profiles(&self, group_id: &str) -> Result<i64, AppError> {
        let count: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM profiles WHERE group_id = ? AND is_archived = 0",
        )
        .bind(group_id)
        .fetch_one(&self.pool)
        .await?;
        Ok(count)
    }

    pub async fn update(&self, group: &ProfileGroup) -> Result<(), AppError> {
        sqlx::query(
            "UPDATE profile_groups SET name = ?, sort_order = ?, updated_at = ? WHERE id = ?",
        )
        .bind(&group.name)
        .bind(group.sort_order)
        .bind(group.updated_at.to_rfc3339())
        .bind(&group.id)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn delete(&self, id: &str) -> Result<(), AppError> {
        sqlx::query("UPDATE profiles SET group_id = NULL, updated_at = ? WHERE group_id = ?")
            .bind(Utc::now().to_rfc3339())
            .bind(id)
            .execute(&self.pool)
            .await?;
        sqlx::query("DELETE FROM profile_groups WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }
}

#[derive(sqlx::FromRow)]
struct GroupRow {
    id: String,
    name: String,
    sort_order: i32,
    created_at: String,
    updated_at: String,
}

impl GroupRow {
    fn into_group(self) -> ProfileGroup {
        ProfileGroup {
            id: self.id,
            name: self.name,
            sort_order: self.sort_order,
            created_at: parse_ts(&self.created_at),
            updated_at: parse_ts(&self.updated_at),
        }
    }
}

fn parse_ts(value: &str) -> DateTime<Utc> {
    DateTime::parse_from_rfc3339(value)
        .map(|dt| dt.with_timezone(&Utc))
        .unwrap_or_else(|_| Utc::now())
}
