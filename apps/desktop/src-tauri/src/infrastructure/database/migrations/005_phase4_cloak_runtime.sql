CREATE TABLE cloak_runtimes (
    id TEXT PRIMARY KEY,
    version TEXT NOT NULL,
    platform TEXT NOT NULL,
    arch TEXT NOT NULL,
    root_dir TEXT NOT NULL,
    executable_path TEXT NOT NULL,
    sha256 TEXT,
    source TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 0,
    installed_at TEXT NOT NULL,
    validated_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX idx_cloak_runtime_version
ON cloak_runtimes(version, platform, arch);
