use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

use chrono::Utc;
use tauri::{AppHandle, Emitter};
use tokio::sync::Mutex;
use uuid::Uuid;

use crate::domain::cloak::{
    CloakInstallPhase, CloakInstallProgress, CloakRuntime, CloakRuntimeDto, CloakRuntimeSource,
    CloakRuntimeStatusDto, CloakRuntimeUpdateInfo,
};
use crate::error::AppError;
use crate::infrastructure::cloak::{
    checksum::verify_sha256,
    discovery::{executable_path_for_root, validate_installation_root},
    downloader::CloakRuntimeDownloader,
    extractor::extract_archive,
    license::resolve_license_key,
    release_manifest,
};
use crate::infrastructure::database::{
    MetadataRepository, SqliteBrowserInstanceRepository, SqliteCloakRuntimeRepository,
};
use crate::infrastructure::filesystem::{AppPaths, ConfigStore};
use crate::state::AppState;

#[derive(Clone)]
pub struct CloakRuntimeManager {
    progress: Arc<Mutex<CloakInstallProgress>>,
    cancel_flag: Arc<AtomicBool>,
    installing: Arc<AtomicBool>,
    app_handle: Arc<Mutex<Option<AppHandle>>>,
}

impl CloakRuntimeManager {
    pub fn new() -> Self {
        Self {
            progress: Arc::new(Mutex::new(CloakInstallProgress {
                phase: CloakInstallPhase::Completed,
                version: None,
                downloaded_bytes: 0,
                total_bytes: None,
                percent: None,
                message: None,
            })),
            cancel_flag: Arc::new(AtomicBool::new(false)),
            installing: Arc::new(AtomicBool::new(false)),
            app_handle: Arc::new(Mutex::new(None)),
        }
    }

    pub async fn cleanup_incomplete_installs(paths: &AppPaths) -> Result<(), AppError> {
        if !paths.runtimes.exists() {
            return Ok(());
        }

        for entry in std::fs::read_dir(&paths.runtimes)? {
            let entry = entry?;
            let file_name = entry.file_name();
            let Some(name) = file_name.to_str() else {
                continue;
            };
            if name.starts_with(".installing-") {
                std::fs::remove_dir_all(entry.path())?;
            }
        }

        if paths.runtime_downloads.exists() {
            for entry in std::fs::read_dir(&paths.runtime_downloads)? {
                let entry = entry?;
                if entry
                    .path()
                    .extension()
                    .and_then(|ext| ext.to_str())
                    .is_some_and(|ext| ext == "part")
                {
                    let _ = std::fs::remove_file(entry.path());
                }
            }
        }

        Ok(())
    }

    pub async fn status(state: &AppState) -> Result<CloakRuntimeStatusDto, AppError> {
        let repo = SqliteCloakRuntimeRepository::new(state.db.pool().clone());
        let runtimes = repo.list_all().await?;
        let active = repo.find_active().await?;
        Ok(CloakRuntimeStatusDto {
            installed: !runtimes.is_empty(),
            active_runtime: active.as_ref().map(|runtime| runtime.to_dto()),
            managed_count: runtimes.len(),
        })
    }

    pub async fn list(state: &AppState) -> Result<Vec<CloakRuntimeDto>, AppError> {
        let repo = SqliteCloakRuntimeRepository::new(state.db.pool().clone());
        Ok(repo
            .list_all()
            .await?
            .into_iter()
            .map(|runtime| runtime.to_dto())
            .collect())
    }

    pub async fn install(
        &self,
        state: &AppState,
        version: Option<String>,
        app: Option<AppHandle>,
    ) -> Result<CloakRuntimeDto, AppError> {
        if self
            .installing
            .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
            .is_err()
        {
            return Err(AppError::CloakDownloadFailed(
                "installation already in progress".into(),
            ));
        }

        *self.app_handle.lock().await = app;
        self.cancel_flag.store(false, Ordering::SeqCst);
        let result = self.install_inner(state, version).await;
        *self.app_handle.lock().await = None;
        self.installing.store(false, Ordering::SeqCst);
        result
    }

    pub fn cancel_install(&self) {
        self.cancel_flag.store(true, Ordering::SeqCst);
    }

    pub async fn get_install_progress(&self) -> CloakInstallProgress {
        self.progress.lock().await.clone()
    }

    pub async fn activate(
        &self,
        state: &AppState,
        runtime_id: &str,
    ) -> Result<CloakRuntimeDto, AppError> {
        Self::ensure_no_running_browsers(state).await?;

        let repo = SqliteCloakRuntimeRepository::new(state.db.pool().clone());
        let runtime = repo
            .find_by_id(runtime_id)
            .await?
            .ok_or(AppError::CloakRuntimeNotFound)?;

        validate_installation_root(&runtime.root_dir)?;
        repo.set_active(runtime_id).await?;
        Self::sync_active_runtime(state, &runtime).await?;
        Ok(runtime.to_dto())
    }

