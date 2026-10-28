import React from 'react';
import { useWallpaper } from '../context/WallpaperContext';
import {
  Compass,
  Monitor,
  FolderHeart,
  CloudSun,
  Calendar,
  History,
  Palette,
  Sliders,
  Sparkles,
  Plus,
  Check,
  ChevronRight,
  ShieldCheck,
  Sun,
  Moon,
  RotateCw,
} from 'lucide-react';

export type ActiveTab =
  | 'discovery'
  | 'collections'
  | 'rotation'
  | 'personalization'
  | 'history';

interface MacSidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenNewWallpaperModal: () => void;
  onOpenSettings: () => void;
}

export const MacSidebar: React.FC<MacSidebarProps> = ({
  activeTab,
  onSelectTab,
  onOpenNewWallpaperModal,
  onOpenSettings,
}) => {
  const {
    collections,
    activeCollectionId,
    setActiveCollectionId,
    wallpapers,
    currentWallpaper,
    glassTheme,
    setGlassTheme,
    minimizeAppToTray,
    closeWindow,
    minimizeWindow,
    toggleMaximizeWindow,
    isNativeElectron,
    backendStatus,
    backendError,
    platformName,
  } = useWallpaper();

  const isWhitish = glassTheme === 'whitish';

  const mainNavItems: Array<{ id: ActiveTab; label: string; icon: any; count?: number; highlight?: boolean }> = [
    { id: 'discovery' as ActiveTab, label: 'Explore Wallpapers', icon: Compass, count: wallpapers.length },
    { id: 'collections' as ActiveTab, label: 'Collections', icon: FolderHeart, count: collections.length },
    { id: 'rotation' as ActiveTab, label: 'Wallpaper Rotation', icon: RotateCw },
    { id: 'personalization' as ActiveTab, label: 'Personalization', icon: Sparkles },
    { id: 'history' as ActiveTab, label: 'Rotation History', icon: History },
  ];

  return (
    <aside
      className={`w-64 h-full flex flex-col justify-between p-3.5 backdrop-blur-3xl border-r select-none transition-all duration-300 ${isWhitish
        ? 'bg-white/40 border-white/60 text-slate-800'
        : 'bg-black/40 border-white/10 text-slate-200'
        }`}
    >
      {/* Top Window Controls & Branding */}
      <div className="space-y-4">
        {/* macOS Top Header with Traffic Lights (Extreme Upper-Left) & Tools */}
        <div className="h-8 flex items-center justify-between pb-1 app-drag">
          {/* macOS Traffic Light Buttons */}
          <div
            className="flex items-center gap-2 app-no-drag group cursor-default"
            role="group"
            aria-label="macOS Window Controls"
          >
            {/* Red: Close Window */}
            <button
              type="button"
              onClick={closeWindow}
              className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e] hover:brightness-90 active:brightness-75 flex items-center justify-center transition-all cursor-pointer shadow-xs focus:outline-none"
              title="Close window"
              aria-label="Close"
            >
              <svg
                className="w-2 h-2 text-[#4d0000] opacity-0 group-hover:opacity-100 transition-opacity"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {/* Yellow: Minimize Window */}
            <button
              type="button"
              onClick={minimizeWindow}
              className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123] hover:brightness-90 active:brightness-75 flex items-center justify-center transition-all cursor-pointer shadow-xs focus:outline-none"
              title="Minimize window"
              aria-label="Minimize"
            >
              <svg
                className="w-2 h-2 text-[#593b00] opacity-0 group-hover:opacity-100 transition-opacity"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>

            {/* Green: Toggle Maximize / Zoom */}
            <button
              type="button"
              onClick={toggleMaximizeWindow}
              className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29] hover:brightness-90 active:brightness-75 flex items-center justify-center transition-all cursor-pointer shadow-xs focus:outline-none"
              title="Zoom / Toggle Fullscreen"
              aria-label="Toggle Fullscreen"
            >
              <svg
                className="w-1.5 h-1.5 text-[#004d11] opacity-0 group-hover:opacity-100 transition-opacity"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M5 19h4v-2H6.41l4.3-4.29-1.42-1.42L5 15.59V19zm10-14h-4v2h2.59l-4.3 4.29 1.42 1.42L15 8.41V12h2V5h-2z" />
              </svg>
            </button>
          </div>

          {/* Right side tools: Quick Theme Switcher */}
          <div className="flex items-center gap-1.5 app-no-drag">
            <button
              type="button"
              onClick={() => setGlassTheme(isWhitish ? 'blackish' : 'whitish')}
              className={`p-1.5 rounded-full border transition-all ${isWhitish
                ? 'bg-black/5 hover:bg-black/10 border-black/10 text-slate-700'
                : 'bg-white/10 hover:bg-white/15 border-white/15 text-slate-200'
                }`}
              title={isWhitish ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
              aria-label="Toggle Theme"
            >
              {isWhitish ? (
                <Moon className="w-3.5 h-3.5 text-indigo-600" />
              ) : (
                <Sun className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />
              )}
            </button>
          </div>
        </div>

        {/* AuraDesk Brand Title */}
        <div className="px-2">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-lg bg-gradient-to-tr from-cyan-400 to-indigo-500 flex items-center justify-center text-white shadow-sm">
              <Sparkles className="w-3 h-3" />
            </div>
            <h1 className={`text-sm font-bold tracking-wide ${isWhitish ? 'text-slate-900' : 'text-white'}`}>
              AuraDesk
            </h1>
          </div>
          <p className={`text-[11px] mt-0.5 ${isWhitish ? 'text-slate-500' : 'text-slate-400'}`}>
            Intelligent Wallpaper Personalization
          </p>
        </div>

        {/* Primary Navigation */}
        <nav className="space-y-1">
          <p className={`px-2 text-[10px] uppercase font-mono tracking-wider ${isWhitish ? 'text-slate-500' : 'text-slate-400'}`}>
            Library
          </p>
          {mainNavItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`relative w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-all duration-200 ease-out group cursor-pointer active:scale-[0.98] ${isActive
                  ? isWhitish
                    ? 'bg-white/95 text-slate-900 shadow-sm border border-slate-200/80 font-semibold'
                    : 'bg-white/15 text-white shadow-sm border border-white/20 font-semibold'
                  : isWhitish
                    ? 'text-slate-600 hover:text-slate-900 hover:bg-white/60 border border-transparent'
                    : 'text-slate-300 hover:text-white hover:bg-white/8 border border-transparent'
                  }`}
              >
                {/* Smooth macOS Active Indicator Pill */}
                <span
                  className={`absolute left-0 top-2 bottom-2 w-1 rounded-r-full transition-all duration-200 ease-out ${isActive
                      ? isWhitish
                        ? 'bg-indigo-600 opacity-100 scale-y-100'
                        : 'bg-cyan-400 opacity-100 scale-y-100'
                      : 'opacity-0 scale-y-0'
                    }`}
                />
                <div className="flex items-center gap-2.5 pl-1">
                  <Icon
                    className={`w-4 h-4 transition-all duration-200 ease-out ${isActive
                      ? isWhitish
                        ? 'text-indigo-600 scale-105'
                        : 'text-cyan-300 scale-105'
                      : isWhitish
                        ? 'text-slate-500 group-hover:text-slate-800'
                        : 'text-slate-400 group-hover:text-slate-200'
                      }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.count !== undefined && (
                  <span className={`text-[11px] font-mono tabular-nums transition-colors duration-200 ${isActive ? (isWhitish ? 'text-slate-700 font-semibold' : 'text-white/80 font-semibold') : 'text-slate-400'}`}>
                    {item.count}
                  </span>
                )}
                {item.highlight && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-fuchsia-500/20 text-fuchsia-700 dark:text-fuchsia-300 border border-fuchsia-400/30 font-mono">
                    macOS
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Collections Quick Switcher */}
        <div className={`space-y-1 pt-2 border-t ${isWhitish ? 'border-black/10' : 'border-white/10'}`}>
          <div className="flex items-center justify-between px-2">
            <button
              type="button"
              onClick={() => onSelectTab('collections')}
              className={`text-[10px] uppercase font-mono tracking-wider font-semibold transition-colors flex items-center gap-1 cursor-pointer ${isWhitish
                  ? 'text-slate-500 hover:text-slate-900'
                  : 'text-slate-400 hover:text-white'
                }`}
              title="Go to Collections Manager"
            >
              <span>Collections</span>
              <ChevronRight className="w-3 h-3 opacity-60" />
            </button>
            <button
              onClick={() => {
                onSelectTab('collections');
                onOpenNewWallpaperModal();
              }}
              className={`p-1 rounded-md transition-colors cursor-pointer ${isWhitish
                ? 'text-slate-500 hover:text-slate-900 hover:bg-black/5'
                : 'text-slate-400 hover:text-white hover:bg-white/10'
                }`}
              title="Add Wallpaper / Collection"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-0.5 max-h-40 overflow-y-auto pr-1">
            {collections.map(col => {
              const isSelected = activeCollectionId === col.id;
              return (
                <button
                  key={col.id}
                  onClick={() => {
                    setActiveCollectionId(col.id);
                    onSelectTab('collections');
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all duration-200 ease-out text-left cursor-pointer active:scale-[0.98] ${isSelected
                      ? isWhitish
                        ? 'bg-white/95 text-slate-900 font-semibold shadow-xs border border-slate-200/80'
                        : 'bg-white/15 text-white font-semibold border border-white/20'
                      : isWhitish
                        ? 'text-slate-600 hover:text-slate-900 hover:bg-white/40 border border-transparent'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                    }`}
                  title={`Open ${col.name} in Collections Manager`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 transition-all duration-200 ${isSelected
                          ? isWhitish
                            ? 'bg-indigo-600 scale-125'
                            : 'bg-cyan-400 scale-125'
                          : 'bg-slate-400 scale-100'
                        }`}
                    />
                    <span className="truncate">{col.name}</span>
                  </div>
                  <span className="text-[10px] font-mono opacity-60 tabular-nums">
                    {col.wallpaperIds.length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Mini Active Widget */}
      <div className={`pt-3 border-t space-y-2.5 ${isWhitish ? 'border-black/10' : 'border-white/10'}`}>
        {/* Active Wallpaper Micro Thumbnail */}
        <div
          className={`flex items-center gap-2.5 p-2 rounded-xl border ${isWhitish
            ? 'bg-white/50 border-white/70 shadow-xs'
            : 'bg-white/5 border-white/10'
            }`}
        >
          <img
            src={currentWallpaper.imageUrl}
            alt=""
            className="w-8 h-8 rounded-lg object-cover border border-white/30 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className={`text-[10px] font-mono truncate uppercase ${isWhitish ? 'text-slate-500 font-semibold' : 'text-slate-400 font-medium'}`}>
              System Wallpaper
            </p>
            <p className={`text-xs font-medium truncate ${isWhitish ? 'text-slate-900' : 'text-white'}`}>
              {currentWallpaper.title}
            </p>
          </div>
        </div>

        {/* Footer info & settings button */}
        <div className={`flex items-center justify-between text-[11px] px-1 ${isWhitish ? 'text-slate-500' : 'text-slate-400'}`}>
          <div
            className="flex items-center gap-1.5 font-mono text-[10px] opacity-80"
            title={backendError || `${platformName} desktop backend: ${backendStatus}`}
          >
            {backendStatus === 'ready' && (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>{platformName} Ready</span>
              </>
            )}
            {backendStatus === 'initializing' && (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span>Initializing...</span>
              </>
            )}
            {backendStatus === 'error' && (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                <span>Service Error</span>
              </>
            )}
            {backendStatus === 'disconnected' && (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                <span>Web Preview</span>
              </>
            )}
            {backendStatus === 'offline' && (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span>Offline</span>
              </>
            )}
          </div>
          <button
            onClick={onOpenSettings}
            className={`p-1 rounded-md transition-colors ${isWhitish ? 'hover:bg-black/5 hover:text-slate-900' : 'hover:bg-white/10 hover:text-white'
              }`}
            title="Application Settings"
            aria-label="Settings"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};
