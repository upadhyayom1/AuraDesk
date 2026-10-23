# Internal Electron IPC API Reference

> **Mechanism**: React Renderer $\leftrightarrow$ Preload Bridge $\leftrightarrow$ Electron Main Process  
> All calls in the renderer invoke: `window.api.invoke(channel, payload)`  
> Main process registers handlers via: `ipcMain.handle(channel, handler)`

---

## 1. IPC Standard Response Envelope

Every IPC channel handler must return an object adhering to the unified response contract:

```typescript
interface IPCResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: {
    code: 'VALIDATION' | 'NOT_FOUND' | 'RATE_LIMITED' | 'OFFLINE' | 'APPLY_FAILED' | 'AUTH_REQUIRED' | 'INTERNAL_ERROR';
    message: string;
  };
}
```

---

## 2. Channel Registry (48 Channels)

### 2.1 Discovery (Multiversal Portal)
| Channel | Service | Payload | Return Data (`data`) | Description |
| :--- | :--- | :--- | :--- | :--- |
| `discovery:search` | Discovery | `{ query: string, source?: string, orientation?: string, color?: string, page: number, perPage: number }` | `{ items: Wallpaper[], page: number, totalPages: number }` | Searches online providers (Unsplash + Pexels concurrently). |
| `discovery:browse` | Discovery | `{ source?: string, page: number }` | `{ items: Wallpaper[], page: number, totalPages: number }` | Curated/popular feed shown before user initiates a query. |
| `discovery:get` | Discovery | `{ wallpaperId: string }` | `Wallpaper` | Full metadata: photographer, resolution, URLs. |
| `discovery:credits` | Discovery | `{ wallpaperId: string }` | `{ photographer: string, profileUrl: string, sourceName: string, sourceUrl: string }` | Attribution info for preview modal. |
| `discovery:sources` | Discovery | `void` | `Array<{ name: string, enabled: boolean, ok: boolean }>` | Connectivity status of external image providers. |

---

### 2.2 Wallpaper (Reality Manifestation)
| Channel | Service | Payload | Return Data (`data`) | Description |
| :--- | :--- | :--- | :--- | :--- |
| `wallpaper:preview` | WallpaperManager | `{ wallpaperId?: string, localPath?: string }` | `{ previewPath: string }` | Caches regular-sized image to temp folder. Desktop unchanged. |
| `wallpaper:apply` | WallpaperManager | `{ wallpaperId?: string, localPath?: string }` | `{ ok: boolean, appliedAt: string }` | Downloads, scales & crops (Sharp), applies wallpaper, writes history. |
| `wallpaper:current` | WallpaperManager | `void` | `{ wallpaper: Wallpaper, appliedAt: string, trigger: string }` | Returns active desktop wallpaper metadata and trigger reason. |
| `wallpaper:pickLocal` | WallpaperManager | `void` | `{ wallpapers: Wallpaper[] }` | Opens native file dialog (`jpg`/`png`/`webp`); imports into local library. |
| `wallpaper:displays` | WallpaperManager | `void` | `Array<{ id: number, width: number, height: number, scaleFactor: number }>` | Returns detected screen resolutions for crop geometry. |

---

### 2.3 Collections (Sanctum of Memories)
| Channel | Service | Payload | Return Data (`data`) | Description |
| :--- | :--- | :--- | :--- | :--- |
| `collection:create` | Collections | `{ name: string }` | `WallpaperCollection` | Creates named vault. Rejects empty names and duplicates. |
| `collection:list` | Collections | `void` | `Array<{ id: string, name: string, itemCount: number, coverUrl?: string }>` | Returns summary list for navigation sidebar. |
| `collection:get` | Collections | `{ id: string }` | `{ collection: WallpaperCollection, items: Wallpaper[] }` | Fetches single vault with ordered wallpapers. |
| `collection:rename` | Collections | `{ id: string, name: string }` | `WallpaperCollection` | Renames an existing collection. |
| `collection:delete` | Collections | `{ id: string }` | `{ ok: boolean }` | Cascades item removal. Prompts if collection is in active rotation. |
| `collection:addItem` | Collections | `{ collectionId: string, wallpaperId?: string, localPath?: string }` | `CollectionItem` | Adds wallpaper to collection at the last position. |
| `collection:removeItem` | Collections | `{ collectionId: string, itemId: number }` | `{ ok: boolean }` | Removes item and re-packs position indices. |
| `collection:reorder` | Collections | `{ collectionId: string, itemIds: string[] }` | `{ ok: boolean }` | Persists drag-and-drop order in a single SQLite transaction. |
| `collection:apply` | Collections | `{ id: string, mode: 'random' \| 'next' }` | `Wallpaper` | Immediate shuffle or cycle through collection. |
| `collection:export` | Collections | `{ id: string }` | `{ filePath: string }` | *(Optional)* Exports collection and metadata to JSON file. |
| `collection:import` | Collections | `{ filePath: string }` | `WallpaperCollection` | *(Optional)* Imports collection JSON, validated via Zod. |

---

### 2.4 Rotation & History (Time Stone)
| Channel | Service | Payload | Return Data (`data`) | Description |
| :--- | :--- | :--- | :--- | :--- |
| `rotation:getConfig` | Scheduler | `void` | `RotationConfig` | Returns interval, shuffle flag, selected collections, enabled. |
| `rotation:setConfig` | Scheduler | `{ collectionIds: string[], intervalMinutes: number, shuffle: boolean, enabled: boolean }` | `RotationConfig` | Validates (`interval >= 1`) and persists schedule config. |
| `rotation:pause` | Scheduler | `void` | `{ enabled: false }` | Pauses automation schedule. |
| `rotation:resume` | Scheduler | `void` | `{ enabled: true }` | Resumes automation schedule. |
| `rotation:now` | Scheduler | `void` | `Wallpaper` | Manually triggers rotation step immediately (re-entrancy guarded). |
| `rotation:history` | History | `{ limit: number, offset: number }` | `HistoryEntry[]` | Returns paginated list of applied wallpapers with trigger stamps. |
| `rotation:clearHistory`| History | `void` | `{ ok: boolean }` | Clears history entries and resets no-repeat cache. |

