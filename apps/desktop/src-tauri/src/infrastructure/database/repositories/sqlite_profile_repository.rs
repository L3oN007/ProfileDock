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

    pub async fn create(&self, profile: &Profile) -> Result<(), AppError> {
        sqlx::query(
            "INSERT INTO profiles (id, name, description, is_archived, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?)",
        )
        .bind(&profile.id)
        .bind(&profile.name)
        .bind(&profile.description)
        .bind(profile.is_archived as i64)
        .bind(profile.created_at.to_rfc3339())
        .bind(profile.updated_at.to_rfc3339())
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn find_by_id(&self, id: &str) -> Result<Option<Profile>, AppError> {
        let row = sqlx::query_as::<_, ProfileRow>(
            "SELECT id, name, description, is_archived, created_at, updated_at
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
        let mut profiles = if include_archived {
            if let Some(query) = search {
                let pattern = format!("%{query}%");
                sqlx::query_as::<_, ProfileRow>(
                    "SELECT id, name, description, is_archived, created_at, updated_at
                     FROM profiles WHERE name LIKE ? ORDER BY created_at DESC",
                )
                .bind(pattern)
                .fetch_all(&self.pool)
                .await?
            } else {
                sqlx::query_as::<_, ProfileRow>(
                    "SELECT id, name, description, is_archived, created_at, updated_at
                     FROM profiles ORDER BY created_at DESC",
                )
                .fetch_all(&self.pool)
                .await?
            }
        } else if let Some(query) = search {
            let pattern = format!("%{query}%");
            sqlx::query_as::<_, ProfileRow>(
                "SELECT id, name, description, is_archived, created_at, updated_at
                 FROM profiles WHERE is_archived = 0 AND name LIKE ? ORDER BY created_at DESC",
            )
            .bind(pattern)
            .fetch_all(&self.pool)
            .await?
        } else {
            sqlx::query_as::<_, ProfileRow>(
                "SELECT id, name, description, is_archived, created_at, updated_at
                 FROM profiles WHERE is_archived = 0 ORDER BY created_at DESC",
            )
            .fetch_all(&self.pool)
            .await?
        };

        Ok(profiles.drain(..).map(ProfileRow::into_profile).collect())
    }

    pub async fn update(&self, profile: &Profile) -> Result<(), AppError> {
        sqlx::query("UPDATE profiles SET name = ?, description = ?, updated_at = ? WHERE id = ?")
            .bind(&profile.name)
            .bind(&profile.description)
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
}

#[derive(sqlx::FromRow)]
struct ProfileRow {
    id: String,
    name: String,
    description: Option<String>,
    is_archived: i64,
    created_at: String,
    updated_at: String,
}

impl ProfileRow {
    fn into_profile(self) -> Profile {
        Profile {
            id: self.id,
            name: self.name,
            description: self.description,
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
