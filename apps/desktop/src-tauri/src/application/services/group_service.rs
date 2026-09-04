use chrono::Utc;
use uuid::Uuid;

use crate::domain::group::{CreateGroupInput, ProfileGroup, ProfileGroupDto, UpdateGroupInput};
use crate::error::AppError;
use crate::infrastructure::database::{
    SqliteProfileGroupRepository, SqliteProfileRepository,
};
use crate::state::AppState;

pub struct GroupService;

impl GroupService {
    pub async fn list(state: &AppState) -> Result<Vec<ProfileGroupDto>, AppError> {
        let repo = SqliteProfileGroupRepository::new(state.db.pool().clone());
        let profile_repo = SqliteProfileRepository::new(state.db.pool().clone());
        let mut groups = Vec::new();
        for group in repo.list_all().await? {
            let profile_count = profile_repo
                .list(false, None)
                .await?
                .into_iter()
                .filter(|profile| profile.group_id.as_deref() == Some(group.id.as_str()))
                .count();
            groups.push(ProfileGroupDto {
                id: group.id,
                name: group.name,
                sort_order: group.sort_order,
                profile_count,
                created_at: group.created_at.to_rfc3339(),
                updated_at: group.updated_at.to_rfc3339(),
            });
        }
        Ok(groups)
    }

    pub async fn create(
        state: &AppState,
        input: CreateGroupInput,
    ) -> Result<ProfileGroupDto, AppError> {
        let name = input.name.trim();
        if name.is_empty() || name.len() > 100 {
            return Err(AppError::InvalidConfiguration(
                "group name must be between 1 and 100 characters".into(),
            ));
        }

        let now = Utc::now();
        let group = ProfileGroup {
            id: Uuid::new_v4().to_string(),
            name: name.to_string(),
            sort_order: 0,
            created_at: now,
            updated_at: now,
        };

        let repo = SqliteProfileGroupRepository::new(state.db.pool().clone());
        repo.create(&group).await?;

        Ok(ProfileGroupDto {
            id: group.id,
            name: group.name,
            sort_order: group.sort_order,
            profile_count: 0,
            created_at: group.created_at.to_rfc3339(),
            updated_at: group.updated_at.to_rfc3339(),
        })
    }

    pub async fn update(
        state: &AppState,
        id: &str,
        input: UpdateGroupInput,
    ) -> Result<ProfileGroupDto, AppError> {
        let repo = SqliteProfileGroupRepository::new(state.db.pool().clone());
        let mut group = repo
            .find_by_id(id)
            .await?
            .ok_or(AppError::InvalidConfiguration("group not found".into()))?;

        if let Some(name) = input.name {
            let trimmed = name.trim();
            if trimmed.is_empty() || trimmed.len() > 100 {
                return Err(AppError::InvalidConfiguration(
                    "group name must be between 1 and 100 characters".into(),
                ));
            }
            group.name = trimmed.to_string();
        }

        if let Some(sort_order) = input.sort_order {
            group.sort_order = sort_order;
        }

        group.updated_at = Utc::now();
        repo.update(&group).await?;

        let profile_count = repo.count_profiles(&group.id).await? as usize;
        Ok(ProfileGroupDto {
            id: group.id,
            name: group.name,
            sort_order: group.sort_order,
            profile_count,
            created_at: group.created_at.to_rfc3339(),
            updated_at: group.updated_at.to_rfc3339(),
        })
    }

    pub async fn delete(state: &AppState, id: &str) -> Result<(), AppError> {
        let repo = SqliteProfileGroupRepository::new(state.db.pool().clone());
        if repo.find_by_id(id).await?.is_none() {
            return Err(AppError::InvalidConfiguration("group not found".into()));
        }
        repo.delete(id).await
    }
}
