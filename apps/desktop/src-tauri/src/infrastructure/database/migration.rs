use sqlx::SqlitePool;

use crate::error::AppError;

const MIGRATION_001: &str = include_str!("migrations/001_app_metadata.sql");
const MIGRATION_002: &str = include_str!("migrations/002_profiles.sql");

const MIGRATION_003: &str = include_str!("migrations/003_proxies.sql");

const MIGRATION_004: &str = include_str!("migrations/004_phase3_cloak_config.sql");

const MIGRATION_005: &str = include_str!("migrations/005_phase4_cloak_runtime.sql");

const MIGRATION_006: &str = include_str!("migrations/006_phase5_profile_workspace.sql");

pub async fn run_migrations(pool: &SqlitePool) -> Result<(), AppError> {
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS schema_migrations (
            version INTEGER PRIMARY KEY,
            applied_at TEXT NOT NULL
        )",
    )
    .execute(pool)
    .await?;

    apply_if_needed(pool, 1, MIGRATION_001).await?;
    apply_if_needed(pool, 2, MIGRATION_002).await?;
    apply_if_needed(pool, 3, MIGRATION_003).await?;
    apply_if_needed(pool, 4, MIGRATION_004).await?;
    apply_if_needed(pool, 5, MIGRATION_005).await?;
    apply_if_needed(pool, 6, MIGRATION_006).await?;

    crate::infrastructure::database::repositories::sqlite_profile_repository::SqliteProfileRepository::new(
        pool.clone(),
    )
    .backfill_display_ids()
    .await?;

    Ok(())
}

async fn apply_if_needed(pool: &SqlitePool, version: i64, sql: &str) -> Result<(), AppError> {
    let applied: Option<i64> =
        sqlx::query_scalar("SELECT version FROM schema_migrations WHERE version = ?")
            .bind(version)
            .fetch_optional(pool)
            .await?;

    if applied.is_some() {
        return Ok(());
    }

    let mut tx = pool.begin().await?;
    for statement in sql.split(';').map(str::trim).filter(|s| !s.is_empty()) {
        sqlx::query(statement).execute(&mut *tx).await?;
    }

    let now = chrono::Utc::now().to_rfc3339();
    sqlx::query("INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)")
        .bind(version)
        .bind(now)
        .execute(&mut *tx)
        .await?;

    tx.commit().await?;
    Ok(())
}
