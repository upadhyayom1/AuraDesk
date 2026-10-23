# Team Assignment: Application & Settings, Rotation & History

> **Owner**: `@adya`  
> **Focus Area**: Core App Lifecycle, Window & Tray Management, SQLite Settings, Rotation Engine (node-cron), and History Audit.  
> **Target Scope**: Main Process Backend (No frontend UI code required in this phase).

---

## 📋 Table of Contents
1. [Overview & Responsibilities](#1-overview--responsibilities)
2. [Classes & Architecture](#2-classes--architecture)
3. [Database Tables & Repositories](#3-database-tables--repositories)
4. [IPC Channels & Push Events to Implement](#4-ipc-channels--push-events-to-implement)
5. [System Tray & Keep-Alive Logic](#5-system-tray--keep-alive-logic)
6. [Rotation Engine & Scheduler Implementation Guide](#6-rotation-engine--scheduler-implementation-guide)
7. [Step-by-Step Task Checklist & Definition of Done](#7-step-by-step-task-checklist--definition-of-done)

---

## 1. Overview & Responsibilities

You are responsible for the **backbone and heartbeat of AuraDesk**:
- **Application Lifecycle**: Booting services, initializing SQLite, registering IPC channels, and handling clean shutdowns.
- **Window & System Tray**: Creating the secure Electron BrowserWindow, minimizing to system tray, preventing app exit on window close, and building the native tray context menu.
- **Settings Store**: Persisting and caching application configuration.
- **Rotation Engine**: Scheduling automatic wallpaper changes via a 1-minute `node-cron` tick, guarding against race conditions/double-fires (`isRotating`), and maintaining a non-repeating history log.

---

## 2. Classes & Architecture

### 2.1 `WallpaperApplication`
*Location: `electron/main/services/app/WallpaperApplication.ts` (or `WallpaperApplication.js`)*

- **Fields**:
  - `settings: AppSettings` — Cached settings instance.
  - `isRunning: boolean` — Main process run state.
  - `mainWindow: BrowserWindow | null` — Reference to main window.
  - `trayController: SystemTrayController` — System tray manager.
  - `scheduler: RotationScheduler` — Scheduler instance.
- **Methods to Implement**:
  - `start(): Promise<void>`
    1. Initialize database connection (`auradesk.db`) and run pending migrations.
    2. Load `AppSettings` from DB into memory.
    3. Instantiate all services (`WallpaperDiscoveryService`, `WallpaperManager`, `PersonalizationEngine`, `RotationScheduler`).
    4. Register all IPC handlers (`ipcMain.handle`).
    5. Create BrowserWindow with security flags (`contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`).
    6. Create System Tray icon with menu items.
    7. Restore state (`scheduler.restoreState()`).
  - `shutdown(): Promise<void>`
    1. Stop the `node-cron` scheduler job.
    2. Flush SQLite WAL via `db.pragma('wal_checkpoint(TRUNCATE)')`.
    3. Destroy the tray icon.
    4. Call `app.quit()`.
  - `minimizeToTray(): void`
    - Hides `mainWindow` while keeping all background services active.

---

### 2.2 `AppSettings`
*Location: `electron/main/services/settings/AppSettings.ts`*

- **Fields**:
  - `rotationInterval: number` (minutes, default: 30, min: 1).
  - `shuffleEnabled: boolean` (default: false).
  - `autoAdaptEnabled: boolean` (default: true).
  - `location: { lat?: number, lon?: number, city?: string }`.
  - `launchOnStartup: boolean` (default: false).
  - `sourcesEnabled: { unsplash: boolean, pexels: boolean }`.
- **Methods to Implement**:
  - `load(): Promise<AppSettingsData>`: Reads all key-value pairs from `settings` table.
  - `save(patch: Partial<AppSettingsData>): Promise<AppSettingsData>`: Validates patch and updates SQLite in a transaction.

---

### 2.3 `RotationScheduler`
*Location: `electron/main/services/scheduler/RotationScheduler.ts`*

- **Fields**:
  - `intervalMinutes: number` — Configured rotation interval.
  - `enabled: boolean` — Whether auto-rotation is active.
  - `shuffle: boolean` — Random selection vs sequential cycle.
  - `collectionIds: string[]` — Active collections selected for rotation.
  - `isRotating: boolean` — **Re-entrancy lock** (prevents double-fires if a tick occurs while an apply is in progress).
  - `cronJob: cron.ScheduledTask | null` — `node-cron` instance.
- **Methods to Implement**:
  - `init(): void`: Initializes a single cron tick running every minute: `nodeCron.schedule('* * * * *', () => this.tick())`.
  - `tick(): Promise<void>`:
    1. If `!this.enabled` or `this.isRotating`, exit immediately.
    2. Check `rotation_config.last_run_at` from DB.
    3. Calculate: `elapsedMinutes = (Date.now() - new Date(last_run_at).getTime()) / 60000`.
    4. If `elapsedMinutes >= this.intervalMinutes`:
       - Call `this.rotateNow('ROTATION')`.
  - `rotateNow(trigger: TriggerType = 'ROTATION'): Promise<Wallpaper>`:
    1. Acquire lock: `this.isRotating = true`.
    2. Ask `PersonalizationEngine.chooseWallpaper(context)` or pick next wallpaper from active `collectionIds` skipping `RotationHistory.getRecentIds()`.
    3. Call `WallpaperManager.apply(wallpaper)`.
    4. On success:
       - Update `rotation_config.last_run_at = CURRENT_TIMESTAMP`.
       - Record in `rotation_history`.
       - Broadcast push event: `mainWindow.webContents.send('wallpaper:changed', ...)`.
    5. Release lock: `this.isRotating = false` in a `finally` block.
  - `pause(): { enabled: false }` & `resume(): { enabled: true }`: Toggles state and updates `rotation_config`.

---

### 2.4 `RotationHistory` & `HistoryEntry`
*Location: `electron/main/services/scheduler/RotationHistory.ts`*

- **Methods to Implement**:
  - `record(wallpaper: Wallpaper, trigger: TriggerType, collectionId?: string, ruleId?: string): Promise<void>`:
    - Inserts a row into `rotation_history` **only after** wallpaper apply succeeds.
  - `getRecentIds(): string[]`:
    - Queries the last $N$ applied wallpaper IDs where $N = \min(10, \text{collection size} - 1)$.
    - This creates the **no-repeat window** so users don't see the same wallpaper twice in a row.
  - `restoreState(): Promise<{ lastWallpaper?: Wallpaper, lastRunAt?: string }>`:
    - Loads the most recent history entry on startup.

---

## 3. Database Tables & Repositories

Adya owns the queries for these 3 SQLite tables:

### 3.1 `settings` Table
```sql
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

### 3.2 `rotation_config` Table
```sql
CREATE TABLE IF NOT EXISTS rotation_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  enabled INTEGER NOT NULL DEFAULT 1,
  interval_minutes INTEGER NOT NULL DEFAULT 30,
  shuffle INTEGER NOT NULL DEFAULT 0,
  collection_ids TEXT NOT NULL,               -- JSON array: '["uuid-1", "uuid-2"]'
  last_run_at DATETIME NULL
);
-- Ensure the singleton row exists:
INSERT OR IGNORE INTO rotation_config (id, enabled, interval_minutes, shuffle, collection_ids)
VALUES (1, 1, 30, 0, '[]');
```

### 3.3 `rotation_history` Table
```sql
CREATE TABLE IF NOT EXISTS rotation_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wallpaper_id TEXT NOT NULL,
  applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  trigger TEXT NOT NULL,                      -- 'MANUAL' | 'ROTATION' | 'RULE' | 'CALENDAR'
  collection_id TEXT NULL,
  rule_id TEXT NULL,
  FOREIGN KEY (wallpaper_id) REFERENCES wallpapers(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_rotation_history_applied ON rotation_history(applied_at DESC);
```

---

## 4. IPC Channels & Push Events to Implement

Adya is responsible for implementing the following channels in `electron/main/ipc/handlers/`:

### 4.1 Settings & App IPC (`app:`, `settings:`)
- `settings:get`: Returns all current application settings.
- `settings:set`: Accepts `{ patch: Partial<AppSettings> }`, validates with Zod, and updates DB.
- `app:minimizeToTray`: Calls `mainWindow.hide()`.
- `app:setAutoLaunch`: Uses `app.setLoginItemSettings({ openAtLogin: enabled })`.
- `app:openExternal`: Validates `https://` protocol and calls `shell.openExternal(url)`.
- `app:quit`: Calls `app.quit()`.

### 4.2 Rotation IPC (`rotation:`)
- `rotation:getConfig`: Returns `RotationConfig` row from DB.
- `rotation:setConfig`: Accepts `{ collectionIds, intervalMinutes, shuffle, enabled }`, validates `intervalMinutes >= 1`, persists to `rotation_config`.
- `rotation:pause`: Pauses scheduler tick.
- `rotation:resume`: Resumes scheduler tick.
- `rotation:now`: Triggers `scheduler.rotateNow('MANUAL')` immediately.
- `rotation:history`: Accepts `{ limit, offset }`, returns paginated `HistoryEntry[]` with joined `wallpapers` metadata.
- `rotation:clearHistory`: Deletes rows from `rotation_history`.

### 4.3 Push Events (Broadcast via `mainWindow.webContents.send`)
- `rotation:state`: Sends `{ enabled: boolean, nextRunAt: string }` every tick.
- `wallpaper:changed`: Broadcasts whenever a wallpaper is applied: `{ wallpaper, trigger, appliedAt }`.

---

## 5. System Tray & Keep-Alive Logic
*Location: `electron/main/tray/SystemTrayController.ts`*

### Requirements:
1. **Prevent App Quit on Window Close**:
   ```javascript
   // In electron/main/index.js
   app.on('window-all-closed', (e) => {
     // Prevent app from quitting when user clicks the window 'X' button
     e.preventDefault();
   });
   ```
2. **Tray Context Menu**:
   Build native menu using `Menu.buildFromTemplate()`:
   - **Next Wallpaper**: Calls `scheduler.rotateNow('MANUAL')`.
   - **Pause / Resume Rotation**: Toggles rotation state.
   - **Auto-Adaptation On/Off**: Toggles `PersonalizationEngine`.
   - **Open AuraDesk**: Calls `mainWindow.show()`, `mainWindow.focus()`.
   - **Quit AuraDesk**: Performs clean `WallpaperApplication.shutdown()`.

---

## 6. Step-by-Step Task Checklist for Adya

- [ ] **Step 1: Database Migration**: Create migration script creating `settings`, `rotation_config`, and `rotation_history` tables with indexes.
- [ ] **Step 2: Settings Repository**: Implement `loadSettings()` and `updateSettings()` in `electron/main/database/repositories/settingsRepo.js`.
- [ ] **Step 3: Rotation Config Repository**: Implement `getRotationConfig()` and `saveRotationConfig()` with singleton `id = 1`.
- [ ] **Step 4: History Logger**: Implement `recordHistory()`, `getRecentIds(n)`, and `getHistoryPage(limit, offset)`.
- [ ] **Step 5: Scheduler Engine**: Implement `RotationScheduler` with `node-cron` ticking every minute and the `isRotating` guard.
- [ ] **Step 6: IPC Handlers**: Register all `settings:*`, `app:*`, and `rotation:*` handlers using Zod schemas from `shared/schemas/index.ts`.
- [ ] **Step 7: System Tray**: Create `SystemTrayController` with tray icon and context menu actions matching the spec.
- [ ] **Step 8: Verification**:
  - Test `settings:get` returns database-backed defaults.
  - Test closing window leaves tray alive and cron ticking.
  - Test `rotation:now` updates history and sends `wallpaper:changed` event.
