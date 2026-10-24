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
} from 'lucide-react';

export type ActiveTab =
  | 'discovery'
  | 'desktop'
  | 'collections'
  | 'context-rules'
  | 'calendar'
  | 'history'
  | 'glass-design';

interface MacSidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenNewWallpaperModal: () => void;
  onOpenSettings: () => void;
  onOpenTeam: () => void;
}

export const MacSidebar: React.FC<MacSidebarProps> = ({
  activeTab,
  onSelectTab,
  onOpenNewWallpaperModal,
  onOpenSettings,
  onOpenTeam,
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
    isNativeElectron,
  } = useWallpaper();

  const isWhitish = glassTheme === 'whitish';

  const mainNavItems = [
    { id: 'discovery' as ActiveTab, label: 'Explore Wallpapers', icon: Compass, count: wallpapers.length },
    { id: 'desktop' as ActiveTab, label: 'Desktop Simulator', icon: Monitor },
    { id: 'collections' as ActiveTab, label: 'Collections', icon: FolderHeart, count: collections.length },
    { id: 'context-rules' as ActiveTab, label: 'Context Rules', icon: CloudSun },
    { id: 'calendar' as ActiveTab, label: 'Calendar Sync', icon: Calendar },
    { id: 'history' as ActiveTab, label: 'Rotation History', icon: History },
    { id: 'glass-design' as ActiveTab, label: 'Glass UI Design System', icon: Palette, highlight: true },
  ];

  return (
    <aside
      className={`w-64 h-full flex flex-col justify-between p-3.5 backdrop-blur-3xl border-r select-none transition-all duration-300 ${
        isWhitish
          ? 'bg-white/40 border-white/60 text-slate-800'
          : 'bg-black/40 border-white/10 text-slate-200'
      }`}
    >
      {/* Top Window Controls & Branding */}
      <div className="space-y-4">
        {/* macOS Top Header with Light/Dark Mode Switcher */}
        <div className="h-9 flex items-center justify-between pb-1 app-drag">
          {/* Light / Dark Mode Toggle Switch (Replaces the 3 corner dots) */}
          <div
            className={`flex items-center p-0.5 rounded-full border transition-all app-no-drag shadow-xs backdrop-blur-md ${
              isWhitish
                ? 'bg-black/5 border-black/10'
                : 'bg-white/10 border-white/15'
            }`}
          >
            <button
              type="button"
              onClick={() => setGlassTheme('whitish')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                isWhitish
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Switch to Light Glass Mode"
              aria-label="Light Mode"
            >
              <Sun className={`w-3 h-3 ${isWhitish ? 'text-amber-500 fill-amber-500/20' : 'text-slate-400'}`} />
              <span>Light</span>
            </button>
            <button
              type="button"
              onClick={() => setGlassTheme('blackish')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                !isWhitish
                  ? 'bg-neutral-800 text-white shadow-xs font-semibold border border-white/20'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Switch to Dark Glass Mode"
              aria-label="Dark Mode"
            >
              <Moon className={`w-3 h-3 ${!isWhitish ? 'text-cyan-400 fill-cyan-400/20' : 'text-slate-500'}`} />
              <span>Dark</span>
            </button>
          </div>

          <button
            onClick={onOpenTeam}
            className={`app-no-drag flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[10px] font-mono transition-colors ${
              isWhitish
                ? 'bg-black/5 hover:bg-black/10 border-black/10 text-slate-700'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
            }`}
            title="Softablitz 2026 Team 220"
          >
            <span>Team 220</span>
          </button>
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
            Intelligent Wallpaper Engine
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
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-all group ${
                  isActive
                    ? isWhitish
                      ? 'bg-white/90 text-slate-900 shadow-sm border border-white/80'
                      : 'bg-white/15 text-white shadow-sm border border-white/20'
                    : isWhitish
                    ? 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive
                        ? isWhitish
                          ? 'text-cyan-600'
                          : 'text-cyan-300'
                        : isWhitish
                        ? 'text-slate-500 group-hover:text-slate-800'
                        : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.count !== undefined && (
                  <span className={`text-[11px] font-mono tabular-nums ${isWhitish ? 'text-slate-400' : 'text-slate-400'}`}>
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
            <span className={`text-[10px] uppercase font-mono tracking-wider ${isWhitish ? 'text-slate-500' : 'text-slate-400'}`}>
              Collections
            </span>
            <button
              onClick={onOpenNewWallpaperModal}
              className={`p-1 rounded-md transition-colors ${
                isWhitish
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
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all text-left ${
                    isSelected
                      ? isWhitish
                        ? 'bg-white/80 text-cyan-800 font-semibold shadow-xs border border-white/90'
                        : 'bg-cyan-500/15 text-cyan-200 border border-cyan-400/30'
                      : isWhitish
                      ? 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-cyan-500' : 'bg-slate-400'}`} />
                    <span className="truncate">{col.name}</span>
                  </div>
                  <span className="text-[10px] font-mono opacity-60">
                    {col.wallpaperIds.length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Mini Active Widget & Softablitz 2026 Credit */}
      <div className={`pt-3 border-t space-y-2.5 ${isWhitish ? 'border-black/10' : 'border-white/10'}`}>
        {/* Active Wallpaper Micro Thumbnail */}
        <div
          className={`flex items-center gap-2.5 p-2 rounded-xl border ${
            isWhitish
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
            <p className={`text-[10px] font-mono truncate uppercase ${isWhitish ? 'text-cyan-700 font-bold' : 'text-cyan-300'}`}>
              Applied
            </p>
            <p className={`text-xs font-medium truncate ${isWhitish ? 'text-slate-900' : 'text-white'}`}>
              {currentWallpaper.title}
            </p>
          </div>
        </div>

        {/* Footer info button */}
        <div className={`flex items-center justify-between text-[11px] px-1 ${isWhitish ? 'text-slate-500' : 'text-slate-400'}`}>
          <button
            onClick={onOpenTeam}
            className={`transition-colors flex items-center gap-1 ${isWhitish ? 'hover:text-slate-900' : 'hover:text-white'}`}
          >
            <span>Softablitz 2026</span>
          </button>
          <button
            onClick={onOpenSettings}
            className={`p-1 rounded-md transition-colors ${
              isWhitish ? 'hover:bg-black/5 hover:text-slate-900' : 'hover:bg-white/10 hover:text-white'
            }`}
            title="Settings"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};
