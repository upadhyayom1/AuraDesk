# External APIs & Normalization Specification

This document details the configuration, rate limits, caching policies, and data normalization for AuraDesk's four external providers.

---

## 1. Provider Summary & Rate Limits

| Provider | Purpose | Rate Limit (Free Tier) | Auth Method | Caching Rule |
| :--- | :--- | :--- | :--- | :--- |
| **Unsplash** | Primary wallpaper discovery | 50 requests / hour | `Authorization: Client-ID <KEY>` | Cache search: 5 min. Thumbnails: on disk. |
| **Pexels** | Secondary / Fallback discovery | 200 req / hour (20,000/mo) | `Authorization: <KEY>` | Fallback when Unsplash returns 403 / 429. |
| **OpenWeatherMap** | Environmental context | 1,000 requests / day | Query param: `appid=<KEY>` | Hard 10-minute in-memory cache. |
| **Google Calendar** | Schedule-aware automation | Standard Google Cloud Quota | OAuth 2.0 PKCE (Desktop app) | Poll every 5 minutes (never per rotation). |

---

## 2. API Endpoints & Specifications

### 2.1 Unsplash
- **Search Endpoint**:
  `GET https://api.unsplash.com/search/photos?query=&page=&per_page=&orientation=&color=`
- **Key Fields**: `results[].id`, `alt_description`, `width`, `height`, `urls.{raw, full, regular, small, thumb}`, `user.name`, `user.links.html`, `links.download_location`.
- **Compliance Requirement**: When an Unsplash photo is actually applied to the user's desktop, the app **must** make an HTTP GET request to `links.download_location` with the Client-ID header to increment the photographer's download counter.
- **Image URLs**: Hotlink directly from Unsplash CDNs. For the actual desktop apply, request `urls.raw` with `&w={width}&h={height}` matching the screen's scaled dimensions.

---

### 2.2 Pexels
- **Search Endpoint**:
  `GET https://api.pexels.com/v1/search?query=&orientation=&color=&page=&per_page=`
- **Curated Endpoint**:
  `GET https://api.pexels.com/v1/curated?page=&per_page=`
- **Key Fields**: `photos[].id`, `width`, `height`, `alt`, `photographer`, `photographer_url`, `src.{original, large2x, large, medium, small}`.
- **Failover Strategy**: If Unsplash encounters network errors or rate limit codes (`403` / `429`), the Discovery service automatically redirects search queries to Pexels without notifying the user of an error.

---

### 2.3 OpenWeatherMap
- **Weather Endpoint**:
  `GET https://api.openweathermap.org/data/2.5/weather?lat=&lon=&units=metric&appid=<KEY>`
- **Geocoding Endpoint**:
  `GET https://geo/1.0/direct?q=<city>&limit=1&appid=<KEY>`
- **Key Fields**: `weather[0].main`, `main.temp`, `sys.sunrise`, `sys.sunset`, `dt`.
- **Weather Condition Mapping**:
  Map `weather[0].main` to one of:
  `Clear` | `Clouds` | `Rain` | `Drizzle` | `Thunderstorm` | `Snow` | `Mist`
- **Day / Night Computation**:
  Calculate `isDay = (dt >= sys.sunrise && dt < sys.sunset)` to derive `DAY_PART` rule matches (`dawn`, `day`, `dusk`, `night`).
- **Caching**: Results must be cached for at least 10 minutes. Under no circumstances should weather be queried in the rotation path without checking cache freshness.

---

### 2.4 Google Calendar
- **Authorization Flow**:
  - OAuth 2.0 with PKCE (Proof Key for Code Exchange).
  - Client Type: **Desktop app**.
  - Redirect URI: `http://127.0.0.1:<port>` (Loopback server spun up in main process).
  - Scope: `https://www.googleapis.com/auth/calendar.readonly`.
  - Token Encryption: Refresh and access tokens must be stored using `safeStorage.encryptString()`.
- **Events Endpoint**:
  `GET https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=<NOW>&timeMax=<FUTURE>&singleEvents=true&orderBy=startTime`
- **Gotchas**:
  - All-day events supply `start.date` instead of `start.dateTime`. The parser must handle both formats.
  - In Google Cloud "Testing" mode, refresh tokens expire every 7 days. Re-authenticating before demonstrations is recommended.

---

## 3. Data Normalization to `Wallpaper` Model

Both external APIs must be normalized into the standard `Wallpaper` entity before being sent to the renderer or stored in SQLite:

| Unified Model Field | Unsplash Source | Pexels Source |
| :--- | :--- | :--- |
| `id` | `'unsplash:' + photo.id` | `'pexels:' + photo.id` |
| `title` / `description` | `photo.description ?? photo.alt_description ?? 'Wallpaper'` | `photo.alt ?? 'Wallpaper'` |
| `imageUrl` (for apply) | `photo.urls.full` (or `photo.urls.raw + '&w=...'`) | `photo.src.original` or `photo.src.large2x` |
| `thumbUrl` (for UI grid) | `photo.urls.small` | `photo.src.medium` |
| `photographer` | `photo.user.name` | `photo.photographer` |
| `creditUrl` | `photo.user.links.html` | `photo.photographer_url` |
| `width` | `photo.width` | `photo.width` |
| `height` | `photo.height` | `photo.height` |
| `source` | `'unsplash'` | `'pexels'` |
