use std::path::Path;

use crate::domain::profile::{validate_profile_id, ProfileStorageDto};
use crate::error::AppError;
use crate::infrastructure::database::repositories::sqlite_browser_instance_repository::SqliteBrowserInstanceRepository;
use crate::infrastructure::database::repositories::sqlite_profile_event_repository::SqliteProfileEventRepository;
use crate::state::AppState;

pub struct ProfileStorageService;

impl ProfileStorageService {
    pub async fn get_storage(
        state: &AppState,
        profile_id: &str,
    ) -> Result<ProfileStorageDto, AppError> {
        validate_profile_id(profile_id)?;
        let paths = state.paths.profile(profile_id)?;

        let browser_data_bytes = dir_size(&paths.browser_data)?;
        let cache_bytes = dir_size(&paths.cache)?;
        let downloads_bytes = dir_size(&paths.downloads)?;
        let total_bytes = browser_data_bytes + cache_bytes + downloads_bytes;

        Ok(ProfileStorageDto {
            browser_data_bytes,
            cache_bytes,
            downloads_bytes,
            total_bytes,
        })
    }

    pub async fn clear_cache(state: &AppState, profile_id: &str) -> Result<ProfileStorageDto, AppError> {
        validate_profile_id(profile_id)?;
        let instance_repo = SqliteBrowserInstanceRepository::new(state.db.pool().clone());
        if instance_repo.find_active_by_profile(profile_id).await?.is_some() {
            return Err(AppError::ProfileRunning);
        }

        let paths = state.paths.profile(profile_id)?;
        clear_dir_contents(&paths.cache)?;

        SqliteProfileEventRepository::new(state.db.pool().clone())
            .insert(profile_id, "cache_cleared", None)
            .await?;

        Self::get_storage(state, profile_id).await
    }
}

fn dir_size(path: &Path) -> Result<u64, AppError> {
    if !path.exists() {
        return Ok(0);
    }

    let mut total = 0u64;
    if path.is_file() {
        return Ok(path.metadata()?.len());
    }

    for entry in std::fs::read_dir(path)? {
        let entry = entry?;
        total = total.saturating_add(dir_size(&entry.path())?);
    }

    Ok(total)
}

fn clear_dir_contents(path: &Path) -> Result<(), AppError> {
    if !path.exists() {
        return Ok(());
    }

    for entry in std::fs::read_dir(path)? {
        let entry = entry?;
        let entry_path = entry.path();
        if entry_path.is_dir() {
            std::fs::remove_dir_all(entry_path)?;
        } else {
            std::fs::remove_file(entry_path)?;
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn dir_size_counts_nested_files() {
        let dir = tempdir().expect("tempdir");
        let root = dir.path();
        std::fs::write(root.join("a.txt"), "12345").expect("write");
        std::fs::create_dir(root.join("nested")).expect("mkdir");
        std::fs::write(root.join("nested/b.txt"), "12").expect("write");

        let size = dir_size(root).expect("size");
        assert_eq!(size, 7);
    }

    #[test]
    fn clear_dir_contents_removes_files_but_keeps_dir() {
        let dir = tempdir().expect("tempdir");
        let cache = dir.path().join("cache");
        std::fs::create_dir_all(&cache).expect("mkdir");
        std::fs::write(cache.join("tmp.bin"), "abc").expect("write");

        clear_dir_contents(&cache).expect("clear");
        assert!(cache.exists());
        assert_eq!(std::fs::read_dir(&cache).unwrap().count(), 0);
    }
}
