use chrono::{DateTime, Utc};
use sqlx::SqlitePool;

use crate::domain::tag::Tag;
use crate::error::AppError;

#[derive(Clone)]
pub struct SqliteTagRepository {
    pool: SqlitePool,
}

impl SqliteTagRepository {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn create(&self, tag: &Tag) -> Result<(), AppError> {
        sqlx::query("INSERT INTO tags (id, name, created_at) VALUES (?, ?, ?)")
            .bind(&tag.id)
            .bind(&tag.name)
            .bind(tag.created_at.to_rfc3339())
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn list_all(&self) -> Result<Vec<Tag>, AppError> {
        let rows = sqlx::query_as::<_, TagRow>(
            "SELECT id, name, created_at FROM tags ORDER BY name ASC",
        )
        .fetch_all(&self.pool)
        .await?;
        Ok(rows.into_iter().map(TagRow::into_tag).collect())
    }

    pub async fn find_by_id(&self, id: &str) -> Result<Option<Tag>, AppError> {
        let row = sqlx::query_as::<_, TagRow>("SELECT id, name, created_at FROM tags WHERE id = ?")
            .bind(id)
            .fetch_optional(&self.pool)
            .await?;
        Ok(row.map(TagRow::into_tag))
    }

    pub async fn find_by_name(&self, name: &str) -> Result<Option<Tag>, AppError> {
        let row = sqlx::query_as::<_, TagRow>(
            "SELECT id, name, created_at FROM tags WHERE name = ? COLLATE NOCASE",
        )
        .bind(name.trim())
        .fetch_optional(&self.pool)
        .await?;
        Ok(row.map(TagRow::into_tag))
    }

    pub async fn count_profiles(&self, tag_id: &str) -> Result<i64, AppError> {
        let count: i64 =
            sqlx::query_scalar("SELECT COUNT(*) FROM profile_tags WHERE tag_id = ?")
                .bind(tag_id)
                .fetch_one(&self.pool)
                .await?;
        Ok(count)
    }

    pub async fn delete(&self, id: &str) -> Result<(), AppError> {
        sqlx::query("DELETE FROM profile_tags WHERE tag_id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;
        sqlx::query("DELETE FROM tags WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn set_profile_tags(
        &self,
        profile_id: &str,
        tag_ids: &[String],
    ) -> Result<(), AppError> {
        sqlx::query("DELETE FROM profile_tags WHERE profile_id = ?")
            .bind(profile_id)
            .execute(&self.pool)
            .await?;

        for tag_id in tag_ids {
            sqlx::query("INSERT INTO profile_tags (profile_id, tag_id) VALUES (?, ?)")
                .bind(profile_id)
                .bind(tag_id)
                .execute(&self.pool)
                .await?;
        }
        Ok(())
    }

    pub async fn add_tags_to_profile(
        &self,
        profile_id: &str,
        tag_ids: &[String],
    ) -> Result<(), AppError> {
        for tag_id in tag_ids {
            sqlx::query(
                "INSERT OR IGNORE INTO profile_tags (profile_id, tag_id) VALUES (?, ?)",
            )
            .bind(profile_id)
            .bind(tag_id)
            .execute(&self.pool)
            .await?;
        }
        Ok(())
    }

    pub async fn remove_tags_from_profile(
        &self,
        profile_id: &str,
        tag_ids: &[String],
    ) -> Result<(), AppError> {
        for tag_id in tag_ids {
            sqlx::query("DELETE FROM profile_tags WHERE profile_id = ? AND tag_id = ?")
                .bind(profile_id)
                .bind(tag_id)
                .execute(&self.pool)
                .await?;
        }
        Ok(())
    }

    pub async fn list_profile_tag_names(&self, profile_id: &str) -> Result<Vec<String>, AppError> {
        let names = sqlx::query_scalar::<_, String>(
            "SELECT t.name FROM profile_tags pt
             JOIN tags t ON t.id = pt.tag_id
             WHERE pt.profile_id = ?
             ORDER BY t.name ASC",
        )
        .bind(profile_id)
        .fetch_all(&self.pool)
        .await?;
        Ok(names)
    }

    pub async fn list_profile_tag_ids(&self, profile_id: &str) -> Result<Vec<String>, AppError> {
        let ids = sqlx::query_scalar::<_, String>(
            "SELECT tag_id FROM profile_tags WHERE profile_id = ? ORDER BY tag_id ASC",
        )
        .bind(profile_id)
        .fetch_all(&self.pool)
        .await?;
        Ok(ids)
    }
}

#[derive(sqlx::FromRow)]
struct TagRow {
    id: String,
    name: String,
    created_at: String,
}

impl TagRow {
    fn into_tag(self) -> Tag {
        Tag {
            id: self.id,
            name: self.name,
            created_at: DateTime::parse_from_rfc3339(&self.created_at)
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or_else(|_| Utc::now()),
        }
    }
}
