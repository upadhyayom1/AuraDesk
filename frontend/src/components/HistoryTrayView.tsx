import React from 'react';
import { useWallpaper } from '../context/WallpaperContext';
import {
  History,
  RotateCcw,
  Trash2,
  Sparkles,
  ShieldCheck,
  Check,
  Clock,
  Layers,
} from 'lucide-react';

export const HistoryTrayView: React.FC = () => {
  const {
    history,
    rollbackHistory,
    clearHistory,
    currentWallpaper,
    settings,
    updateSettings,
    glassTheme,
  } = useWallpaper();

  const isWhitish = glassTheme === 'whitish';

  return (
    <div className="space-y-6 pb-8">
      {/* Top Banner */}
      <div
        className={`flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 rounded-2xl border shrink-0 transition-all ${
          isWhitish
            ? 'mac-glass-whitish-card border-white/80 text-slate-800'
            : 'mac-glass-blackish-card border-white/18 text-slate-100 specular-sheen'
        }`}
      >
        <div>
          <div className="flex items-center gap-2">
            <History className={`w-5 h-5 ${isWhitish ? 'text-blue-600' : 'text-cyan-300'}`} />
            <h2 className={`text-base font-bold tracking-wide ${isWhitish ? 'text-slate-900' : 'text-white'}`}>
              Persistent Rotation History & Rollback
            </h2>
          </div>
          <p className={`text-xs mt-0.5 ${isWhitish ? 'text-slate-600' : 'text-slate-400'}`}>
            Audit chronological wallpaper changes. Rollback to any prior wallpaper with a single click
            while maintaining deduplication.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Avoid Recent Toggle */}
          <button
            onClick={() =>
              updateSettings({ avoidRecentWallpapers: !settings.avoidRecentWallpapers })
            }
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
              settings.avoidRecentWallpapers
                ? isWhitish
                  ? 'bg-blue-500/15 text-blue-900 border-blue-400/30'
                  : 'bg-cyan-500/20 text-cyan-300 border-cyan-400/30'
                : isWhitish
                ? 'bg-white/50 text-slate-600 border-white/80'
                : 'bg-white/5 text-slate-400 border-white/10'
            }`}
            title="When active, the rotation scheduler avoids repeating recently used wallpapers"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>
              {settings.avoidRecentWallpapers ? 'Avoid Recents: ON' : 'Avoid Recents: OFF'}
            </span>
          </button>

          {history.length > 0 && (
            <button
              onClick={clearHistory}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-rose-500/20 hover:text-rose-300 text-slate-400 text-xs font-medium border border-white/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          )}
        </div>
      </div>

      {/* History Timeline */}
      {history.length === 0 ? (
        <div className="p-12 text-center rounded-2xl mac-glass-panel-dark border border-white/10 space-y-2">
          <p className="text-sm font-semibold text-white">No history entries yet</p>
          <p className="text-xs text-slate-400">
            As wallpapers are rotated or applied, they will appear here for easy rollback.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {history.map((entry, index) => {
            const isCurrent = currentWallpaper.id === entry.wallpaperId && index === 0;

            const getReasonBadge = (reason: string) => {
              switch (reason) {
                case 'calendar':
                  return 'bg-purple-500/20 text-purple-300 border-purple-400/30';
                case 'weather':
                  return 'bg-sky-500/20 text-sky-300 border-sky-400/30';
                case 'time':
                  return 'bg-amber-500/20 text-amber-300 border-amber-400/30';
                case 'scheduler':
                  return 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30';
                case 'manual':
                default:
                  return 'bg-white/10 text-slate-300 border-white/15';
              }
            };

            return (
              <div
                key={entry.id}
                className={`p-3.5 rounded-2xl mac-glass-card flex items-center justify-between gap-4 transition-all ${
                  isCurrent ? 'ring-1 ring-cyan-400/50 bg-cyan-950/20' : ''
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <img
                    src={entry.imageUrl}
                    alt={entry.wallpaperTitle}
                    className="w-14 h-14 rounded-xl object-cover border border-white/15 shrink-0 shadow-md"
                  />

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-white truncate">
                        {entry.wallpaperTitle}
                      </h4>
                      {isCurrent && (
                        <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-mono border border-cyan-400/30">
                          Current
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                      <span>{entry.sourceCredit}</span>
                      <span>·</span>
                      <span className="font-mono tabular-nums text-slate-400">{entry.appliedAt}</span>
                      <span>·</span>
                      <span
                        className={`px-2 py-0.5 rounded-md border text-[10px] uppercase font-mono tracking-wider ${getReasonBadge(
                          entry.reason
                        )}`}
                      >
                        {entry.reason}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => rollbackHistory(entry.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium border border-white/15 transition-all active:scale-95 shadow-sm"
                    title="Rollback to this wallpaper"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-cyan-300" />
                    <span>Reapply</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
