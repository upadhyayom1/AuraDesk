# AuraDesk — The Reality Weaver 🌌

> **Desktop Wallpaper Discovery, Collections & Context-Aware Automation**  
> Built with Electron, React, Vite, SQLite (`better-sqlite3`), and Sharp.

---

## 📁 Project Architecture & Folder Structure

```text
AuraDesk/
├── build/                                # Build resources & desktop packager assets
│   └── icons/                            # App icons (.ico, .png, .icns)
│
├── docs/                                 # Architectural specs, API documentation
│   ├── api/                              # IPC channel specifications & contracts
│   └── architecture/                     # System design, data flow diagrams
│
├── electron/                             # Electron Main Process & Preload Bridge
│   ├── main/
│   │   ├── config/                       # App settings, constants, environment config
│   │   ├── database/                     # SQLite (better-sqlite3) persistence layer
│   │   │   ├── migrations/               # Schema migrations (11 tables)
│   │   │   └── repositories/             # Data access repositories (wallpapers, collections, etc.)
│   │   ├── ipc/                          # IPC channel registration & dispatch
│   │   │   └── handlers/                 # Modular IPC handlers (discovery, wallpaper, rules, etc.)
│   │   ├── services/                     # Core backend services
│   │   │   ├── calendar/                 # Google Calendar client (OAuth loopback + PKCE)
│   │   │   ├── collections/              # Wallpaper collection management & reordering
│   │   │   ├── discovery/                # Aggregated search service
│   │   │   │   └── adapters/             # UnsplashSource, PexelsSource adapters
│   │   │   ├── personalization/          # Context-Aware Personalization Engine & rules
│   │   │   ├── scheduler/                # RotationScheduler (node-cron) & RotationHistory
│   │   │   ├── wallpaper/                # WallpaperManager (Sharp scale/crop + OS wallpaper apply)
│   │   │   └── weather/                  # OpenWeatherMap client & 10-min cache
│   │   ├── tray/                         # SystemTrayController & native tray menu
│   │   └── utils/                        # Native safeStorage, temp cleaner, retry logger
│   └── preload/                          # contextBridge exposing secure window.api
│
├── frontend/                             # React + Vite Renderer Application
│   ├── public/                           # Static assets, fallback thumbnails
│   │   ├── icons/
│   │   └── mock/
│   └── src/
│       ├── assets/                       # UI assets (fonts, SVGs, background textures)
│       │   ├── fonts/
│       │   ├── icons/
│       │   └── images/
│       ├── components/                   # Modular UI Components
│       │   ├── collections/              # Collection cards, vault views, drag-and-drop lists
│       │   ├── common/                   # Reusable components (Buttons, Modals, Inputs, Badges)
│       │   ├── discovery/                # Search bar, filter chips, provider badges
│       │   ├── layout/                   # App layout, Sidebar navigation, Custom title bar
│       │   ├── personalization/          # Rule builder cards, Condition selectors (weather/time)
│       │   ├── preview/                  # Fullscreen preview modal with photographer attribution
│       │   ├── scheduler/                # Interval slider, next-rotation countdown, history feed
│       │   ├── settings/                 # API key config, auto-launch toggle, display selector
│       │   └── ui/                       # Glassmorphic primitives, tooltips, dialogs
│       ├── context/                      # React Context providers (Theme, Toast notifications)
│       ├── hooks/                        # Custom hooks (useIPC, useWallpaper, useWeather, etc.)
│       ├── layouts/                      # Layout wrappers (MainLayout, WindowChrome)
│       ├── pages/                        # Route pages / Main views
│       │   ├── Collections/              # Sanctum of Memories (Saved vaults)
│       │   ├── Discovery/                # Multiversal Portal (Curated & online search)
│       │   ├── History/                  # Rotation history log
│       │   ├── Personalization/          # Eye of Agamotto (Rules engine & overrides)
│       │   └── Settings/                 # Preferences, API keys, Displays, Calendar auth
│       ├── routes/                       # Navigation & view routing configuration
│       ├── services/                     # IPC client wrappers & API abstractions
│       ├── stores/                       # State management (Zustand stores)
│       ├── styles/                       # Global CSS, themes, variables, animations
│       ├── types/                        # Frontend UI-specific TypeScript definitions
│       └── utils/                        # UI helpers, color math, formatting
│
├── shared/                               # Code shared between Main & Renderer
│   ├── constants/                        # IPC channel names, default configs, enum values
│   ├── schemas/                          # Zod validation schemas for all IPC payloads
│   └── types/                            # Core models (Wallpaper, Collection, Rule, CalendarEvent)
│
├── .env.example                          # Sample environment configuration
├── .gitignore                            # Git ignore configuration
└── README.md                             # Project documentation
```
