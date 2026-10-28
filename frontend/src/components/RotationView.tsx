import React, { useState, useEffect } from 'react';
import { useWallpaper } from '../context/WallpaperContext';
import {
  RotateCw,
  Play,
  Pause,
  Shuffle,
  ShieldCheck,
  Sparkles,
  Clock,
  FolderHeart,
  Check,
  AlertCircle,
  ChevronRight,
  History,
} from 'lucide-react';
import { electronBridge, normalizeBackendWallpaper } from '../services/electronBridge';

interface RotationViewProps {
  onOpenCollections: () => void;
  onOpenHistory?: () => void;
}

export const RotationView: React.FC<RotationViewProps> = ({ onOpenCollections, onOpenHistory }) => {
  const {
    collections,
    activeCollectionId,
    setActiveCollectionId,
    currentWallpaper,
    settings,
    updateSettings,
    schedulerRunning,
    toggleScheduler,
    rotateNext,
    refreshHistory,
    glassTheme,
  } = useWallpaper();

  const isWhitish = glassTheme === 'whitish';

  const [isRotatingNow, setIsRotatingNow] = useState(false);
  const [rotationStatusMsg, setRotationStatusMsg] = useState<string | null>(null);

  const activeCol = collections.find(c => c.id === activeCollectionId) || collections[0];

  const intervalOptions = [
    { label: '15 minutes (Standard)', value: 15 },
    { label: '30 minutes', value: 30 },
    { label: '1 hour', value: 60 },
    { label: '6 hours', value: 360 },
    { label: '12 hours', value: 720 },
    { label: '24 hours', value: 1440 },
    { label: '1 minute (Fast Demo)', value: 1 },
  ];

  const handleRotateNow = async () => {
    setIsRotatingNow(true);
    setRotationStatusMsg(null);
    try {
      await rotateNext(true);
      await refreshHistory();
      setRotationStatusMsg('Rotated to next wallpaper successfully');
      setTimeout(() => setRotationStatusMsg(null), 3000);
    } catch (err: any) {
      setRotationStatusMsg(err?.message || 'Rotation failed');
    } finally {
      setIsRotatingNow(false);
    }
  };

  const handleIntervalChange = (mins: number) => {
    updateSettings({ rotationIntervalMinutes: mins });
    electronBridge.setRotationConfig({ intervalMinutes: mins }).catch(console.warn);
  };

  const handleShuffleToggle = () => {
    const nextVal = !settings.shuffleEnabled;
    updateSettings({ shuffleEnabled: nextVal });
    electronBridge.setRotationConfig({ shuffle: nextVal }).catch(console.warn);
  };

  const handleSelectCollection = (colId: string) => {
    setActiveCollectionId(colId);
    electronBridge.setRotationConfig({ collectionIds: [colId] }).catch(console.warn);
  };

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      {/* Top Banner: Master Controller */}
      <div
        className={`flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-5 rounded-3xl border shrink-0 transition-all ${
          isWhitish
            ? 'mac-glass-whitish-card border-white/80 text-slate-800'
            : 'mac-glass-blackish-card border-white/15 text-slate-100 specular-sheen'
        }`}
      >
        <div className="flex items-center gap-3.5">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
              schedulerRunning
                ? isWhitish
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800 shadow-xs'
                  : 'bg-emerald-500/20 border-emerald-400/30 text-emerald-300 shadow-md'
                : isWhitish
                ? 'bg-black/5 border-black/10 text-slate-500'
                : 'bg-white/5 border-white/10 text-slate-400'
            }`}
          >
            <RotateCw className={`w-5 h-5 ${schedulerRunning ? 'animate-spin' : ''}`} style={{ animationDuration: '8s' }} />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className={`text-base font-bold tracking-wide ${isWhitish ? 'text-slate-900' : 'text-white'}`}>
                Automatic Wallpaper Rotation
              </h2>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono border font-medium ${
                  schedulerRunning
                    ? isWhitish
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-800'
                      : 'bg-emerald-500/20 border-emerald-400/30 text-emerald-300'
                    : isWhitish
                    ? 'bg-slate-200 border-slate-300 text-slate-600'
                    : 'bg-white/10 border-white/15 text-slate-400'
                }`}
              >
                {schedulerRunning ? 'Active Scheduler' : 'Paused'}
              </span>
            </div>
            <p className={`text-xs mt-0.5 ${isWhitish ? 'text-slate-600' : 'text-slate-400'}`}>
              Seamlessly cycles wallpapers from your active collection in the background using the native OS desktop engine.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleRotateNow}
            disabled={isRotatingNow || !activeCol || activeCol.wallpaperIds.length === 0}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer disabled:opacity-50 ${
              isWhitish
                ? 'bg-white text-slate-900 hover:bg-slate-50 border border-black/10'
                : 'bg-white/15 hover:bg-white/25 text-white border border-white/20'
            }`}
            title="Immediately cycle to the next wallpaper"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>{isRotatingNow ? 'Applying...' : 'Rotate Now'}</span>
          </button>

          <button
            type="button"
            onClick={toggleScheduler}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer ${
              schedulerRunning
                ? isWhitish
                  ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-900 border border-amber-400/40'
                  : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/40'
                : isWhitish
                ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-md'
                : 'bg-white text-slate-950 hover:bg-slate-100 font-bold shadow-md'
            }`}
          >
            {schedulerRunning ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pause Rotation</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Start Rotation</span>
              </>
            )}
          </button>
        </div>
      </div>

      {rotationStatusMsg && (
        <div
          className={`px-4 py-2.5 rounded-xl border text-xs flex items-center gap-2 animate-in fade-in ${
            rotationStatusMsg.includes('fail')
              ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
              : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
          }`}
        >
          <Check className="w-4 h-4" />
          <span>{rotationStatusMsg}</span>
        </div>
      )}

      {/* Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 spans): Configuration & Collection Select */}
        <div className="lg:col-span-2 space-y-5">
          {/* Active Collection Selection */}
          <div
            className={`p-5 rounded-3xl border space-y-3.5 transition-all ${
              isWhitish
                ? 'mac-glass-whitish-card border-white/80'
                : 'mac-glass-blackish-card border-white/15'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className={`text-sm font-bold flex items-center gap-2 ${isWhitish ? 'text-slate-900' : 'text-white'}`}>
                  <FolderHeart className={`w-4 h-4 ${isWhitish ? 'text-indigo-600' : 'text-cyan-300'}`} />
                  <span>Rotation Collection Playlist</span>
                </h3>
                <p className={`text-xs mt-0.5 ${isWhitish ? 'text-slate-500' : 'text-slate-400'}`}>
                  Choose which collection feeds the automatic rotation scheduler
                </p>
              </div>

              <button
                type="button"
                onClick={onOpenCollections}
                className={`text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                  isWhitish ? 'text-slate-800 hover:text-slate-900' : 'text-slate-200 hover:text-white'
                }`}
              >
                <span>Manage Collections</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {collections.length === 0 ? (
              <div
                className={`p-6 text-center rounded-2xl border space-y-2 ${
                  isWhitish ? 'bg-black/5 border-black/8' : 'bg-white/5 border-white/10'
                }`}
              >
                <AlertCircle className="w-6 h-6 text-slate-400 mx-auto" />
                <p className={`text-xs font-semibold ${isWhitish ? 'text-slate-700' : 'text-slate-300'}`}>
                  No collections created yet
                </p>
                <p className={`text-[11px] ${isWhitish ? 'text-slate-500' : 'text-slate-400'}`}>
                  Create a collection from Explore Wallpapers or Collections Manager to start rotation.
                </p>
                <button
                  type="button"
                  onClick={onOpenCollections}
                  className={`mt-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isWhitish
                      ? 'bg-slate-900 hover:bg-slate-800 text-white'
                      : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                  }`}
                >
                  Create Collection
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {collections.map(col => {
                  const isSelected = activeCollectionId === col.id;
                  const count = col.wallpaperIds?.length || 0;

                  return (
                    <div
                      key={col.id}
                      onClick={() => handleSelectCollection(col.id)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? isWhitish
                            ? 'bg-white border-slate-300 shadow-md ring-2 ring-slate-900/10 text-slate-900'
                            : 'bg-white/15 border-white/30 shadow-lg ring-1 ring-white/30 text-white'
                          : isWhitish
                          ? 'bg-white/40 border-black/8 hover:bg-white/80 text-slate-700'
                          : 'bg-white/5 border-white/8 hover:bg-white/10 text-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="font-semibold text-xs truncate">{col.name}</h4>
                          <p className={`text-[11px] truncate mt-0.5 ${isWhitish ? 'text-slate-500' : 'text-slate-400'}`}>
                            {col.description || `${count} wallpapers`}
                          </p>
                        </div>
                        {isSelected && (
                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                              isWhitish ? 'bg-slate-900 text-white' : 'bg-white text-slate-950'
                            }`}
                          >
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </div>

                      <div className="mt-3 pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[11px]">
                        <span className="font-mono text-slate-400 tabular-nums">
                          {count} {count === 1 ? 'wallpaper' : 'wallpapers'}
                        </span>
                        {count === 0 && (
                          <span className="text-amber-500 text-[10px] font-medium">Empty collection</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Timing & Order Settings */}
          <div
            className={`p-5 rounded-3xl border space-y-4 transition-all ${
              isWhitish
                ? 'mac-glass-whitish-card border-white/80'
                : 'mac-glass-blackish-card border-white/15'
            }`}
          >
            <h3 className={`text-sm font-bold flex items-center gap-2 ${isWhitish ? 'text-slate-900' : 'text-white'}`}>
              <Clock className={`w-4 h-4 ${isWhitish ? 'text-indigo-600' : 'text-cyan-300'}`} />
              <span>Rotation Timing & Shuffle Options</span>
            </h3>

            {/* Interval Selector */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className={`font-semibold ${isWhitish ? 'text-slate-800' : 'text-slate-200'}`}>
                  Change Wallpaper Every
                </label>
                <span className={`font-mono font-medium ${isWhitish ? 'text-slate-900' : 'text-white'}`}>
                  {settings.rotationIntervalMinutes} minutes
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                {intervalOptions.map(opt => {
                  const isSelected = settings.rotationIntervalMinutes === opt.value;

                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleIntervalChange(opt.value)}
                      className={`p-2.5 rounded-xl text-left border text-xs font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? isWhitish
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                            : 'bg-white/20 text-white border-white/30 shadow-xs'
                          : isWhitish
                          ? 'bg-black/5 border-black/8 hover:bg-black/10 text-slate-700'
                          : 'bg-white/5 border-white/8 hover:bg-white/10 text-slate-300'
                      }`}
                    >
                      <span className="block truncate">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Toggles */}
            <div className="pt-2 border-t border-black/5 dark:border-white/5 space-y-3">
              {/* Shuffle Mode */}
              <div className="flex items-center justify-between">
                <div>
                  <label className={`font-semibold text-xs flex items-center gap-2 ${isWhitish ? 'text-slate-800' : 'text-slate-200'}`}>
                    <Shuffle className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Shuffle Wallpaper Order</span>
                  </label>
                  <p className={`text-[11px] mt-0.5 ${isWhitish ? 'text-slate-500' : 'text-slate-400'}`}>
                    Randomize wallpaper selection instead of sequential position order
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleShuffleToggle}
                  className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                    settings.shuffleEnabled ? (isWhitish ? 'bg-indigo-600' : 'bg-cyan-500') : (isWhitish ? 'bg-slate-300' : 'bg-slate-700')
                  }`}
                  aria-label="Toggle shuffle"
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      settings.shuffleEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Deduplicate Recent Wallpapers */}
              <div className="flex items-center justify-between">
                <div>
                  <label className={`font-semibold text-xs flex items-center gap-2 ${isWhitish ? 'text-slate-800' : 'text-slate-200'}`}>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Avoid Recent Wallpapers</span>
                  </label>
                  <p className={`text-[11px] mt-0.5 ${isWhitish ? 'text-slate-500' : 'text-slate-400'}`}>
                    Excludes the last {settings.recentHistoryLimit} applied wallpapers from repeating prematurely
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const nextVal = !settings.avoidRecentWallpapers;
                    updateSettings({ avoidRecentWallpapers: nextVal });
                  }}
                  className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                    settings.avoidRecentWallpapers ? (isWhitish ? 'bg-indigo-600' : 'bg-cyan-500') : (isWhitish ? 'bg-slate-300' : 'bg-slate-700')
                  }`}
                  aria-label="Toggle avoid recent"
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      settings.avoidRecentWallpapers ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Desktop Status Card */}
        <div className="space-y-5">
          <div
            className={`p-5 rounded-3xl border space-y-4 transition-all ${
              isWhitish
                ? 'mac-glass-whitish-card border-white/80'
                : 'mac-glass-blackish-card border-white/15'
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className={`text-sm font-bold ${isWhitish ? 'text-slate-900' : 'text-white'}`}>
                Current Desktop
              </h3>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                isWhitish ? 'bg-black/5 border-black/10 text-slate-700' : 'bg-white/10 border-white/15 text-slate-300'
              }`}>
                Live OS
              </span>
            </div>

            {/* Thumbnail */}
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-900 border border-black/10 dark:border-white/15 shadow-md">
              {currentWallpaper?.imageUrl ? (
                <img
                  src={currentWallpaper.imageUrl}
                  alt={currentWallpaper.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">
                  No wallpaper active
                </div>
              )}
            </div>

            {/* Info */}
            <div className="space-y-1">
              <h4 className={`text-sm font-bold truncate ${isWhitish ? 'text-slate-900' : 'text-white'}`}>
                {currentWallpaper?.title || 'System Default'}
              </h4>
              <p className={`text-xs truncate ${isWhitish ? 'text-slate-500' : 'text-slate-400'}`}>
                {currentWallpaper?.sourceCredit || 'AuraDesk Desktop Engine'}
              </p>
            </div>

            <div className={`p-3 rounded-2xl border space-y-2 text-xs ${
              isWhitish ? 'bg-black/5 border-black/8 text-slate-700' : 'bg-white/5 border-white/8 text-slate-300'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400">Scheduler:</span>
                <span className={`font-semibold ${schedulerRunning ? 'text-emerald-500' : 'text-slate-400'}`}>
                  {schedulerRunning ? 'Active' : 'Paused'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400">Target Playlist:</span>
                <span className="font-semibold truncate max-w-[140px] text-right">
                  {activeCol?.name || 'None'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400">Rotation Mode:</span>
                <span className="font-semibold">
                  {settings.shuffleEnabled ? 'Shuffle' : 'Sequential'}
                </span>
              </div>
            </div>

            {onOpenHistory && (
              <button
                type="button"
                onClick={onOpenHistory}
                className={`w-full py-2.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  isWhitish
                    ? 'bg-white/80 hover:bg-white text-slate-800 border-black/10 shadow-xs'
                    : 'bg-white/10 hover:bg-white/15 text-slate-200 border-white/10'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>View Full Rotation History</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

