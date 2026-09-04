CREATE TABLE profiles_new (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    is_archived INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

INSERT INTO profiles_new (id, name, description, is_archived, created_at, updated_at)
SELECT id, name, description, is_archived, created_at, updated_at
FROM profiles;

DROP TABLE profiles;

ALTER TABLE profiles_new RENAME TO profiles;

CREATE INDEX IF NOT EXISTS idx_profiles_archived ON profiles(is_archived);

CREATE TABLE profile_browser_settings (
    profile_id TEXT PRIMARY KEY,
    startup_urls_json TEXT NOT NULL DEFAULT '[]',
    download_mode TEXT NOT NULL DEFAULT 'profile',
    custom_download_dir TEXT,
    window_mode TEXT NOT NULL DEFAULT 'normal',
    restore_session INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);

INSERT INTO profile_browser_settings (
    profile_id,
    startup_urls_json,
    download_mode,
    custom_download_dir,
    window_mode,
    restore_session,
    created_at,
    updated_at
)
SELECT
    profile_id,
    COALESCE(startup_urls_json, '[]'),
    'profile',
    NULL,
    'normal',
    1,
    created_at,
    updated_at
FROM profile_settings;

DROP TABLE profile_settings;

ALTER TABLE browser_instances ADD COLUMN config_snapshot_json TEXT;