    pub async fn remove(&self, state: &AppState, runtime_id: &str) -> Result<(), AppError> {
        Self::ensure_no_running_browsers(state).await?;

        let repo = SqliteCloakRuntimeRepository::new(state.db.pool().clone());
        let runtime = repo
            .find_by_id(runtime_id)
            .await?
            .ok_or(AppError::CloakRuntimeNotFound)?;

        if runtime.active {
            return Err(AppError::CloakRuntimeInUse);
        }

        if runtime.root_dir.exists() {
            std::fs::remove_dir_all(&runtime.root_dir)?;
        }
        repo.delete(runtime_id).await?;
        Ok(())
    }

    pub async fn validate_runtime(
        state: &AppState,
        runtime_id: &str,
    ) -> Result<CloakRuntimeDto, AppError> {
        let repo = SqliteCloakRuntimeRepository::new(state.db.pool().clone());
        let runtime = repo
            .find_by_id(runtime_id)
            .await?
            .ok_or(AppError::CloakRuntimeNotFound)?;
        validate_installation_root(&runtime.root_dir)?;
        Ok(runtime.to_dto())
    }

    pub async fn check_update(state: &AppState) -> Result<CloakRuntimeUpdateInfo, AppError> {
        let repo = SqliteCloakRuntimeRepository::new(state.db.pool().clone());
        let active = repo.find_active().await?;
        let latest = release_manifest::latest_supported_version();
        let current_version = active.as_ref().map(|runtime| runtime.version.clone());
        let update_available = current_version
            .as_deref()
            .is_none_or(|version| version != latest);

        Ok(CloakRuntimeUpdateInfo {
            current_version,
            available_version: Some(latest.to_string()),
            update_available,
        })
    }

    pub async fn active_runtime(state: &AppState) -> Result<Option<CloakRuntime>, AppError> {
        let repo = SqliteCloakRuntimeRepository::new(state.db.pool().clone());
        let active = repo.find_active().await?;
        if let Some(runtime) = active {
            if validate_installation_root(&runtime.root_dir).is_ok() {
                return Ok(Some(runtime));
            }
        }
        Ok(None)
    }

