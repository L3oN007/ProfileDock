use chrono::{DateTime, Utc};
use sqlx::SqlitePool;

use crate::domain::profile::Profile;
use crate::error::AppError;

#[derive(Clone)]
pub struct SqliteProfileRepository {
    pool: SqlitePool,
}

impl SqliteProfileRepository {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    pub fn pool(&self) -> &SqlitePool {
        &self.pool
    }

    pub async fn allocate_display_id(&self) -> Result<String, AppError> {
        let mut tx = self.pool.begin().await?;
        let next_value: i64 =
            sqlx::query_scalar("SELECT next_value FROM profile_sequence WHERE id = 1")
                .fetch_one(&mut *tx)
                .await?;
        sqlx::query("UPDATE profile_sequence SET next_value = next_value + 1 WHERE id = 1")
            .execute(&mut *tx)
            .await?;
        tx.commit().await?;
        Ok(format!("PD-{next_value:06}"))
    }

    pub async fn backfill_display_ids(&self) -> Result<(), AppError> {
        let ids: Vec<String> = sqlx::query_scalar(
            "SELECT id FROM profiles WHERE display_id IS NULL ORDER BY created_at ASC",
        )
        .fetch_all(&self.pool)
        .await?;

        for id in ids {
            let display_id = self.allocate_display_id().await?;
            sqlx::query("UPDATE profiles SET display_id = ? WHERE id = ?")
                .bind(display_id)
                .bind(id)
                .execute(&self.pool)
                .await?;
        }
        Ok(())
    }

    pub async fn create(&self, profile: &Profile) -> Result<(), AppError> {
        sqlx::query(
            "INSERT INTO profiles (
                id, display_id, name, description, group_id, remark, notes, platform_label,
                is_archived, created_at, updated_at
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(&profile.id)
        .bind(&profile.display_id)
        .bind(&profile.name)
        .bind(&profile.description)
        .bind(&profile.group_id)
        .bind(&profile.remark)
        .bind(&profile.notes)
        .bind(&profile.platform_label)
        .bind(profile.is_archived as i64)
        .bind(profile.created_at.to_rfc3339())
        .bind(profile.updated_at.to_rfc3339())
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn find_by_id(&self, id: &str) -> Result<Option<Profile>, AppError> {
        let row = sqlx::query_as::<_, ProfileRow>(
            "SELECT id, display_id, name, description, group_id, remark, notes, platform_label,
                    is_archived, created_at, updated_at
             FROM profiles WHERE id = ?",
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;
        Ok(row.map(ProfileRow::into_profile))
    }

    pub async fn list(
        &self,
        include_archived: bool,
        search: Option<&str>,
    ) -> Result<Vec<Profile>, AppError> {
        let mut query = String::from(
            "SELECT id, display_id, name, description, group_id, remark, notes, platform_label,
                    is_archived, created_at, updated_at
             FROM profiles WHERE 1 = 1",
        );

        if !include_archived {
            query.push_str(" AND is_archived = 0");
        }

        if let Some(term) = search.map(str::trim).filter(|value| !value.is_empty()) {
            let pattern = format!("%{term}%");
            let rows = if include_archived {
                sqlx::query_as::<_, ProfileRow>(
                    "SELECT id, display_id, name, description, group_id, remark, notes, platform_label,
                            is_archived, created_at, updated_at
                     FROM profiles
                     WHERE (name LIKE ? OR remark LIKE ? OR display_id LIKE ?)
                     ORDER BY created_at DESC",
                )
                .bind(&pattern)
                .bind(&pattern)
                .bind(&pattern)
                .fetch_all(&self.pool)
                .await?
            } else {
                sqlx::query_as::<_, ProfileRow>(
                    "SELECT id, display_id, name, description, group_id, remark, notes, platform_label,
                            is_archived, created_at, updated_at
                     FROM profiles
                     WHERE is_archived = 0
                       AND (name LIKE ? OR remark LIKE ? OR display_id LIKE ?)
                     ORDER BY created_at DESC",
                )
                .bind(&pattern)
                .bind(&pattern)
                .bind(&pattern)
                .fetch_all(&self.pool)
                .await?
            };
            return Ok(rows.into_iter().map(ProfileRow::into_profile).collect());
        }

        let rows = if include_archived {
            sqlx::query_as::<_, ProfileRow>(&format!("{query} ORDER BY created_at DESC"))
                .fetch_all(&self.pool)
                .await?
        } else {
            sqlx::query_as::<_, ProfileRow>(&format!("{query} ORDER BY created_at DESC"))
                .fetch_all(&self.pool)
                .await?
        };

        Ok(rows.into_iter().map(ProfileRow::into_profile).collect())
    }

    pub async fn update(&self, profile: &Profile) -> Result<(), AppError> {
        sqlx::query(
            "UPDATE profiles
             SET name = ?, description = ?, group_id = ?, remark = ?, notes = ?, platform_label = ?,
                 updated_at = ?
             WHERE id = ?",
        )
        .bind(&profile.name)
        .bind(&profile.description)
        .bind(&profile.group_id)
        .bind(&profile.remark)
        .bind(&profile.notes)
        .bind(&profile.platform_label)
        .bind(profile.updated_at.to_rfc3339())
        .bind(&profile.id)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn archive(&self, id: &str) -> Result<(), AppError> {
        let now = Utc::now().to_rfc3339();
        sqlx::query("UPDATE profiles SET is_archived = 1, updated_at = ? WHERE id = ?")
            .bind(now)
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn restore(&self, id: &str) -> Result<(), AppError> {
        let now = Utc::now().to_rfc3339();
        sqlx::query("UPDATE profiles SET is_archived = 0, updated_at = ? WHERE id = ?")
            .bind(now)
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn delete_permanent(&self, id: &str) -> Result<(), AppError> {
        sqlx::query("DELETE FROM profiles WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }
}

#[derive(sqlx::FromRow)]
pub struct ProfileRow {
    pub id: String,
    pub display_id: Option<String>,
    pub name: String,
    pub description: Option<String>,
    pub group_id: Option<String>,
    pub remark: Option<String>,
    pub notes: Option<String>,
    pub platform_label: Option<String>,
    pub is_archived: i64,
    pub created_at: String,
    pub updated_at: String,
}

impl ProfileRow {
    pub fn into_profile(self) -> Profile {
        Profile {
            id: self.id,
            display_id: self.display_id,
            name: self.name,
            description: self.description,
            group_id: self.group_id,
            remark: self.remark,
            notes: self.notes,
            platform_label: self.platform_label,
            is_archived: self.is_archived != 0,
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
