use chrono::{DateTime, Utc};
use sqlx::SqlitePool;
use std::collections::HashMap;

use crate::domain::tag::{ProfileTagDto, Tag};
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
        sqlx::query("INSERT INTO tags (id, name, color, created_at) VALUES (?, ?, ?, ?)")
            .bind(&tag.id)
            .bind(&tag.name)
            .bind(&tag.color)
            .bind(tag.created_at.to_rfc3339())
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn list_all(&self) -> Result<Vec<Tag>, AppError> {
        let rows = sqlx::query_as::<_, TagRow>(
            "SELECT id, name, color, created_at FROM tags ORDER BY name ASC",
        )
        .fetch_all(&self.pool)
        .await?;
        Ok(rows.into_iter().map(TagRow::into_tag).collect())
    }

    pub async fn find_by_id(&self, id: &str) -> Result<Option<Tag>, AppError> {
        let row = sqlx::query_as::<_, TagRow>(
            "SELECT id, name, color, created_at FROM tags WHERE id = ?",
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;
        Ok(row.map(TagRow::into_tag))
    }

    pub async fn find_by_name(&self, name: &str) -> Result<Option<Tag>, AppError> {
        let row = sqlx::query_as::<_, TagRow>(
            "SELECT id, name, color, created_at FROM tags WHERE name = ? COLLATE NOCASE",
        )
        .bind(name.trim())
        .fetch_optional(&self.pool)
        .await?;
        Ok(row.map(TagRow::into_tag))
    }

    pub async fn count_profiles(&self, tag_id: &str) -> Result<i64, AppError> {
        let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM profile_tags WHERE tag_id = ?")
            .bind(tag_id)
            .fetch_one(&self.pool)
            .await?;
        Ok(count)
    }

    pub async fn update_color(&self, id: &str, color: &str) -> Result<(), AppError> {
        sqlx::query("UPDATE tags SET color = ? WHERE id = ?")
            .bind(color)
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
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
            sqlx::query("INSERT OR IGNORE INTO profile_tags (profile_id, tag_id) VALUES (?, ?)")
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

    pub async fn list_profile_tags(&self, profile_id: &str) -> Result<Vec<ProfileTagDto>, AppError> {
        let rows = sqlx::query_as::<_, ProfileTagRow>(
            "SELECT t.id, t.name, t.color
             FROM profile_tags pt
             JOIN tags t ON t.id = pt.tag_id
             WHERE pt.profile_id = ?
             ORDER BY t.name ASC",
        )
        .bind(profile_id)
        .fetch_all(&self.pool)
        .await?;
        Ok(rows.into_iter().map(ProfileTagRow::into_dto).collect())
    }

    pub async fn list_tags_for_profiles(
        &self,
        profile_ids: &[String],
    ) -> Result<HashMap<String, Vec<ProfileTagDto>>, AppError> {
        if profile_ids.is_empty() {
            return Ok(HashMap::new());
        }

        let placeholders = profile_ids
            .iter()
            .map(|_| "?")
            .collect::<Vec<_>>()
            .join(", ");
        let sql = format!(
            "SELECT pt.profile_id, t.id, t.name, t.color
             FROM profile_tags pt
             JOIN tags t ON t.id = pt.tag_id
             WHERE pt.profile_id IN ({placeholders})
             ORDER BY t.name ASC"
        );

        let mut query = sqlx::query_as::<_, ProfileTagWithProfileRow>(&sql);
        for profile_id in profile_ids {
            query = query.bind(profile_id);
        }

        let rows = query.fetch_all(&self.pool).await?;
        let mut grouped: HashMap<String, Vec<ProfileTagDto>> = HashMap::new();
        for row in rows {
            grouped
                .entry(row.profile_id)
                .or_default()
                .push(ProfileTagDto {
                    id: row.id,
                    name: row.name,
                    color: row.color,
                });
        }
        Ok(grouped)
    }
}

#[derive(sqlx::FromRow)]
struct TagRow {
    id: String,
    name: String,
    color: String,
    created_at: String,
}

impl TagRow {
    fn into_tag(self) -> Tag {
        Tag {
            id: self.id,
            name: self.name,
            color: self.color,
            created_at: DateTime::parse_from_rfc3339(&self.created_at)
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or_else(|_| Utc::now()),
        }
    }
}

#[derive(sqlx::FromRow)]
struct ProfileTagRow {
    id: String,
    name: String,
    color: String,
}

impl ProfileTagRow {
    fn into_dto(self) -> ProfileTagDto {
        ProfileTagDto {
            id: self.id,
            name: self.name,
            color: self.color,
        }
    }
}

#[derive(sqlx::FromRow)]
struct ProfileTagWithProfileRow {
    profile_id: String,
    id: String,
    name: String,
    color: String,
}
