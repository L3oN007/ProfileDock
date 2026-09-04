CREATE TABLE profile_groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE tags (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE,
    created_at TEXT NOT NULL
);

CREATE TABLE profile_tags (
    profile_id TEXT NOT NULL,
    tag_id TEXT NOT NULL,
    PRIMARY KEY (profile_id, tag_id),
    FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE INDEX idx_profile_tags_tag ON profile_tags(tag_id);

CREATE TABLE profile_sequence (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    next_value INTEGER NOT NULL DEFAULT 1
);

INSERT INTO profile_sequence (id, next_value) VALUES (1, 1);

ALTER TABLE profiles ADD COLUMN group_id TEXT REFERENCES profile_groups(id);
ALTER TABLE profiles ADD COLUMN remark TEXT;
ALTER TABLE profiles ADD COLUMN notes TEXT;
ALTER TABLE profiles ADD COLUMN platform_label TEXT;
ALTER TABLE profiles ADD COLUMN display_id TEXT;

CREATE UNIQUE INDEX idx_profiles_display_id ON profiles(display_id);
