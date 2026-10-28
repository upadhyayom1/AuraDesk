import React from 'react';
import { useWallpaper } from '../context/WallpaperContext';
import {
  Sparkles,
  RotateCw,
  Pause,
  Play,
  Layers,
  Clock,
  History,
  Sliders,
  Maximize2,
  ExternalLink,
  ChevronRight,
  Check,
} from 'lucide-react';

interface MacTrayMenuProps {
  onOpenAppWindow: () => void;
  onOpenSettings: () => void;
}

export const MacTrayMenu: React.FC<MacTrayMenuProps> = ({ onOpenAppWindow, onOpenSettings }) => {
  const {
    currentWallpaper,
    activeCollectionId,
    collections,
    rotateNext,
    schedulerRunning,
    toggleScheduler,
    secondsRemaining,
    scalingMode,
    setScalingMode,
    history,
    rollbackHistory,
    activeRuleStatus,
    setIsTrayOpen,
    glassTheme,
  } = useWallpaper();

  const isWhitish = glassTheme === 'whitish';

  const activeCollection = collections.find(c => c.id === activeCollectionId);

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <>
      {/* Invisible backdrop to dismiss tray menu */}
      <div
        className="fixed inset-0 z-50 cursor-default"
        onClick={() => setIsTrayOpen(false)}
      />

      {/* Floating macOS Monterey/Sonoma Glass Tray Menu */}
      <div
        className={`fixed top-9 right-4 w-84 rounded-2xl p-3 z-50 shadow-2xl border select-none animate-in fade-in zoom-in-95 duration-150 ${
          isWhitish
            ? 'mac-glass-whitish border-white/90 text-slate-800'
            : 'mac-glass-blackish border-white/20 text-slate-100 specular-sheen'
        }`}
      >
        {/* Header: Current Wallpaper Mini Card */}
        <div
          className={`flex items-center gap-3 p-2 rounded-xl border mb-2.5 ${
            isWhitish ? 'bg-white/60 border-white/80' : 'bg-white/5 border-white/10'
          }`}
        >
          <img
            src={currentWallpaper.imageUrl}
            alt={currentWallpaper.title}
            className="w-12 h-12 rounded-lg object-cover border border-white/30 shadow-md shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <p className={`text-[11px] font-mono uppercase tracking-wider ${isWhitish ? 'text-emerald-700' : 'text-emerald-300'}`}>
                Active Desktop
              </p>
            </div>
            <h4 className={`text-xs font-semibold truncate ${isWhitish ? 'text-slate-900' : 'text-white'}`}>
              {currentWallpaper.title}
            </h4>
            <p className={`text-[10px] truncate ${isWhitish ? 'text-slate-500' : 'text-slate-400'}`}>
              {currentWallpaper.sourceCredit}
            </p>
          </div>
        </div>

        {/* Quick Rotation Controls */}
        <div className="grid grid-cols-2 gap-1.5 mb-2.5">
          <button
            onClick={() => {
              rotateNext(true);
            }}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl border text-xs font-semibold transition-all shadow-xs active:scale-95 cursor-pointer ${
              isWhitish
                ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-200'
                : 'bg-white/10 hover:bg-white/20 text-white border-white/10'
            }`}
          >
            <RotateCw className={`w-3.5 h-3.5 ${isWhitish ? 'text-indigo-600' : 'text-cyan-300'}`} />
            <span>Next Wallpaper</span>
          </button>

          <button
            onClick={toggleScheduler}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl border text-xs font-semibold transition-all shadow-xs active:scale-95 cursor-pointer ${
              isWhitish
                ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-200'
                : 'bg-white/10 hover:bg-white/20 text-white border-white/10'
            }`}
          >
            {schedulerRunning ? (
              <>
                <Pause className="w-3.5 h-3.5 text-amber-500" />
                <span>Pause Auto</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-300" />
                <span>Resume Auto</span>
              </>
            )}
          </button>
        </div>

        {/* Active Context Status */}
        <div className={`px-2.5 py-2 rounded-xl border text-[11px] mb-2.5 space-y-1 ${
          isWhitish ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950/40 border-white/5 text-slate-200'
        }`}>
          <div className={`flex items-center justify-between ${isWhitish ? 'text-slate-500' : 'text-slate-400'}`}>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>Next Rotation:</span>
            </span>
            <span className={`font-mono tabular-nums font-semibold ${isWhitish ? 'text-slate-900' : 'text-white'}`}>
              {schedulerRunning ? formatCountdown(secondsRemaining) : 'Paused'}
            </span>
          </div>

          <div className={`flex items-center justify-between ${isWhitish ? 'text-slate-500' : 'text-slate-400'}`}>
            <span className="flex items-center gap-1">
              <Layers className="w-3 h-3" />
              <span>Active Collection:</span>
            </span>
            <span className={`font-semibold truncate max-w-[130px] ${isWhitish ? 'text-slate-900' : 'text-white'}`}>
              {activeCollection?.name || 'Default'}
            </span>
          </div>

          <div className={`pt-1 border-t text-[10px] leading-tight font-mono ${
            isWhitish ? 'border-slate-200 text-indigo-700 font-semibold' : 'border-white/5 text-cyan-300/90'
          }`}>
            ⚡ {activeRuleStatus.description}
          </div>
        </div>

        {/* Scaling Mode Quick Select */}
        <div className="mb-2.5">
          <div className={`flex items-center justify-between text-[11px] px-1 mb-1 ${
            isWhitish ? 'text-slate-500' : 'text-slate-400'
          }`}>
            <span>Desktop Scaling</span>
            <span className={`font-mono capitalize font-semibold ${
              isWhitish ? 'text-slate-900' : 'text-white'
            }`}>{scalingMode}</span>
          </div>
          <div className={`grid grid-cols-4 gap-1 p-0.5 rounded-lg border text-[10px] ${
            isWhitish ? 'bg-slate-100 border-slate-200' : 'bg-black/30 border-white/5'
          }`}>
            {(['fill', 'fit-blur', 'center', 'stretch'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setScalingMode(mode)}
                className={`py-1 rounded font-medium capitalize transition-all cursor-pointer ${
                  scalingMode === mode
                    ? isWhitish
                      ? 'bg-white text-slate-900 font-bold shadow-xs border border-slate-200'
                      : 'bg-white/20 text-white font-bold shadow-xs'
                    : isWhitish
                    ? 'text-slate-600 hover:text-slate-900'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {mode === 'fit-blur' ? 'Blur-Fit' : mode}
              </button>
            ))}
          </div>
        </div>

        {/* Recent Rollback Quick List */}
        {history.length > 1 && (
          <div className="mb-2.5">
            <p className={`text-[10px] px-1 mb-1 uppercase tracking-wider font-mono ${
              isWhitish ? 'text-slate-500 font-semibold' : 'text-slate-400'
            }`}>
              Quick Rollback
            </p>
            <div className="space-y-1">
              {history.slice(1, 4).map(h => (
                <button
                  key={h.id}
                  onClick={() => rollbackHistory(h.id)}
                  className={`w-full flex items-center justify-between p-1.5 rounded-lg text-left transition-colors text-[11px] group cursor-pointer border ${
                    isWhitish
                      ? 'bg-white hover:bg-slate-50 border-slate-200/80 text-slate-800'
                      : 'bg-white/5 hover:bg-white/10 border-transparent text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <img
                      src={h.imageUrl}
                      alt={h.wallpaperTitle}
                      className="w-6 h-6 rounded object-cover shrink-0"
                    />
                    <span className={`truncate ${
                      isWhitish ? 'text-slate-800 group-hover:text-slate-950 font-medium' : 'text-slate-300 group-hover:text-white'
                    }`}>
                      {h.wallpaperTitle}
                    </span>
                  </div>
                  <span className={`text-[10px] font-mono tabular-nums ${
                    isWhitish ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    {h.appliedAt}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className={`pt-2 border-t flex items-center justify-between ${
          isWhitish ? 'border-slate-200' : 'border-white/10'
        }`}>
          <button
            onClick={() => {
              setIsTrayOpen(false);
              onOpenSettings();
            }}
            className={`flex items-center gap-1.5 text-xs transition-colors py-1 px-2 rounded-lg cursor-pointer ${
              isWhitish ? 'text-slate-600 hover:text-slate-900 hover:bg-black/5' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Preferences...</span>
          </button>

          <button
            onClick={() => {
              setIsTrayOpen(false);
              onOpenAppWindow();
            }}
            className={`flex items-center gap-1.5 text-xs font-semibold transition-colors py-1.5 px-3 rounded-xl border cursor-pointer ${
              isWhitish
                ? 'bg-slate-900 hover:bg-slate-800 text-white border-transparent shadow-xs'
                : 'bg-white/15 hover:bg-white/25 text-white border-white/20'
            }`}
          >
            <span>Open AuraDesk</span>
            <Maximize2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </>
  );
};
