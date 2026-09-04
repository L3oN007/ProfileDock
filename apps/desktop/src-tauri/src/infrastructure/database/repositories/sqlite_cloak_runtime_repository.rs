use chrono::{DateTime, Utc};
use sqlx::SqlitePool;

use crate::domain::cloak::{CloakRuntime, CloakRuntimeSource};
use crate::error::AppError;

#[derive(Clone)]
pub struct SqliteCloakRuntimeRepository {
    pool: SqlitePool,
}

impl SqliteCloakRuntimeRepository {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn insert(&self, runtime: &CloakRuntime) -> Result<(), AppError> {
        sqlx::query(
            "INSERT INTO cloak_runtimes
             (id, version, platform, arch, root_dir, executable_path, sha256, source, is_active,
              installed_at, validated_at, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(&runtime.id)
        .bind(&runtime.version)
        .bind(&runtime.platform)
        .bind(&runtime.arch)
        .bind(runtime.root_dir.to_string_lossy().as_ref())
        .bind(runtime.executable.to_string_lossy().as_ref())
        .bind(&runtime.sha256)
        .bind(runtime.source.as_str())
        .bind(runtime.active as i64)
        .bind(runtime.installed_at.to_rfc3339())
        .bind(runtime.validated_at.map(|dt| dt.to_rfc3339()))
        .bind(runtime.created_at.to_rfc3339())
        .bind(runtime.updated_at.to_rfc3339())
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn list_all(&self) -> Result<Vec<CloakRuntime>, AppError> {
        let rows = sqlx::query_as::<_, RuntimeRow>(
            "SELECT id, version, platform, arch, root_dir, executable_path, sha256, source,
                    is_active, installed_at, validated_at, created_at, updated_at
             FROM cloak_runtimes
             ORDER BY installed_at DESC",
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(rows.into_iter().map(RuntimeRow::into_runtime).collect())
    }

    pub async fn find_by_id(&self, id: &str) -> Result<Option<CloakRuntime>, AppError> {
        let row = sqlx::query_as::<_, RuntimeRow>(
            "SELECT id, version, platform, arch, root_dir, executable_path, sha256, source,
                    is_active, installed_at, validated_at, created_at, updated_at
             FROM cloak_runtimes WHERE id = ?",
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.map(RuntimeRow::into_runtime))
    }

    pub async fn find_active(&self) -> Result<Option<CloakRuntime>, AppError> {
        let row = sqlx::query_as::<_, RuntimeRow>(
            "SELECT id, version, platform, arch, root_dir, executable_path, sha256, source,
                    is_active, installed_at, validated_at, created_at, updated_at
             FROM cloak_runtimes WHERE is_active = 1 LIMIT 1",
        )
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.map(RuntimeRow::into_runtime))
    }

    pub async fn find_by_version(
        &self,
        version: &str,
        platform: &str,
        arch: &str,
    ) -> Result<Option<CloakRuntime>, AppError> {
        let row = sqlx::query_as::<_, RuntimeRow>(
            "SELECT id, version, platform, arch, root_dir, executable_path, sha256, source,
                    is_active, installed_at, validated_at, created_at, updated_at
             FROM cloak_runtimes
             WHERE version = ? AND platform = ? AND arch = ?",
        )
        .bind(version)
        .bind(platform)
        .bind(arch)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.map(RuntimeRow::into_runtime))
    }

    pub async fn set_active(&self, id: &str) -> Result<(), AppError> {
        let mut tx = self.pool.begin().await?;
        sqlx::query("UPDATE cloak_runtimes SET is_active = 0, updated_at = ?")
            .bind(Utc::now().to_rfc3339())
            .execute(&mut *tx)
            .await?;
        sqlx::query("UPDATE cloak_runtimes SET is_active = 1, updated_at = ? WHERE id = ?")
            .bind(Utc::now().to_rfc3339())
            .bind(id)
            .execute(&mut *tx)
            .await?;
        tx.commit().await?;
        Ok(())
    }

    pub async fn delete(&self, id: &str) -> Result<(), AppError> {
        sqlx::query("DELETE FROM cloak_runtimes WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }
}

#[derive(sqlx::FromRow)]
struct RuntimeRow {
    id: String,
    version: String,
    platform: String,
    arch: String,
    root_dir: String,
    executable_path: String,
    sha256: Option<String>,
    source: String,
    is_active: i64,
    installed_at: String,
    validated_at: Option<String>,
    created_at: String,
    updated_at: String,
}

impl RuntimeRow {
    fn into_runtime(self) -> CloakRuntime {
        CloakRuntime {
            id: self.id,
            version: self.version,
            platform: self.platform,
            arch: self.arch,
            root_dir: self.root_dir.into(),
            executable: self.executable_path.into(),
            sha256: self.sha256,
            source: CloakRuntimeSource::from_str(&self.source)
                .unwrap_or(CloakRuntimeSource::ProfileDockManaged),
            active: self.is_active != 0,
            installed_at: parse_ts(&self.installed_at),
            validated_at: self.validated_at.as_deref().map(parse_ts),
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
