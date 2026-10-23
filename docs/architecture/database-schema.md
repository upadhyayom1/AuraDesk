# SQLite Database Schema Specification

> **Database File**: `app.getPath('userData')/auradesk.db`  
> **Driver**: `better-sqlite3` (Synchronous, low-overhead native SQLite for Node/Electron)

---

## 1. Engine Configuration & Pragmas

Whenever `auradesk.db` is opened in the main process, the following PRAGMAs must be executed immediately:

```sql
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
```

### Transaction Guidelines
All multi-row operations **must** be wrapped in a `db.transaction()` block:
- **Collection Reordering**: Updating item `position` indices.
- **Collection Deletion**: Cascading `collection_items` deletion.
- **History Record & Tick**: Writing to `rotation_history` and updating `rotation_config.last_run_at`.

---

## 2. Table Schemas (11 Tables)

### 2.1 `settings`
Key-value application configuration store.
```sql
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL -- JSON encoded string
);
```

### 2.2 `wallpapers`
Metadata cache of online wallpapers and local user-imported images.
```sql
CREATE TABLE IF NOT EXISTS wallpapers (
  id TEXT PRIMARY KEY,               -- 'unsplash:<id>' | 'pexels:<id>' | 'local:<uuid>'
  source TEXT NOT NULL,              -- 'unsplash' | 'pexels' | 'local'
  title TEXT,
  description TEXT,
  image_url TEXT NOT NULL,
  thumb_url TEXT NOT NULL,
  photographer TEXT NOT NULL,
  credit_url TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  local_path TEXT NULL,              -- Path on disk for locally imported files
  cached_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 2.3 `collections`
User-created wallpaper vaults (Sanctum of Memories).
```sql
CREATE TABLE IF NOT EXISTS collections (
  id TEXT PRIMARY KEY,               -- UUID v4
  name TEXT UNIQUE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 2.4 `collection_items`
Ordered join table linking collections and wallpapers.
```sql
CREATE TABLE IF NOT EXISTS collection_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  collection_id TEXT NOT NULL,
  wallpaper_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
  FOREIGN KEY (wallpaper_id) REFERENCES wallpapers(id) ON DELETE CASCADE,
  UNIQUE(collection_id, wallpaper_id)
);

CREATE INDEX IF NOT EXISTS idx_collection_items_pos 
ON collection_items(collection_id, position);
```

### 2.5 `rotation_config`
Single-row rotation schedule settings.
```sql
CREATE TABLE IF NOT EXISTS rotation_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  enabled INTEGER NOT NULL DEFAULT 1,         -- 0 or 1
  interval_minutes INTEGER NOT NULL DEFAULT 30, -- Interval >= 1
  shuffle INTEGER NOT NULL DEFAULT 0,         -- 0 or 1
  collection_ids TEXT NOT NULL,               -- JSON array of collection UUIDs
  last_run_at DATETIME NULL
);
```

### 2.6 `rotation_history`
Log of applied wallpapers with trigger context and no-repeat auditing.
```sql
CREATE TABLE IF NOT EXISTS rotation_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wallpaper_id TEXT NOT NULL,
  applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  trigger TEXT NOT NULL,                      -- 'MANUAL' | 'ROTATION' | 'RULE' | 'CALENDAR'
  collection_id TEXT NULL,                    -- Optional source collection UUID
  rule_id TEXT NULL,                          -- Optional personalization rule ID
  FOREIGN KEY (wallpaper_id) REFERENCES wallpapers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_rotation_history_applied 
ON rotation_history(applied_at DESC);
```

### 2.7 `personalization_rules`
Context-aware personalization rules (Eye of Agamotto).
```sql
CREATE TABLE IF NOT EXISTS personalization_rules (
  id TEXT PRIMARY KEY,                        -- UUID v4
  name TEXT NOT NULL,
  condition_type TEXT NOT NULL,               -- 'TIME_RANGE' | 'WEATHER' | 'DAY_PART'
  condition_value TEXT NOT NULL,              -- JSON payload (see semantics below)
  collection_id TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 1,
  enabled INTEGER NOT NULL DEFAULT 1,         -- 0 or 1
  FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_personalization_rules_priority 
ON personalization_rules(priority ASC);
```

### 2.8 `calendar_bindings`
Links Google Calendar events to target wallpaper collections.
```sql
CREATE TABLE IF NOT EXISTS calendar_bindings (
  id TEXT PRIMARY KEY,                        -- UUID v4
  match_type TEXT NOT NULL,                   -- 'KEYWORD' | 'EVENT_ID'
  match_value TEXT NOT NULL,                  -- E.g. "exam", "meeting", "design"
  collection_id TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
);
```

### 2.9 `calendar_events_cache`
Normalized cache of upcoming Google Calendar events (synced every 5 min).
```sql
CREATE TABLE IF NOT EXISTS calendar_events_cache (
  id TEXT PRIMARY KEY,                        -- Google Event ID
  title TEXT NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 2.10 `context_cache`
Snapshot cache for environmental services (e.g. weather).
```sql
CREATE TABLE IF NOT EXISTS context_cache (
  key TEXT PRIMARY KEY,                       -- E.g. 'weather'
  payload TEXT NOT NULL,                      -- JSON snapshot of current weather
  fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 2.11 `overrides`
Single-row state preserving manual user wallpaper overrides across app restarts.
```sql
CREATE TABLE IF NOT EXISTS overrides (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  wallpaper_id TEXT NOT NULL,
  set_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NULL                    -- Nullable expiration timestamp
);
```

---

## 3. `condition_value` JSON Specification

The `personalization_rules.condition_value` field stores structured JSON depending on `condition_type`:

| Condition Type | JSON Structure | Example | Semantics |
| :--- | :--- | :--- | :--- |
| `TIME_RANGE` | `{"from": "HH:MM", "to": "HH:MM"}` | `{"from": "18:00", "to": "23:59"}` | Matches local 24-hour time. Code must properly handle ranges that cross midnight (e.g. `22:00` to `04:00`). |
| `WEATHER` | `{"condition": "String"}` | `{"condition": "Rain"}` | Matches OpenWeatherMap's `weather[0].main` value (Clear, Clouds, Rain, Snow, Thunderstorm, Mist). |
| `DAY_PART` | `{"part": "String"}` | `{"part": "night"}` | Derived using local sunrise & sunset times: `dawn`, `day`, `dusk`, `night`. |
