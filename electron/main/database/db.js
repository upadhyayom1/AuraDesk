const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

let dbInstance = null;

/**
 * Initializes and returns the SQLite database instance.
 * Applies foreign_keys, WAL mode, and normal synchronous PRAGMAs.
 * @param {string} [customPath] - Optional custom DB file path (e.g., for tests)
 * @returns {import('better-sqlite3').Database}
 */
function getDatabase(customPath = null) {
  if (dbInstance) {
    return dbInstance;
  }

  let dbPath = customPath;
  if (!dbPath) {
    const userDataPath = app ? app.getPath('userData') : path.join(process.cwd(), '.data');
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }
    dbPath = path.join(userDataPath, 'auradesk.db');
  } else {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  dbInstance = new Database(dbPath);

  // Apply pragmas as specified in architecture/database-schema.md
  dbInstance.pragma('foreign_keys = ON');
  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('synchronous = NORMAL');

  return dbInstance;
}

/**
 * Closes the database instance (useful for clean shutdown / testing)
 */
function closeDatabase() {
  if (dbInstance) {
    try {
      dbInstance.pragma('wal_checkpoint(TRUNCATE)');
      dbInstance.close();
    } catch (err) {
      console.error('Error closing database:', err);
    }
    dbInstance = null;
  }
}

module.exports = {
  getDatabase,
  closeDatabase
};
