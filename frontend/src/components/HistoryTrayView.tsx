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

  const formatAppliedAt = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 pb-8 max-w-5xl mx-auto">
      {/* Top Banner */}
      <div
        className={`flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-5 rounded-3xl border shrink-0 transition-all ${isWhitish
          ? 'mac-glass-whitish-card border-white/80 text-slate-800'
          : 'mac-glass-blackish-card border-white/15 text-slate-100 specular-sheen'
          }`}
      >
        <div>
          <div className="flex items-center gap-2">
            <History className={`w-5 h-5 ${isWhitish ? 'text-indigo-600' : 'text-cyan-300'}`} />
            <h2 className={`text-base font-bold tracking-wide ${isWhitish ? 'text-slate-900' : 'text-white'}`}>
              Rotation History & Instant Rollback
            </h2>
          </div>
          <p className={`text-xs mt-0.5 ${isWhitish ? 'text-slate-600' : 'text-slate-400'}`}>
            Audit chronological wallpaper changes from SQLite. Rollback to any prior wallpaper with a single click.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Avoid Recent Toggle */}
          <button
            onClick={() =>
              updateSettings({ avoidRecentWallpapers: !settings.avoidRecentWallpapers })
            }
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              settings.avoidRecentWallpapers
                ? isWhitish
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-white/20 text-white border-white/30 shadow-xs'
                : isWhitish
                ? 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                isWhitish
                  ? 'bg-white hover:bg-rose-50 text-rose-600 border-slate-300 hover:border-rose-300'
                  : 'bg-white/5 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border-white/10'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          )}
        </div>
      </div>

      {/* History Timeline */}
      {history.length === 0 ? (
        <div
          className={`p-12 text-center rounded-3xl border space-y-2 ${isWhitish
            ? 'bg-white/60 border-slate-200 text-slate-700'
            : 'bg-white/5 border-white/10 text-slate-300'
            }`}
        >
          <History className="w-8 h-8 mx-auto mb-1 opacity-50 text-slate-400" />
          <p className="text-sm font-semibold">No rotation history yet</p>
          <p className="text-xs opacity-75 max-w-sm mx-auto">
            As wallpapers are rotated or applied to the desktop, they will appear here for audit and instant rollback.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {history.map((entry, index) => {
            const isCurrent = currentWallpaper.id === entry.wallpaperId && index === 0;

            const getReasonBadge = (reason: string) => {
              switch (reason) {
                case 'calendar':
                  return isWhitish
                    ? 'bg-purple-100 text-purple-800 border-purple-200'
                    : 'bg-purple-500/20 text-purple-300 border-purple-400/30';
                case 'weather':
                  return isWhitish
                    ? 'bg-sky-100 text-sky-800 border-sky-200'
                    : 'bg-sky-500/20 text-sky-300 border-sky-400/30';
                case 'time':
                  return isWhitish
                    ? 'bg-amber-100 text-amber-800 border-amber-200'
                    : 'bg-amber-500/20 text-amber-300 border-amber-400/30';
                case 'scheduler':
                  return isWhitish
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30';
                case 'manual':
                default:
                  return isWhitish
                    ? 'bg-slate-100 text-slate-700 border-slate-200'
                    : 'bg-white/10 text-slate-300 border-white/15';
              }
            };

            return (
              <div
                key={entry.id}
                className={`p-3.5 rounded-2xl border flex items-center justify-between gap-4 transition-all ${isCurrent
                  ? isWhitish
                    ? 'bg-white border-slate-900 shadow-md ring-2 ring-slate-900/10'
                    : 'bg-white/10 border-white/30 ring-1 ring-white/20'
                  : isWhitish
                    ? 'bg-white/70 border-white/90 text-slate-800 shadow-xs hover:border-slate-300'
                    : 'mac-glass-card border-white/10 text-slate-200 hover:border-white/20'
                  }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <img
                    src={entry.imageUrl}
                    alt={entry.wallpaperTitle}
                    className="w-14 h-14 rounded-xl object-cover border border-white/20 shrink-0 shadow-xs"
                  />

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className={`text-sm font-semibold truncate ${isWhitish ? 'text-slate-900' : 'text-white'}`}>
                        {entry.wallpaperTitle}
                      </h4>
                      {isCurrent && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono border ${isWhitish
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                          }`}>
                          Current
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs mt-1 flex-wrap opacity-80">
                      <span className="truncate">{entry.sourceCredit}</span>
                      <span>·</span>
                      <span className="font-mono tabular-nums">{formatAppliedAt(entry.appliedAt)}</span>
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
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all active:scale-95 shadow-xs cursor-pointer ${isWhitish
                      ? 'bg-slate-900 hover:bg-slate-800 text-white border-transparent'
                      : 'bg-white/10 hover:bg-white/20 text-white border-white/15'
                      }`}
                    title="Rollback to this wallpaper"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
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
