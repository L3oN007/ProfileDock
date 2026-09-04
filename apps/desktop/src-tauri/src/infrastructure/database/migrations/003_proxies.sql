CREATE TABLE IF NOT EXISTS proxies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    protocol TEXT NOT NULL,
    host TEXT NOT NULL,
    port INTEGER NOT NULL,
    username_ref TEXT,
    password_ref TEXT,
    is_enabled INTEGER NOT NULL DEFAULT 1,
    is_archived INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_proxies_archived ON proxies(is_archived);
CREATE INDEX IF NOT EXISTS idx_proxies_enabled ON proxies(is_enabled);

CREATE TABLE IF NOT EXISTS profile_proxy_assignments (
    profile_id TEXT PRIMARY KEY,
    proxy_id TEXT NOT NULL,
    assigned_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
    FOREIGN KEY(proxy_id) REFERENCES proxies(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS proxy_checks (
    id TEXT PRIMARY KEY,
    proxy_id TEXT NOT NULL,
    success INTEGER NOT NULL,
    latency_ms INTEGER,
    observed_ip TEXT,
    error_code TEXT,
    error_message TEXT,
    checked_at TEXT NOT NULL,
    FOREIGN KEY(proxy_id) REFERENCES proxies(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_proxy_checks_proxy_time ON proxy_checks(proxy_id, checked_at DESC);
