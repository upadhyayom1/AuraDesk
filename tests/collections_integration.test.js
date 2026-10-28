/**
 * Collections IPC and Main Process Integration Tests
 *
 * Verifies:
 * 1. IPC Handler Registration & Idempotent re-registration.
 * 2. Adding online wallpapers with full metadata object (from discovery search).
 * 3. Adding wallpapers by universal string ID (existing & auto-fetched).
 * 4. Adding local images by localPath.
 * 5. Idempotent addition (ON CONFLICT handling).
 * 6. Retrieving collection details and items with proper ordering.
 * 7. Removing items by wallpaper ID or collection item ID with position re-packing.
 * 8. Transactional reordering of collection items.
 * 9. Schema validation & error handling for invalid payloads.
 */

const assert = require('assert');
const Database = require('better-sqlite3');
const { runMigrations } = require('../electron/main/database/migrations/index');
const WallpaperRepository = require('../electron/main/database/repositories/wallpaperRepo');
const CollectionsRepository = require('../electron/main/database/repositories/collectionsRepo');
const CollectionsService = require('../electron/main/services/collections/CollectionsService');

// Set up mock electron environment before importing handlers
const handlers = new Map();
const mockIpcMain = {
  handle: (channel, handler) => {
    handlers.set(channel, handler);
  },
  removeHandler: (channel) => {
    handlers.delete(channel);
  }
};

require.cache[require.resolve('electron')] = {
  exports: {
    ipcMain: mockIpcMain
  }
};

const { registerCollectionsHandlers } = require('../electron/main/ipc/handlers/collectionsHandler');

async function invoke(channel, payload) {
  const handler = handlers.get(channel);
  if (!handler) {
    throw new Error(`Handler not registered for channel: ${channel}`);
  }
  return await handler({ sender: {} }, payload);
}