    async fn install_inner(
        &self,
        state: &AppState,
        version: Option<String>,
    ) -> Result<CloakRuntimeDto, AppError> {
        let release = if let Some(version) = version {
            release_manifest::resolve_release(&version)?
        } else {
            release_manifest::pinned_release()?
        };

        let repo = SqliteCloakRuntimeRepository::new(state.db.pool().clone());
        if let Some(existing) = repo
            .find_by_version(&release.version, &release.platform, &release.arch)
            .await?
        {
            repo.set_active(&existing.id).await?;
            Self::sync_active_runtime(state, &existing).await?;
            self.set_progress(CloakInstallPhase::Completed, Some(release.version), None)
                .await;
            return Ok(existing.to_dto());
        }

        self.set_progress(
            CloakInstallPhase::Resolving,
            Some(release.version.clone()),
            Some("Resolving CloakBrowser release".into()),
        )
        .await;

        let checksums = release_manifest::fetch_checksums(&release.version, release.requires_license)
            .await
            .ok();
        let expected_sha256 = checksums
            .as_ref()
            .and_then(|map| map.get(&release.archive_name).cloned())
            .filter(|value| !value.is_empty())
            .unwrap_or_else(|| release.sha256.clone());
        let license_key = if release.requires_license {
            resolve_license_key()
        } else {
            None
        };
        if release.requires_license && license_key.is_none() {
            return Err(AppError::CloakDownloadFailed(
                "CloakBrowser license key is required for this runtime version".into(),
            ));
        }

        let archive_path = state
            .paths
            .runtime_downloads
            .join(format!("{}.part", release.archive_name));
        let installing_token = Uuid::new_v4().to_string();
        let installing_dir = state.paths.cloak_installing_dir(&installing_token);
        let final_dir = state.paths.cloak_runtime_dir(&release.version);

        self.set_progress(
            CloakInstallPhase::Downloading,
            Some(release.version.clone()),
            Some("Downloading CloakBrowser".into()),
        )
        .await;

        let downloader = CloakRuntimeDownloader::new();
        if let Err(error) = downloader
            .download(
                &release.asset_url,
                &archive_path,
                self.progress.clone(),
                self.cancel_flag.clone(),
                license_key.as_deref(),
            )
            .await
        {
            self.set_progress(
                CloakInstallPhase::Failed,
                Some(release.version.clone()),
                Some(error.to_string()),
            )
            .await;
            let _ = tokio::fs::remove_file(&archive_path).await;
            return Err(error);
        }

        self.set_progress(
            CloakInstallPhase::Verifying,
            Some(release.version.clone()),
            Some("Verifying SHA-256 checksum".into()),
        )
        .await;

        if expected_sha256.is_empty() {
            return Err(AppError::CloakDownloadFailed(
                "unable to resolve SHA-256 checksum for CloakBrowser archive".into(),
            ));
        }

        if let Err(error) = verify_sha256(&archive_path, &expected_sha256) {
            let _ = tokio::fs::remove_file(&archive_path).await;
            self.set_progress(
                CloakInstallPhase::Failed,
                Some(release.version.clone()),
                Some("Checksum verification failed".into()),
            )
            .await;
            return Err(error);
        }

        self.set_progress(
            CloakInstallPhase::Extracting,
            Some(release.version.clone()),
            Some("Extracting CloakBrowser".into()),
        )
        .await;

        let archive_path_clone = archive_path.clone();
        let installing_dir_clone = installing_dir.clone();
        if let Err(error) = tokio::task::spawn_blocking(move || {
            extract_archive(&archive_path_clone, &installing_dir_clone)
        })
        .await
        .map_err(|error| AppError::CloakExtractionFailed(error.to_string()))?
        {
            let _ = tokio::fs::remove_dir_all(&installing_dir).await;
            let _ = tokio::fs::remove_file(&archive_path).await;
            self.set_progress(
                CloakInstallPhase::Failed,
                Some(release.version.clone()),
                Some(error.to_string()),
            )
            .await;
            return Err(error);
        }

        self.set_progress(
            CloakInstallPhase::Validating,
            Some(release.version.clone()),
            Some("Validating installation".into()),
        )
        .await;

        if let Err(error) = validate_installation_root(&installing_dir) {
            let _ = tokio::fs::remove_dir_all(&installing_dir).await;
            let _ = tokio::fs::remove_file(&archive_path).await;
            self.set_progress(
                CloakInstallPhase::Failed,
                Some(release.version.clone()),
                Some(error.to_string()),
            )
            .await;
            return Err(error);
        }

        if final_dir.exists() {
            std::fs::remove_dir_all(&final_dir)?;
        }
        std::fs::rename(&installing_dir, &final_dir)?;

        let executable = executable_path_for_root(&final_dir);
        let now = Utc::now();
        let runtime = CloakRuntime {
            id: Uuid::new_v4().to_string(),
            version: release.version.clone(),
            platform: release.platform,
            arch: release.arch,
            root_dir: final_dir,
            executable,
            sha256: Some(expected_sha256),
            source: CloakRuntimeSource::ProfileDockManaged,
            active: true,
            installed_at: now,
            validated_at: Some(now),
            created_at: now,
            updated_at: now,
        };

        repo.insert(&runtime).await?;
        repo.set_active(&runtime.id).await?;
        Self::sync_active_runtime(state, &runtime).await?;

        let _ = tokio::fs::remove_file(&archive_path).await;
        self.set_progress(
            CloakInstallPhase::Completed,
            Some(release.version),
            Some("CloakBrowser installed".into()),
        )
        .await;

        Ok(runtime.to_dto())
    }

    async fn sync_active_runtime(state: &AppState, runtime: &CloakRuntime) -> Result<(), AppError> {
        let metadata = MetadataRepository::new(state.db.pool().clone());
        let executable = runtime.executable.to_string_lossy().into_owned();
        metadata.set("browser_executable", &executable).await?;
        metadata
            .set(
                "cloak_installation_root",
                &runtime.root_dir.to_string_lossy(),
            )
            .await?;
        metadata
            .set("cloak_installation_source", "profiledock_managed")
            .await?;
        metadata.set("cloak_active_runtime_id", &runtime.id).await?;

        let mut config = ConfigStore::load(&state.paths.config, &metadata).await?;
        config.browser_executable = Some(executable);
        ConfigStore::save(&state.paths.config, &config)?;
        Ok(())
    }

    async fn ensure_no_running_browsers(state: &AppState) -> Result<(), AppError> {
        let repo = SqliteBrowserInstanceRepository::new(state.db.pool().clone());
        let instances = repo.list_running_states().await?;
        if instances.is_empty() {
            Ok(())
        } else {
            Err(AppError::CloakRuntimeInUse)
        }
    }

    async fn set_progress(
        &self,
        phase: CloakInstallPhase,
        version: Option<String>,
        message: Option<String>,
    ) {
        let mut progress = self.progress.lock().await;
        progress.phase = phase;
        progress.version = version;
        progress.message = message;
        if !matches!(progress.phase, CloakInstallPhase::Downloading) {
            progress.downloaded_bytes = 0;
            progress.total_bytes = None;
            progress.percent = None;
        }

        let snapshot = progress.clone();
        drop(progress);

        if let Some(handle) = self.app_handle.lock().await.clone() {
            let _ = handle.emit("cloak://install-progress", &snapshot);
        }
    }
}

impl Default for CloakRuntimeManager {
    fn default() -> Self {
        Self::new()
    }
}
