# Team Assignment: Collections & Desktop Integration

> **Owner**: `@om`  
> **Focus Area**: Sanctum of Memories (Named Vaults, Reordering, Local File Import) and Reality Manifestation (Desktop Integration, Sharp Scale & Crop, OS Wallpaper Application).  
> **Target Scope**: Main Process Backend (No frontend UI code required in this phase).

---

## 📋 Table of Contents
1. [Overview & Responsibilities](#1-overview--responsibilities)
2. [WallpaperManager & OS Integration](#2-wallpapermanager--os-integration)
3. [Sharp Scale & Crop Pipeline](#3-sharp-scale--crop-pipeline)
4. [Collections Architecture & Reordering](#4-collections-architecture--reordering)
5. [Local File Importer & Dialog](#5-local-file-importer--dialog)
6. [Database Tables & Repositories](#6-database-tables--repositories)
7. [IPC Channels to Implement](#7-ipc-channels-to-implement)
8. [Optional Bonus: Collection Import / Export (JSON)](#8-optional-bonus-collection-import--export-json)
9. [Step-by-Step Task Checklist & Definition of Done](#9-step-by-step-task-checklist--definition-of-done)

---

## 1. Overview & Responsibilities

Om is responsible for the **visual reality and storage vaults of AuraDesk**:
- **WallpaperManager**: The **only class** in the entire application allowed to touch the operating system wallpaper. Handles platform differences, preview caching, and display geometry.
- **Sharp Image Engine**: Downloads full-resolution images, crops and scales them to the exact physical screen dimensions with smart attention centering to eliminate letterboxing or stretching.
- **Sanctum of Memories (Collections)**:
  - Managing named vaults combining both online images and local desktop files.
  - Transactional drag-and-drop item reordering.
  - Shuffling and cycling wallpapers from a collection.
- **Local File Imports**: Native OS file picker dialog (`jpg`/`png`/`webp`) registering local images under the `'local:<uuid>'` format.

---

## 2. `WallpaperManager` & OS Integration
*Location: `electron/main/services/wallpaper/WallpaperManager.ts`*

- **Fields**:
  - `currentWallpaper: Wallpaper | null` — Currently active desktop wallpaper.
  - `tempDir: string` — Resolved path: `path.join(app.getPath('temp'), 'auradesk')`.
- **Methods to Implement**:
  - `init(): Promise<void>`:
    - Ensures `tempDir` exists on disk: `fs.mkdirSync(this.tempDir, { recursive: true })`.
    - **Temp Sweeper**: Cleans up any leftover temporary `.jpg` files from previous sessions on startup.
  - `getDisplays(): Array<{ id: number, width: number, height: number, scaleFactor: number }>`:
    - Uses Electron's `screen.getAllDisplays()` and `screen.getPrimaryDisplay()`.
    - Returns primary screen's logical size and display scale factor.
  - `preview(wallpaper: Wallpaper | string): Promise<{ previewPath: string }>`:
    - Caches a regular-sized image to a temporary file for fast rendering in the UI preview pane.
    - **Crucial Rule**: The desktop wallpaper is **NOT** touched during preview.
  - `apply(wallpaper: Wallpaper | string, trigger: TriggerType = 'MANUAL'): Promise<{ ok: boolean, appliedAt: string }>`:
    1. If a string ID is provided, resolve the full `Wallpaper` record from SQLite.
    2. If `wallpaper.source === 'local'`, verify the file exists with `fs.existsSync(wallpaper.localPath)`.
    3. Download/read the raw image buffer.
    4. Call `this.scaleAndCrop(inputBuffer)`.
    5. Dynamically load the ESM `wallpaper` module:
       ```javascript
       const { setWallpaper } = await import('wallpaper');
       await setWallpaper(croppedTempFilePath);
       ```
    6. **Record History ONLY on Success**:
       - Call `RotationHistory.record(wallpaper, trigger)`.
    7. **Delete Temp File**: Remove `croppedTempFilePath` immediately after apply.
    8. Update `this.currentWallpaper = wallpaper`.
    9. Ping Unsplash download location if `wallpaper.source === 'unsplash'` (compliance requirement).
    10. Return `{ ok: true, appliedAt: new Date().toISOString() }`.

---

## 3. Sharp Scale & Crop Pipeline

To guarantee that wallpapers look stunning on all monitors (High-DPI / 4K / Ultrawide / 1080p):

### The Exact Crop Algorithm:
```typescript
import sharp from 'sharp';
import { screen } from 'electron';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';

async function scaleAndCrop(input: Buffer | string, tempDir: string): Promise<string> {
  const primaryDisplay = screen.getPrimaryDisplay();
  
  // Calculate exact physical pixels (Logical Size * Scale Factor)
  const targetWidth = Math.round(primaryDisplay.size.width * primaryDisplay.scaleFactor);
  const targetHeight = Math.round(primaryDisplay.size.height * primaryDisplay.scaleFactor);

  const tempFilePath = path.join(tempDir, `crop_${crypto.randomUUID()}.jpg`);

  await sharp(input)
    .resize(targetWidth, targetHeight, {
      fit: 'cover',             // Fills the screen completely, no black bars
      position: 'attention'     // Sharp automatically centers on the most visually interesting focal point
    })
    .jpeg({
      quality: 92,              // High quality compression
      chromaSubsampling: '4:4:4' // Sharpest color edges
    })
    .toFile(tempFilePath);

  return tempFilePath;
}
```

---

## 4. Collections Architecture & Reordering
*Location: `electron/main/services/collections/CollectionsService.ts`*

A Collection (Sanctum of Memories) is a named vault containing an ordered list of online wallpapers and local user images.

### Key Operations:
- **`create(name: string): Promise<WallpaperCollection>`**:
  - Rejects empty strings and whitespace.
  - Rejects duplicate names (enforced by `UNIQUE` constraint).
- **`delete(id: string): Promise<void>`**:
  - Cascades deletion to `collection_items` automatically.
  - **Safety Check**: Checks if the collection is actively selected in `rotation_config.collection_ids`. If active, requires confirmation.
- **`addItem(collectionId: string, wallpaperId: string): Promise<CollectionItem>`**:
  - Queries `MAX(position)` for `collection_id` to place the new item at the end.
  - Avoids duplicate items within the same collection (`UNIQUE(collection_id, wallpaper_id)`).
- **`removeItem(collectionId: string, itemId: number): Promise<void>`**:
  - Deletes row and re-packs remaining positions in a transaction (`1, 2, 3...`) to close the gap.
- **`reorder(collectionId: string, itemIds: string[]): Promise<void>`**:
  - **Must run in a `db.transaction()`**:
  ```typescript
  const updateStmt = db.prepare('UPDATE collection_items SET position = ? WHERE collection_id = ? AND wallpaper_id = ?');
  const reorderTx = db.transaction((items: string[]) => {
    for (let index = 0; index < items.length; index++) {
      updateStmt.run(index + 1, collectionId, items[index]);
    }
  });
  reorderTx(itemIds);
  ```
- **`apply(collectionId: string, mode: 'random' | 'next'): Promise<Wallpaper>`**:
  - Picks an item from the collection.
  - `'random'`: Selects a random item excluding the current wallpaper.
  - `'next'`: Cycles sequentially through the collection by position.
  - Invokes `WallpaperManager.apply(item, 'MANUAL')`.

---

## 5. Local File Importer & Dialog

Users must be able to import their own offline photos into AuraDesk.

### Implementation:
- **Dialog Options**:
  ```typescript
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Import Local Wallpapers',
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp'] }
    ]
  });
  ```
- **Registration**:
  - For each selected file, inspect dimensions using `sharp(filePath).metadata()`.
  - Generate ID: `'local:' + crypto.randomUUID()`.
  - Insert into `wallpapers` table with `local_path = filePath` and `source = 'local'`.
  - Return registered `Wallpaper[]` to caller.

---

## 6. Database Tables & Repositories

Om owns the queries for these 3 SQLite tables:

### 6.1 `wallpapers` Table
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
  local_path TEXT NULL,              -- Only populated for local imports
  cached_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 6.2 `collections` Table
```sql
CREATE TABLE IF NOT EXISTS collections (
  id TEXT PRIMARY KEY,               -- UUID v4
  name TEXT UNIQUE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 6.3 `collection_items` Table
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
CREATE INDEX IF NOT EXISTS idx_collection_items_pos ON collection_items(collection_id, position);
```

---

## 7. IPC Channels to Implement

Om is responsible for implementing the following channels in `electron/main/ipc/handlers/`:

### 7.1 Wallpaper IPC (`wallpaper:`)
- `wallpaper:preview`: `{ wallpaperId | localPath }` $\to$ Returns `{ previewPath }`.
- `wallpaper:apply`: `{ wallpaperId | localPath }` $\to$ Downloads, crops, sets desktop, logs history.
- `wallpaper:current`: Returns currently active wallpaper metadata and trigger.
- `wallpaper:pickLocal`: Opens native dialog, registers images, returns `Wallpaper[]`.
- `wallpaper:displays`: Returns screen geometries and scale factors.

### 7.2 Collections IPC (`collection:`)
- `collection:create`: `{ name }` $\to$ Returns created collection.
- `collection:list`: Returns all vaults with `itemCount` and `coverUrl` for the sidebar.
- `collection:get`: `{ id }` $\to$ Returns collection with ordered items.
- `collection:rename`: `{ id, name }` $\to$ Renames collection.
- `collection:delete`: `{ id }` $\to$ Deletes collection and cascades items.
- `collection:addItem`: `{ collectionId, wallpaperId | localPath }` $\to$ Adds to end of collection.
- `collection:removeItem`: `{ collectionId, itemId }` $\to$ Deletes item and closes position gap.
- `collection:reorder`: `{ collectionId, itemIds[] }` $\to$ Executes transactional reorder.
- `collection:apply`: `{ id, mode: 'random' | 'next' }` $\to$ Applies one item to desktop immediately.

---

## 8. Optional Bonus: Collection Import / Export (JSON)

> 🏆 **Bonus points for Softablitz!**  
> The problem statement mentions that users can share collections with teammates.

Implement these two optional channels:
- `collection:export`: `{ id }` $\to$ Writes collection metadata and wallpaper items to a `.json` file via `dialog.showSaveDialog()`.
- `collection:import`: `{ filePath }` $\to$ Reads JSON file, validates schema with Zod, and creates a new collection.

---

## 9. Step-by-Step Task Checklist for Om

- [ ] **Step 1: DB Migration**: Create tables `wallpapers`, `collections`, and `collection_items` with cascading foreign keys and indexes.
- [ ] **Step 2: Wallpaper Repository**: Implement CRUD queries for `wallpapers` (insert/upsert metadata cache, fetch by ID).
- [ ] **Step 3: Collections Repository**: Implement collection CRUD and transactional reorder queries.
- [ ] **Step 4: Sharp Scaling Engine**: Implement `scaleAndCrop()` matching the display's physical resolution (`scaleFactor`).
- [ ] **Step 5: WallpaperManager**: Implement `apply()` with dynamic `import('wallpaper')`, preview caching, and history recording.
- [ ] **Step 6: Local File Picker**: Implement `wallpaper:pickLocal` using Electron `dialog.showOpenDialog` and dimension inspection.
- [ ] **Step 7: IPC Handlers**: Register all `wallpaper:*` and `collection:*` channels with Zod schema validation.
- [ ] **Step 8: Verification**:
  - Test applying an online image: verify desktop wallpaper changes with correct aspect ratio on your primary display.
  - Test applying a local image from your disk.
  - Test reordering items in a collection and verify positions update in SQLite.