async function runCollectionsTestSuite() {
  console.log('🧪 Starting Collections IPC & Main Process Integration Tests...\n');

  // Setup in-memory SQLite DB
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  runMigrations(db);

  const wallpaperRepo = new WallpaperRepository(db);
  const collectionsRepo = new CollectionsRepository(db, wallpaperRepo);

  const mockDiscoveryService = {
    fetchWallpaper: async (id) => {
      if (id === 'unsplash:auto-fetched-1') {
        return {
          id: 'unsplash:auto-fetched-1',
          source: 'unsplash',
          title: 'Auto Fetched Mountain',
          imageUrl: 'https://images.unsplash.com/photo-auto-1',
          thumbUrl: 'https://images.unsplash.com/photo-auto-1-thumb',
          photographer: 'Mountain Climber',
          creditUrl: 'https://unsplash.com/@climber',
          width: 3840,
          height: 2160
        };
      }
      return null;
    }
  };

  const mockWallpaperManager = {
    apply: async () => ({ ok: true, appliedAt: new Date().toISOString() })
  };

  const collectionsService = new CollectionsService(
    db,
    collectionsRepo,
    wallpaperRepo,
    mockWallpaperManager,
    mockDiscoveryService
  );

  // ==========================================
  // TEST 1: Handler Registration & Idempotency
  // ==========================================
  console.log('1. Testing IPC Handler Registration & Idempotency...');
  registerCollectionsHandlers(collectionsService, () => null);
  assert(handlers.has('collection:create'), 'collection:create must be registered');
  assert(handlers.has('collection:list'), 'collection:list must be registered');
  assert(handlers.has('collection:get'), 'collection:get must be registered');
  assert(handlers.has('collection:addItem'), 'collection:addItem must be registered');
  assert(handlers.has('collection:removeItem'), 'collection:removeItem must be registered');
  assert(handlers.has('collection:reorder'), 'collection:reorder must be registered');

  // Must not throw on re-registration
  assert.doesNotThrow(() => {
    registerCollectionsHandlers(collectionsService, () => null);
  }, 'Re-registering collections handlers must be idempotent');
  console.log('✅ IPC handlers registered and idempotent\n');

  // ==========================================
  // TEST 2: Create Collection
  // ==========================================
  console.log('2. Testing collection:create...');
  const createRes = await invoke('collection:create', { name: 'Cyberpunk Horizons' });
  assert.strictEqual(createRes.ok, true);
  assert(createRes.data.id, 'Created collection must have an id');
  assert.strictEqual(createRes.data.name, 'Cyberpunk Horizons');
  const collectionId = createRes.data.id;
  console.log(`✅ Collection created with id: ${collectionId}\n`);

  // ==========================================
  // TEST 3: Add Item via Full Wallpaper Object (Discovery Pattern)
  // ==========================================
  console.log('3. Testing collection:addItem with full wallpaper metadata object...');
  const onlineWallpaperPayload = {
    collectionId,
    wallpaperId: 'unsplash:neon-city-99',
    wallpaper: {
      id: 'unsplash:neon-city-99',
      source: 'unsplash',
      title: 'Neon Tokyo Rain',
      description: 'cyberpunk neon city in rain',
      imageUrl: 'https://images.unsplash.com/photo-neon-city',
      thumbUrl: 'https://images.unsplash.com/photo-neon-city-thumb',
      photographer: 'Sora Tanaka',
      creditUrl: 'https://unsplash.com/@soratanaka',
      width: 3840,
      height: 2160
    }
  };

  const addRes1 = await invoke('collection:addItem', onlineWallpaperPayload);
  assert.strictEqual(addRes1.ok, true, `addItem failed: ${JSON.stringify(addRes1.error)}`);
  assert.strictEqual(addRes1.data.wallpaperId, 'unsplash:neon-city-99');
  assert.strictEqual(addRes1.data.position, 1);

  // Verify it exists in wallpapers table
  const cachedWp = wallpaperRepo.getById('unsplash:neon-city-99');
  assert(cachedWp, 'Wallpaper must be persisted to wallpapers table in SQLite');
  assert.strictEqual(cachedWp.title, 'Neon Tokyo Rain');
  assert.strictEqual(cachedWp.source, 'unsplash');
  console.log('✅ Online wallpaper metadata correctly cached in SQLite and added to collection\n');

  // ==========================================
  // TEST 4: Add Item via wallpaperId Object (Frontend Bridge Legacy Pattern)
  // ==========================================
  console.log('4. Testing collection:addItem with wallpaperId as an object...');
  const bridgeObjectPayload = {
    collectionId,
    wallpaperId: {
      id: 'pexels:synthwave-grid-42',
      source: 'online',
      title: 'Retro Synthwave Grid',
      imageUrl: 'https://images.pexels.com/photos/synthwave',
      thumbUrl: 'https://images.pexels.com/photos/synthwave-thumb',
      photographer: 'Alex Retro',
      creditUrl: 'https://pexels.com/@alexretro',
      width: 2560,
      height: 1440
    }
  };

  const addRes2 = await invoke('collection:addItem', bridgeObjectPayload);
  assert.strictEqual(addRes2.ok, true, `addItem with object failed: ${JSON.stringify(addRes2.error)}`);
  assert.strictEqual(addRes2.data.wallpaperId, 'pexels:synthwave-grid-42');
  assert.strictEqual(addRes2.data.position, 2);

  const cachedPexels = wallpaperRepo.getById('pexels:synthwave-grid-42');
  assert(cachedPexels, 'Pexels wallpaper must be stored in wallpapers table');
  assert.strictEqual(cachedPexels.source, 'pexels', 'source must be normalized to pexels');
  console.log('✅ Bridge object format handled seamlessly\n');

  // ==========================================
  // TEST 5: Add Item via String ID (Auto-Fetch via Discovery)
  // ==========================================
  console.log('5. Testing collection:addItem with string ID auto-fetched via Discovery...');
  const addRes3 = await invoke('collection:addItem', {
    collectionId,
    wallpaperId: 'unsplash:auto-fetched-1'
  });
  assert.strictEqual(addRes3.ok, true, `addItem auto-fetch failed: ${JSON.stringify(addRes3.error)}`);
  assert.strictEqual(addRes3.data.wallpaperId, 'unsplash:auto-fetched-1');
  assert.strictEqual(addRes3.data.position, 3);

  const cachedAuto = wallpaperRepo.getById('unsplash:auto-fetched-1');
  assert(cachedAuto, 'Auto-fetched wallpaper must be saved to database');
  assert.strictEqual(cachedAuto.photographer, 'Mountain Climber');
  console.log('✅ Auto-fetch on missing string ID verified\n');

  // ==========================================
  // TEST 6: Add Local Image via localPath
  // ==========================================
  console.log('6. Testing collection:addItem with localPath...');
  const addRes4 = await invoke('collection:addItem', {
    collectionId,
    localPath: '/Users/test/Pictures/custom_wallpaper.jpg'
  });
  assert.strictEqual(addRes4.ok, true, `addItem localPath failed: ${JSON.stringify(addRes4.error)}`);
  assert(addRes4.data.wallpaperId.startsWith('local:'), 'Local wallpaper ID must start with local:');
  assert.strictEqual(addRes4.data.position, 4);
  console.log('✅ Local file path import verified\n');

  // ==========================================
  // TEST 7: Idempotency (Re-adding same wallpaper)
  // ==========================================
  console.log('7. Testing collection:addItem idempotency on duplicate item...');
  const addDuplicateRes = await invoke('collection:addItem', onlineWallpaperPayload);
  assert.strictEqual(addDuplicateRes.ok, true);
  assert.strictEqual(addDuplicateRes.data.wallpaperId, 'unsplash:neon-city-99');
  assert.strictEqual(addDuplicateRes.data.position, 1, 'Duplicate item should keep its existing position');
  console.log('✅ Re-adding duplicate wallpaper is safe and idempotent\n');

  // ==========================================
  // TEST 8: collection:get items and ordering
  // ==========================================
  console.log('8. Testing collection:get...');
  const getRes = await invoke('collection:get', { id: collectionId });
  assert.strictEqual(getRes.ok, true);
  assert.strictEqual(getRes.data.collection.id, collectionId);
  assert.strictEqual(getRes.data.items.length, 4, 'Collection should contain exactly 4 items');
  assert.strictEqual(getRes.data.items[0].id, 'unsplash:neon-city-99');
  assert.strictEqual(getRes.data.items[0].position, 1);
  assert.strictEqual(getRes.data.items[1].id, 'pexels:synthwave-grid-42');
  assert.strictEqual(getRes.data.items[1].position, 2);
  console.log('✅ collection:get returns correct ordered items\n');

  // ==========================================
  // TEST 9: Remove Item by wallpaperId with Position Re-packing
  // ==========================================
  console.log('9. Testing collection:removeItem and position re-packing...');
  const removeRes = await invoke('collection:removeItem', {
    collectionId,
    itemId: 'pexels:synthwave-grid-42'
  });
  assert.strictEqual(removeRes.ok, true);

  const getAfterRemove = await invoke('collection:get', { id: collectionId });
  assert.strictEqual(getAfterRemove.data.items.length, 3);
  // Verify positions are re-packed (1, 2, 3)
  assert.strictEqual(getAfterRemove.data.items[0].position, 1);
  assert.strictEqual(getAfterRemove.data.items[1].position, 2);
  assert.strictEqual(getAfterRemove.data.items[2].position, 3);
  console.log('✅ Item removed and positions properly re-packed\n');

  // ==========================================
  // TEST 10: collection:reorder
  // ==========================================
  console.log('10. Testing collection:reorder...');
  const currentItems = getAfterRemove.data.items.map(it => it.id);
  const reversed = [...currentItems].reverse();
  const reorderRes = await invoke('collection:reorder', {
    collectionId,
    itemIds: reversed
  });
  assert.strictEqual(reorderRes.ok, true);

  const getAfterReorder = await invoke('collection:get', { id: collectionId });
  assert.strictEqual(getAfterReorder.data.items[0].id, reversed[0]);
  assert.strictEqual(getAfterReorder.data.items[0].position, 1);
  assert.strictEqual(getAfterReorder.data.items[1].id, reversed[1]);
  assert.strictEqual(getAfterReorder.data.items[1].position, 2);
  assert.strictEqual(getAfterReorder.data.items[2].id, reversed[2]);
  assert.strictEqual(getAfterReorder.data.items[2].position, 3);
  console.log('✅ collection:reorder successfully updated positions\n');

  // ==========================================
  // TEST 11: Validation Errors on Invalid Payloads
  // ==========================================
  console.log('11. Testing Validation Errors on Invalid Payloads...');
  const invalidAdd1 = await invoke('collection:addItem', { collectionId: '' });
  assert.strictEqual(invalidAdd1.ok, false);
  assert.strictEqual(invalidAdd1.error.code, 'VALIDATION');

  const invalidAdd2 = await invoke('collection:addItem', { collectionId });
  assert.strictEqual(invalidAdd2.ok, false);
  assert.strictEqual(invalidAdd2.error.code, 'VALIDATION');

  const invalidGet = await invoke('collection:get', { id: '' });
  assert.strictEqual(invalidGet.ok, false);
  assert.strictEqual(invalidGet.error.code, 'VALIDATION');
  console.log('✅ Malformed and invalid payloads properly rejected with VALIDATION code\n');

  console.log('🎉 ALL COLLECTIONS INTEGRATION TESTS PASSED SUCCESSFULLY! 🎉\n');
}

runCollectionsTestSuite()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Collections Integration Test Failure:', err);
    process.exit(1);
  });

