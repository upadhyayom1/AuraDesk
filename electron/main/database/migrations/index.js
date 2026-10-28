/**
 * AuraDesk SQLite Database Migrations
 * Creates and updates tables according to docs/architecture/database-schema.md
 */

function runMigrations(db) {
  // Execute migration script in a single transaction
  const migration = db.transaction(() => {
    // 1. Settings Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    // 2. Wallpapers Table (Normalized metadata cache + local records)
    db.exec(`
      CREATE TABLE IF NOT EXISTS wallpapers (
        id TEXT PRIMARY KEY,
        source TEXT NOT NULL,
        title TEXT,
        description TEXT,
        image_url TEXT NOT NULL,
        thumb_url TEXT NOT NULL,
        photographer TEXT NOT NULL,
        credit_url TEXT NOT NULL,
        width INTEGER NOT NULL,
        height INTEGER NOT NULL,
        local_path TEXT NULL,
        cached_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Collections Table (Wallpaper Collections)
    db.exec(`
      CREATE TABLE IF NOT EXISTS collections (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Collection Items Table (Join table with ordered positions)
    db.exec(`
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
    `);

    // 5. Rotation Config Table (Singleton config row)
    db.exec(`
      CREATE TABLE IF NOT EXISTS rotation_config (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        enabled INTEGER NOT NULL DEFAULT 1,
        interval_minutes INTEGER NOT NULL DEFAULT 30,
        shuffle INTEGER NOT NULL DEFAULT 0,
        collection_ids TEXT NOT NULL,
        last_run_at DATETIME NULL
      );

      INSERT OR IGNORE INTO rotation_config (id, enabled, interval_minutes, shuffle, collection_ids)
      VALUES (1, 1, 30, 0, '[]');
    `);

    // 6. Rotation History Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS rotation_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        wallpaper_id TEXT NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        trigger TEXT NOT NULL,
        collection_id TEXT NULL,
        rule_id TEXT NULL,
        FOREIGN KEY (wallpaper_id) REFERENCES wallpapers(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_rotation_history_applied 
      ON rotation_history(applied_at DESC);
    `);

    // 7. Personalization Rules Table (Context-Aware Rules)
    db.exec(`
      CREATE TABLE IF NOT EXISTS personalization_rules (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        condition_type TEXT NOT NULL,
        condition_value TEXT NOT NULL,
        collection_id TEXT NOT NULL,
        priority INTEGER NOT NULL DEFAULT 1,
        enabled INTEGER NOT NULL DEFAULT 1,
        FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_personalization_rules_priority 
      ON personalization_rules(priority ASC);
    `);

    // 8. Calendar Bindings Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS calendar_bindings (
        id TEXT PRIMARY KEY,
        match_type TEXT NOT NULL,
        match_value TEXT NOT NULL,
        collection_id TEXT NOT NULL,
        priority INTEGER NOT NULL DEFAULT 1,
        FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
      );
    `);

    // 9. Calendar Events Cache Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS calendar_events_cache (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        start_time DATETIME NOT NULL,
        end_time DATETIME NOT NULL,
        fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 10. Context Cache Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS context_cache (
        key TEXT PRIMARY KEY,
        payload TEXT NOT NULL,
        fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 11. Overrides Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS overrides (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        wallpaper_id TEXT NOT NULL,
        set_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NULL
      );
    `);
  });

  migration();
}

module.exports = {
  runMigrations
};