---

### 2.5 Personalization (Eye of Agamotto)
| Channel | Service | Payload | Return Data (`data`) | Description |
| :--- | :--- | :--- | :--- | :--- |
| `personalization:getState` | Engine | `void` | `{ enabled: boolean, activeRule?: any, override?: any, context: ContextSnapshot }` | Drives status card in settings/rules view. |
| `personalization:setEnabled`| Engine | `{ enabled: boolean }` | `{ enabled: boolean }` | Toggles auto-adaptation on/off. |
| `rule:list` | Engine | `void` | `PersonalizationRule[]` | Lists configured rules sorted by priority. |
| `rule:create` | Engine | `{ name: string, conditionType: string, conditionValue: any, collectionId: string, priority: number }` | `PersonalizationRule` | Creates a new context rule. |
| `rule:update` | Engine | `{ id: string, patch: Partial<PersonalizationRule> }` | `PersonalizationRule` | Updates conditions or targets of an existing rule. |
| `rule:delete` | Engine | `{ id: string }` | `{ ok: boolean }` | Deletes a rule. |
| `rule:reorder` | Engine | `{ ruleIds: string[] }` | `{ ok: boolean }` | Updates priority order to match list arrangement. |
| `personalization:evaluate` | Engine | `void` | `{ matchedRule?: PersonalizationRule, wallpaper?: Wallpaper }` | Dry run test ("Test My Rules") without applying wallpaper. |
| `override:set` | Engine | `{ wallpaperId?: string, localPath?: string, expiresAt?: string }` | `{ ok: boolean }` | Sets manual override that beats rules and rotation. |
| `override:clear` | Engine | `void` | `{ ok: boolean }` | Clears manual override and returns control to automation. |

---

### 2.6 Calendar & Weather
| Channel | Service | Payload | Return Data (`data`) | Description |
| :--- | :--- | :--- | :--- | :--- |
| `calendar:connect` | Calendar | `void` | `{ connected: boolean, account: string }` | Initiates Google OAuth loopback flow with PKCE in default browser. |
| `calendar:disconnect` | Calendar | `void` | `{ ok: boolean }` | Revokes tokens, clears cache and safeStorage entry. |
| `calendar:status` | Calendar | `void` | `{ connected: boolean, account?: string, lastSyncAt?: string }` | Connection status for UI. |
| `calendar:upcoming` | Calendar | `{ hours: number }` | `CalendarEvent[]` | Events scheduled within the next $N$ hours. |
| `calendar:binding:list` | Calendar | `void` | `CalendarBinding[]` | Lists event keyword $\leftrightarrow$ collection bindings. |
| `calendar:binding:create`| Calendar | `{ matchType: string, matchValue: string, collectionId: string }` | `CalendarBinding` | Creates a new calendar binding. |
| `calendar:binding:delete`| Calendar | `{ id: string }` | `{ ok: boolean }` | Deletes a calendar binding. |
| `weather:setLocation` | Weather | `{ city: string } \| { lat: number, lon: number }` | `{ lat: number, lon: number, name: string }` | Geocodes city and stores coordinates. |
| `weather:current` | Weather | `void` | `{ condition: string, tempC: number, isDay: boolean, fetchedAt: string, cached: boolean }` | Returns current weather using 10-min cache. |

---

### 2.7 Settings & App Lifecycle
| Channel | Service | Payload | Return Data (`data`) | Description |
| :--- | :--- | :--- | :--- | :--- |
| `settings:get` | Settings | `void` | `AppSettings` | Reads application settings from SQLite. |
| `settings:set` | Settings | `{ patch: Partial<AppSettings> }` | `AppSettings` | Validates and updates changed keys. |
| `app:minimizeToTray` | App | `void` | `{ ok: boolean }` | Hides application window; background scheduler remains active. |
| `app:setAutoLaunch` | App | `{ enabled: boolean }` | `{ ok: boolean }` | Configures `app.setLoginItemSettings()` for startup persistence. |
| `app:openExternal` | App | `{ url: string }` | `{ ok: boolean }` | Opens URL in system browser (strictly requires `https://`). |
| `app:quit` | App | `void` | `void` | Clean shutdown from tray menu. |

---

## 3. Push Events (Main $\to$ Renderer)

Sent via `mainWindow.webContents.send(event, payload)`:

| Event | Payload | Purpose |
| :--- | :--- | :--- |
| `wallpaper:changed` | `{ wallpaper: Wallpaper, trigger: string, appliedAt: string }` | Real-time update of current wallpaper banner and history log. |
| `rotation:state` | `{ enabled: boolean, nextRunAt: string }` | Powers countdown timer widget in UI. |
| `personalization:state` | `{ activeRule: any, override: any, context: ContextSnapshot }` | Refreshes status cards when rules trigger or conditions change. |
| `calendar:eventStarted` | `{ event: CalendarEvent, binding?: CalendarBinding }` | Toast notification + contextual wallpaper switch. |
| `network:status` | `{ online: boolean }` | Shows offline banner; engine switches to local vaults. |
| `app:error` | `{ code: string, message: string, source: string }` | Non-blocking toast notification for failures. |
