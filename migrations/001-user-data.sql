CREATE TABLE honey_holes (
 id TEXT PRIMARY KEY,
 owner_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
 name TEXT NOT NULL,
 latitude REAL NOT NULL CHECK(latitude BETWEEN -90 AND 90),
 longitude REAL NOT NULL CHECK(longitude BETWEEN -180 AND 180),
 notes TEXT NOT NULL DEFAULT '',
 privacy TEXT NOT NULL DEFAULT 'PRIVATE' CHECK(privacy = 'PRIVATE'),
 sharing_eligible INTEGER NOT NULL DEFAULT 0 CHECK(sharing_eligible IN (0,1)),
 source_id TEXT,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 UNIQUE(owner_id, source_id), UNIQUE(owner_id, latitude, longitude)
);
CREATE INDEX honey_holes_owner ON honey_holes(owner_id);
CREATE TABLE user_preferences (
 owner_id TEXT PRIMARY KEY REFERENCES user(id) ON DELETE CASCADE,
 value TEXT NOT NULL,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
