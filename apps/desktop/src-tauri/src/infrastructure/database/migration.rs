use sqlx::SqlitePool;

use crate::error::AppError;

const MIGRATION_001: &str = include_str!("migrations/001_app_metadata.sql");

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
