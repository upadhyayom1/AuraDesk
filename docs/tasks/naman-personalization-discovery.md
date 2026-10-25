# Team Assignment: Context-Aware Personalization & Discovery

> **Owner**: `@Naman`  
> **Focus Area**: Multiversal Portal (Online Wallpaper Search & Caching), Eye of Agamotto (Rules Engine, Weather, Time), and Google Calendar Event Automation.  
> **Target Scope**: Main Process Backend (No frontend UI code required in this phase).

---

## 📋 Table of Contents
1. [Overview & Responsibilities](#1-overview--responsibilities)
2. [Discovery Architecture & Provider Adapters](#2-discovery-architecture--provider-adapters)
3. [Context-Aware Personalization Engine](#3-context-aware-personalization-engine)
4. [Weather Service & Caching (OpenWeatherMap)](#4-weather-service--caching-openweathermap)
5. [Google Calendar Integration (OAuth 2.0 PKCE)](#5-google-calendar-integration-oauth-20-pkce)
6. [Database Tables & Repositories](#6-database-tables--repositories)
7. [IPC Channels & Push Events to Implement](#7-ipc-channels--push-events-to-implement)
8. [Mock Context Switch (Demo Day Feature)](#8-mock-context-switch-demo-day-feature)
9. [Step-by-Step Task Checklist & Definition of Done](#9-step-by-step-task-checklist--definition-of-done)

---

## 1. Overview & Responsibilities

Naman owns the **two most innovative intelligence layers** in AuraDesk:
1. **The Multiversal Portal (Discovery)**: Connecting to Unsplash and Pexels, unifying their disparate schemas into the clean `Wallpaper` entity, handling pagination, download tracking, and graceful fallback when rate-limited.
2. **The Eye of Agamotto (Context-Aware Personalization)**:
   - Priority evaluation engine: `Manual Override > Calendar Binding > Rules (Time/Weather) > Rotation > Fallback`.
   - OpenWeatherMap client with 10-minute caching.
   - Google Calendar desktop OAuth 2.0 PKCE integration with encrypted token storage (`safeStorage`).
   - Keyword/Event-to-Collection bindings.

---

## 2. Discovery Architecture & Provider Adapters

### 2.1 Interface & Adapters
*Location: `electron/main/services/discovery/`*

Create the provider adapter interface:
```typescript
export interface WallpaperSource {
  name: 'unsplash' | 'pexels';
  search(query: string, filters: SearchFilters): Promise<WallpaperPage>;
  browse(page: number): Promise<WallpaperPage>;
  fetchWallpaper(id: string): Promise<Wallpaper>;
  getCredits(id: string): Promise<Attribution>;
  trackDownload(id: string): Promise<void>;
}
```

### 2.2 `UnsplashSource.ts`
- **Base URL**: `https://api.unsplash.com`
- **Auth**: `Header: { Authorization: 'Client-ID ' + process.env.UNSPLASH_ACCESS_KEY }`
- **Search URL**: `/search/photos?query={q}&page={p}&per_page={n}&orientation={o}&color={c}`
- **Attribution & Download Tracking**:
  - Unsplash requires calling `photo.links.download_location` with Client-ID header when an image is applied to the desktop.
  - Implement `trackDownload(id)` to ping this endpoint asynchronously.
- **Normalization**: Prefix ID with `'unsplash:' + id`.

### 2.3 `PexelsSource.ts`
- **Base URL**: `https://api.pexels.com/v1`
- **Auth**: `Header: { Authorization: process.env.PEXELS_API_KEY }`
- **Search URL**: `/search?query={q}&page={p}&per_page={n}&orientation={o}&color={c}`
- **Curated Feed**: `/curated?page={p}&per_page={n}`
- **Normalization**: Prefix ID with `'pexels:' + id`.

### 2.4 `WallpaperDiscoveryService.ts`
- **Fan-out & Merge**: When a user searches, invoke enabled sources concurrently via `Promise.allSettled`.
- **Failover Logic**: If Unsplash returns `403` or `429` (Rate Limited), immediately fall back to Pexels without failing the request.
- **Concurrency Control**: Wrap external image requests with `p-limit(3)` to cap parallel requests and avoid network congestion.
- **5-Minute Cache**: Cache online search queries for 5 minutes in memory to conserve API quotas.

---

## 3. Context-Aware Personalization Engine
*Location: `electron/main/services/personalization/PersonalizationEngine.ts`*

The engine determines which wallpaper should be on screen right now.

### Priority Evaluation Chain (`chooseWallpaper`):
```typescript
async chooseWallpaper(context: ContextSnapshot): Promise<{ wallpaper: Wallpaper; trigger: TriggerType }> {
  // 1. Manual Override check (survives restart, highest priority)
  const override = await this.getOverride();
  if (override && (!override.expiresAt || new Date(override.expiresAt) > new Date())) {
    const wp = await this.wallpaperRepo.getById(override.wallpaperId);
    if (wp) return { wallpaper: wp, trigger: 'MANUAL' };
  }

  // If autoAdapt is disabled, skip to normal rotation
  if (!this.settings.autoAdaptEnabled) {
    return this.rotationScheduler.pickNext();
  }

  // 2. Calendar Binding check
  if (context.activeEvent) {
    const boundCollectionId = await this.calendarService.matchBinding(context.activeEvent);
    if (boundCollectionId) {
      const wp = await this.collectionsService.pickItem(boundCollectionId, 'next');
      if (wp) return { wallpaper: wp, trigger: 'CALENDAR' };
    }
  }

  // 3. Personalization Rules check (ordered by priority ASC)
  const matchingRule = await this.evaluateRules(context);
  if (matchingRule) {
    const wp = await this.collectionsService.pickItem(matchingRule.collectionId, 'next');
    if (wp) return { wallpaper: wp, trigger: 'RULE' };
  }

  // 4. Default Rotation
  return this.rotationScheduler.pickNext();
}
```

### Rule Evaluation Semantics:
1. **`TIME_RANGE`**: Parse `conditionValue: { from: "18:00", to: "23:59" }`.
   - *Note*: Must handle ranges crossing midnight, e.g., `from: "22:00"` to `to: "05:00"`.
2. **`WEATHER`**: Match `conditionValue: { condition: "Rain" }` against `context.weather.condition`.
3. **`DAY_PART`**: Match `conditionValue: { part: "night" }` against calculated day part (`dawn`, `day`, `dusk`, `night`).

---

## 4. Weather Service & Caching (OpenWeatherMap)
*Location: `electron/main/services/weather/WeatherService.ts`*

- **API Endpoint**: `https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&units=metric&appid={key}`
- **Geocoding Endpoint**: `https://api.openweathermap.org/geo/1.0/direct?q={city}&limit=1&appid={key}`
- **Hard 10-Minute Caching Rule**:
  - Store weather snapshots in memory and in the `context_cache` table.
  - Return cached result if `(now - fetched_at) < 10 minutes`.
  - **Crucial Rule**: Never query the live weather API inside the rotation loop without checking cache freshness first!
- **Day / Night Computation**:
  ```typescript
  const isDay = (data.dt >= data.sys.sunrise && data.dt < data.sys.sunset);
  ```

---

## 5. Google Calendar Integration (OAuth 2.0 PKCE)
*Location: `electron/main/services/calendar/CalendarService.ts`*

- **OAuth 2.0 Loopback Flow**:
  1. Generate PKCE `code_verifier` and `code_challenge`.
  2. Spin up local HTTP loopback server on `http://127.0.0.1:<random_port>`.
  3. Open system browser via `shell.openExternal(authUrl)`.
  4. Receive authorization code via loopback callback, exchange for tokens.
  5. Close loopback server.
- **Safe Token Storage**:
  - Encrypt access and refresh tokens using Electron's native `safeStorage.encryptString(token).toString('base64')`.
  - Store encrypted string in `settings` table. Never store tokens in plaintext.
- **Polling & Event Sync**:
  - Poll upcoming events every **5 minutes** (never poll per rotation tick).
  - Normalization: Handle both timed events (`start.dateTime`) and all-day events (`start.date`).
- **Calendar Bindings**:
  - Match incoming event summary against `calendar_bindings` rows (`matchType: 'KEYWORD'`, e.g., if summary contains `"exam"`, select `"Focus"` collection).

---

## 6. Database Tables & Repositories

Naman owns the queries for these 5 SQLite tables:

### 6.1 `personalization_rules`
```sql
CREATE TABLE IF NOT EXISTS personalization_rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  condition_type TEXT NOT NULL,               -- 'TIME_RANGE' | 'WEATHER' | 'DAY_PART'
  condition_value TEXT NOT NULL,              -- JSON payload
  collection_id TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 1,
  enabled INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_personalization_rules_priority ON personalization_rules(priority ASC);
```

### 6.2 `calendar_bindings`
```sql
CREATE TABLE IF NOT EXISTS calendar_bindings (
  id TEXT PRIMARY KEY,
  match_type TEXT NOT NULL,                   -- 'KEYWORD' | 'EVENT_ID'
  match_value TEXT NOT NULL,
  collection_id TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
);
```

### 6.3 `calendar_events_cache`
```sql
CREATE TABLE IF NOT EXISTS calendar_events_cache (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 6.4 `context_cache`
```sql
CREATE TABLE IF NOT EXISTS context_cache (
  key TEXT PRIMARY KEY,                       -- E.g. 'weather'
  payload TEXT NOT NULL,
  fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 6.5 `overrides`
```sql
CREATE TABLE IF NOT EXISTS overrides (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  wallpaper_id TEXT NOT NULL,
  set_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NULL
);
```

---

## 7. IPC Channels & Push Events to Implement

Naman is responsible for implementing the following channels:

### 7.1 Discovery IPC (`discovery:`)
- `discovery:search`: `{ query, source, orientation, color, page, perPage }` $\to$ Returns normalized results.
- `discovery:browse`: `{ source, page }` $\to$ Curated feed.
- `discovery:get`: `{ wallpaperId }` $\to$ Full image details.
- `discovery:credits`: `{ wallpaperId }` $\to$ Photographer details & link.
- `discovery:sources`: Returns provider status (`[{ name, enabled, ok }]`).

### 7.2 Personalization IPC (`personalization:`, `rule:`, `override:`)
- `personalization:getState`: Returns `{ enabled, activeRule, override, context }`.
- `personalization:setEnabled`: Toggles auto-adaptation on/off.
- `rule:list`: Returns rules sorted by priority ASC.
- `rule:create`: Validates with Zod, inserts new rule.
- `rule:update` / `rule:delete`: Edits or removes rule.
- `rule:reorder`: Updates priorities based on list order in a single transaction.
- `personalization:evaluate`: **Dry run** test ("Test My Rules" button) without modifying OS desktop.
- `override:set`: Sets manual override in `overrides` table.
- `override:clear`: Deletes row from `overrides`.

### 7.3 Calendar & Weather IPC (`calendar:`, `weather:`)
- `calendar:connect`: Triggers Google OAuth PKCE flow in browser.
- `calendar:disconnect`: Revokes tokens and clears cache.
- `calendar:status`: Returns `{ connected, account, lastSyncAt }`.
- `calendar:upcoming`: `{ hours }` $\to$ Returns cached events in next $N$ hours.
- `calendar:binding:list` / `create` / `delete`: Manages keyword bindings.
- `weather:setLocation`: `{ city }` or `{ lat, lon }` $\to$ Geocodes and updates location.
- `weather:current`: Returns current weather snapshot (utilizing 10-min cache).

### 7.4 Push Events
- `personalization:state`: Broadcasts updated context/rule state.
- `calendar:eventStarted` / `calendar:eventEnded`: Broadcasts when a scheduled event begins or ends.

---

## 8. Mock Context Switch (Demo Day Feature)

> ⚠️ **Critical for judges & live evaluation!**  
> You cannot predict if it will rain during your presentation, or wait for an actual calendar meeting to start.

Implement a `setMockContext({ weather?: string, activeEvent?: CalendarEvent })` method in `PersonalizationEngine`:
- When mock mode is enabled, the engine evaluates rules against the mocked weather (e.g. `"Rain"`) or mocked calendar event (e.g. `"Softablitz Final Exam"`).
- This allows demonstrating live wallpaper switching in seconds during the evaluation!

---

## 9. Step-by-Step Task Checklist for Naman

- [x] **Step 1: DB Migration**: Create tables `personalization_rules`, `calendar_bindings`, `calendar_events_cache`, `context_cache`, and `overrides`.
- [x] **Step 2: Unsplash & Pexels Adapters**: Implement Axios clients with retry logic (`axios-retry`, max 2 retries, timeout 8s).
- [x] **Step 3: Discovery Service**: Implement multi-source aggregation, normalization, and Pexels fallback.
- [x] **Step 4: Weather Service**: Implement OpenWeatherMap API integration with strict 10-minute cache and `isDay` calculation.
- [x] **Step 5: Calendar OAuth**: Implement desktop loopback redirect with PKCE and `safeStorage` encryption for tokens.
- [x] **Step 6: Personalization Engine**: Implement the 5-step priority evaluation chain and rule condition matchers.
- [x] **Step 7: Mock Context Switch**: Add mock weather and calendar toggles for demoing.
- [ ] **Step 8: IPC Handlers**: Register all `discovery:*`, `personalization:*`, `rule:*`, `calendar:*`, and `weather:*` channels with Zod validation.
- [ ] **Step 9: Verification**:
  - Test searching returns normalized Unsplash + Pexels results.
  - Test setting mock weather `"Rain"` triggers the corresponding rule's collection.
  - Test manual override takes precedence over both rules and rotation.
