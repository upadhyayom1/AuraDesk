import React from 'react';
import { useWallpaper } from '../context/WallpaperContext';
import {
  Sliders,
  X,
  RotateCw,
  Shuffle,
  ShieldCheck,
  Monitor,
  Power,
  Clock,
  Sparkles,
} from 'lucide-react';
import { ScalingMode } from '../types/wallpaper';

interface SettingsModalProps {
  onClose: () => void;
  onOpenTeam: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, onOpenTeam }) => {
  const { settings, updateSettings, scalingMode, setScalingMode, glassTheme, setGlassTheme } = useWallpaper();

  const intervalOptions = [
    { label: '1 minute (Demo)', value: 1 },
    { label: '5 minutes', value: 5 },
    { label: '15 minutes (Standard)', value: 15 },
    { label: '30 minutes', value: 30 },
    { label: '1 hour', value: 60 },
    { label: '6 hours', value: 360 },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div className="w-full max-w-lg mac-glass-panel-dark rounded-3xl p-6 border border-white/20 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-300" />
            <h3 className="text-base font-bold text-white">AuraDesk Preferences</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          {/* Glass Theme Aesthetic Selection */}
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2">
            <label className="text-slate-200 font-semibold flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
              <span>Glassmorphism Style</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setGlassTheme('whitish')}
                className={`p-2.5 rounded-xl text-left border transition-all text-xs font-medium ${
                  glassTheme === 'whitish'
                    ? 'bg-white text-slate-900 border-white shadow-sm'
                    : 'bg-white/5 text-slate-300 border-white/10 hover:text-white'
                }`}
              >
                <span className="font-bold block">Whitish Glass</span>
                <span className="text-[10px] opacity-75 block">macOS Finder Frost (Ref 1)</span>
              </button>

              <button
                type="button"
                onClick={() => setGlassTheme('blackish')}
                className={`p-2.5 rounded-xl text-left border transition-all text-xs font-medium ${
                  glassTheme === 'blackish'
                    ? 'bg-neutral-800 text-white border-white/30 shadow-sm'
                    : 'bg-white/5 text-slate-300 border-white/10 hover:text-white'
                }`}
              >
                <span className="font-bold block">Blackish Dark</span>
                <span className="text-[10px] opacity-75 block">Obsidian Specular Glass (Ref 2)</span>
              </button>
            </div>
          </div>

          {/* Rotation Interval */}
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-slate-200 font-semibold flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-cyan-300" />
                <span>Rotation Interval</span>
              </label>
              <span className="font-mono text-cyan-300 text-xs">
                {settings.rotationIntervalMinutes} min
              </span>
            </div>
            <select
              value={settings.rotationIntervalMinutes}
              onChange={e =>
                updateSettings({ rotationIntervalMinutes: Number(e.target.value) })
              }
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/15 text-white focus:outline-none"
            >
              {intervalOptions.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Shuffle Mode */}
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
            <div>
              <label className="text-slate-200 font-semibold flex items-center gap-2">
                <Shuffle className="w-3.5 h-3.5 text-cyan-300" />
                <span>Shuffle Rotation</span>
              </label>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Randomize wallpaper selection within the active collection
              </p>
            </div>
            <button
              onClick={() => updateSettings({ shuffleEnabled: !settings.shuffleEnabled })}
              className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                settings.shuffleEnabled ? 'bg-cyan-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  settings.shuffleEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Avoid Recent Wallpapers */}
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
            <div>
              <label className="text-slate-200 font-semibold flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-300" />
                <span>Deduplicate Recent Wallpapers</span>
              </label>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Excludes the last {settings.recentHistoryLimit} applied wallpapers from rotation
              </p>
            </div>
            <button
              onClick={() =>
                updateSettings({ avoidRecentWallpapers: !settings.avoidRecentWallpapers })
              }
              className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                settings.avoidRecentWallpapers ? 'bg-cyan-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  settings.avoidRecentWallpapers ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Default Desktop Scaling Mode */}
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2">
            <label className="text-slate-200 font-semibold flex items-center gap-2">
              <Monitor className="w-3.5 h-3.5 text-cyan-300" />
              <span>Default Scaling Engine</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { mode: 'fill', label: 'Fill Screen' },
                { mode: 'fit-blur', label: 'Fit with Blur Bleed' },
                { mode: 'center', label: 'Center Crop' },
                { mode: 'stretch', label: 'Stretch' },
              ].map(opt => (
                <button
                  key={opt.mode}
                  type="button"
                  onClick={() => setScalingMode(opt.mode as ScalingMode)}
                  className={`p-2 rounded-xl text-left border transition-all text-xs font-medium ${
                    scalingMode === opt.mode
                      ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400/40'
                      : 'bg-white/5 text-slate-400 border-white/5 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-white/10 flex items-center justify-between">
          <button
            onClick={() => {
              onClose();
              onOpenTeam();
            }}
            className="text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1.5"
          >
            <span>Softablitz 2026 Team Info →</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white font-medium text-xs transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
