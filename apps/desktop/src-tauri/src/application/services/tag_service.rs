use chrono::Utc;
use uuid::Uuid;

use crate::domain::tag::{CreateTagInput, Tag, TagDto};
use crate::error::AppError;
use crate::infrastructure::database::SqliteTagRepository;
use crate::state::AppState;

pub struct TagService;

impl TagService {
    pub async fn list(state: &AppState) -> Result<Vec<TagDto>, AppError> {
        let repo = SqliteTagRepository::new(state.db.pool().clone());
        let mut tags = Vec::new();
        for tag in repo.list_all().await? {
            let profile_count = repo.count_profiles(&tag.id).await? as usize;
            tags.push(TagDto {
                id: tag.id,
                name: tag.name,
                profile_count,
                created_at: tag.created_at.to_rfc3339(),
            });
        }
        Ok(tags)
    }

    pub async fn create(state: &AppState, input: CreateTagInput) -> Result<TagDto, AppError> {
        let name = input.name.trim();
        if name.is_empty() || name.len() > 50 {
            return Err(AppError::InvalidConfiguration(
                "tag name must be between 1 and 50 characters".into(),
            ));
        }

        let repo = SqliteTagRepository::new(state.db.pool().clone());
        if let Some(existing) = repo.find_by_name(name).await? {
            let existing_id = existing.id.clone();
            return Ok(TagDto {
                id: existing.id,
                name: existing.name,
                profile_count: repo.count_profiles(&existing_id).await? as usize,
                created_at: existing.created_at.to_rfc3339(),
            });
        }

        let tag = Tag {
            id: Uuid::new_v4().to_string(),
            name: name.to_string(),
            created_at: Utc::now(),
        };
        repo.create(&tag).await?;

        Ok(TagDto {
            id: tag.id,
            name: tag.name,
            profile_count: 0,
            created_at: tag.created_at.to_rfc3339(),
        })
    }

    pub async fn delete(state: &AppState, id: &str) -> Result<(), AppError> {
        let repo = SqliteTagRepository::new(state.db.pool().clone());
        if repo.find_by_id(id).await?.is_none() {
            return Err(AppError::InvalidConfiguration("tag not found".into()));
        }
        repo.delete(id).await
    }

    pub async fn ensure_tag_ids(
        state: &AppState,
        names: &[String],
    ) -> Result<Vec<String>, AppError> {
        let mut ids = Vec::new();
        for name in names {
            let trimmed = name.trim();
            if trimmed.is_empty() {
                continue;
            }
            let tag = Self::create(
                state,
                CreateTagInput {
                    name: trimmed.to_string(),
                },
            )
            .await?;
            ids.push(tag.id);
        }
        Ok(ids)
    }
}
