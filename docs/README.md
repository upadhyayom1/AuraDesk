# AuraDesk — Technical Documentation & Team Guide

> **Softablitz 2026 — Problem Statement: The Reality Weaver**  
> Desktop wallpaper discovery, collections, and context-aware automation.

Welcome to the engineering documentation for **AuraDesk**. This repository contains the complete specification, data schemas, API contracts, and implementation milestones. All team members should consult these documents before implementing features.

---

## 📚 Documentation Index

1. [**System Architecture & Models**](./architecture/system-design.md)
   - Overview of runtime and persisted models (17 classes + 4 added models).
   - In-memory service architecture (`WallpaperDiscoveryService`, `WallpaperManager`, `RotationScheduler`, `PersonalizationEngine`, etc.).
   - Decision priority chain (`Override > Calendar > Rule > Rotation > Fallback`).
   - Electron security policies and display scale/crop pipeline.

2. [**SQLite Database Schema**](./architecture/database-schema.md)
   - Complete definitions of all **11 SQLite tables** located in `app.getPath('userData')/auradesk.db`.
   - Constraints, indexes, foreign keys (`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL`).
   - Transaction guidelines and sample JSON payloads for `condition_value`.

3. [**Internal IPC API Reference**](./api/ipc-channels.md)
   - Comprehensive reference of all **48 IPC channels** across 7 functional domains.
   - 6 main-to-renderer push events (`wallpaper:changed`, `rotation:state`, etc.).
   - Standard response envelope: `{ ok, data, error: { code, message } }`.
   - System tray menu dispatch.

4. [**External APIs & Normalization**](./api/external-apis.md)
   - Integration guides for **Unsplash**, **Pexels**, **OpenWeatherMap**, and **Google Calendar**.
   - Normalization mapping to unified `Wallpaper` model.
   - Authentication, rate limits, caching policies, and fallback strategies.

5. [**Conventions, Milestones & Build Order**](./build-order-and-conventions.md)
   - Coding conventions, retry policies, temp file hygiene, and no-repeat logic.
   - 8-step suggested milestone roadmap.
   - Softablitz contest tier mapping: **Basic (B1–B3)** vs **Advanced (A1–A2)**.
   - Early risk mitigations (native modules, OAuth tokens, API activation).

---

## 👥 Team Assignments & Work Breakdown

Detailed, step-by-step implementation guides and task checklists for each team member:

| Member | Assigned Domains | Detailed Task Guide |
| :--- | :--- | :--- |
| **`@adya`** | **Application & Settings**, **Rotation & History** | 📖 [**Adya's Implementation Guide**](./tasks/adya-application-settings-rotation.md) |
| **`@Naman`** | **Context-Aware Personalization**, **Discovery** | 📖 [**Naman's Implementation Guide**](./tasks/naman-personalization-discovery.md) |
| **`@om`** | **Collections & Desktop Integration** | 📖 [**Om's Implementation Guide**](./tasks/om-collections-desktop-integration.md) |

---

## 🚀 Key Architectural Principles

- **No REST Server**: AuraDesk is an Electron desktop app. Communication between the React UI (renderer) and Node.js (main process) happens strictly via **validated IPC channels** exposed via `contextBridge` (`window.api`).
- **Unified ID Scheme**: Every wallpaper uses a single string identifier: `'unsplash:<id>'`, `'pexels:<id>'`, or `'local:<uuid>'`.
- **Zero Raw Resolutions in Renderer**: Full-resolution wallpaper downloads and heavy image manipulations are performed solely by `Sharp` in the main process. The renderer only receives preview URLs or localized thumbnails.
- **Fail-Safe Offline Mode**: If external APIs or network connectivity fail, AuraDesk automatically falls back to local user collections.
