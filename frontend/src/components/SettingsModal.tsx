import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useWallpaper } from '../context/WallpaperContext';
import {
  Sliders,
  X,
  Shuffle,
  ShieldCheck,
  Monitor,
  Power,
  Clock,
  Sparkles,
  MapPin,
  Globe,
  Check,
} from 'lucide-react';
import { ScalingMode } from '../types/wallpaper';
import { electronBridge } from '../services/electronBridge';

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const { settings, updateSettings, scalingMode, setScalingMode, glassTheme, setGlassTheme } = useWallpaper();

  const isWhitish = glassTheme === 'whitish';

  const [cityInput, setCityInput] = useState<string>(settings.location?.city || '');
  const [isSavingCity, setIsSavingCity] = useState(false);
  const [citySavedNotice, setCitySavedNotice] = useState(false);

  const intervalOptions = [
    { label: '1 minute', value: 1 },
    { label: '15 minutes (Standard)', value: 15 },
    { label: '30 minutes', value: 30 },
    { label: '1 hour', value: 60 },
    { label: '6 hours', value: 360 },
    { label: '12 hours', value: 720 },
    { label: '24 hours', value: 1440 },
  ];

  const handleSaveCity = async () => {
    if (!cityInput.trim()) return;
    setIsSavingCity(true);
    try {
      await electronBridge.setWeatherLocation({ city: cityInput.trim() });
      updateSettings({
        location: {
          ...settings.location,
          city: cityInput.trim()
        }
      });
      setCitySavedNotice(true);
      setTimeout(() => setCitySavedNotice(false), 2500);
    } catch (err) {
      console.warn('[SettingsModal] Failed to set location:', err);
    } finally {
      setIsSavingCity(false);
    }
  };

  const modalContent = (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 transition-all ${isWhitish ? 'mac-modal-light border-black/10' : 'mac-modal-dark border-white/15'
          }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between pb-3 border-b ${isWhitish ? 'border-black/8' : 'border-white/10'}`}>
          <div className="flex items-center gap-2">
            <Sliders className={`w-4 h-4 ${isWhitish ? 'text-indigo-600' : 'text-cyan-300'}`} />
            <h3 className={`text-base font-bold ${isWhitish ? 'text-slate-900' : 'text-white'}`}>
              AuraDesk Preferences
            </h3>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded-lg transition-colors ${isWhitish ? 'text-slate-400 hover:text-slate-800 hover:bg-black/5' : 'text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            aria-label="Close preferences"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          {/* Glass Theme Aesthetic Selection */}
          <div className={`p-3.5 rounded-2xl border space-y-2 ${isWhitish ? 'bg-black/5 border-black/10' : 'bg-white/5 border-white/10'}`}>
            <label className={`font-semibold flex items-center gap-2 ${isWhitish ? 'text-slate-800' : 'text-slate-200'}`}>
              <Sparkles className={`w-3.5 h-3.5 ${isWhitish ? 'text-indigo-600' : 'text-cyan-300'}`} />
              <span>Appearance & Theme</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setGlassTheme('blackish')}
                className={`p-2.5 rounded-xl text-left border transition-all text-xs font-medium cursor-pointer ${!isWhitish
                  ? 'bg-neutral-800 text-white border-white/30 shadow-md ring-1 ring-cyan-400/30'
                  : 'bg-white/40 text-slate-700 border-black/10 hover:bg-white/70'
                  }`}
              >
                <span className="font-bold block">Obsidian Dark</span>
                <span className={`text-[10px] block ${!isWhitish ? 'text-slate-300' : 'text-slate-500'}`}>
                  Deep charcoal dark surface
                </span>
              </button>

              <button
                type="button"
                onClick={() => setGlassTheme('whitish')}
                className={`p-2.5 rounded-xl text-left border transition-all text-xs font-medium cursor-pointer ${isWhitish
                  ? 'bg-white text-slate-900 border-white shadow-md ring-1 ring-blue-500/30'
                  : 'bg-white/5 text-slate-300 border-white/10 hover:text-white'
                  }`}
              >
                <span className="font-bold block">Frosted Light</span>
                <span className={`text-[10px] block ${isWhitish ? 'text-slate-500' : 'text-slate-400'}`}>
                  Clean light neutral surface
                </span>
              </button>
            </div>
          </div>

          {/* Default Scaling Engine */}
          <div className={`p-3.5 rounded-2xl border space-y-2 ${isWhitish ? 'bg-black/5 border-black/10' : 'bg-white/5 border-white/10'}`}>
            <label className={`font-semibold flex items-center gap-2 ${isWhitish ? 'text-slate-800' : 'text-slate-200'}`}>
              <Monitor className={`w-3.5 h-3.5 ${isWhitish ? 'text-indigo-600' : 'text-cyan-300'}`} />
              <span>Wallpaper Scaling & Fitting</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { mode: 'fill', label: 'Cover / Scale' },
                { mode: 'fit-blur', label: 'Fit with Blur Bleed' },
                { mode: 'center', label: 'Center Crop' },
                { mode: 'stretch', label: 'Stretch' },
              ].map(opt => (
                <button
                  key={opt.mode}
                  type="button"
                  onClick={() => setScalingMode(opt.mode as ScalingMode)}
                  className={`p-2 rounded-xl text-left border transition-all text-xs font-semibold cursor-pointer ${
                    scalingMode === opt.mode
                      ? isWhitish
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white/20 text-white border-white/30 shadow-xs'
                      : isWhitish
                      ? 'bg-white/40 text-slate-700 border-black/8 hover:text-slate-900'
                      : 'bg-white/5 text-slate-400 border-white/8 hover:text-white'
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Weather Location Settings */}
          <div className={`p-3.5 rounded-2xl border space-y-2 ${isWhitish ? 'bg-black/5 border-black/10' : 'bg-white/5 border-white/10'}`}>
            <div className="flex items-center justify-between">
              <label className={`font-semibold flex items-center gap-2 ${isWhitish ? 'text-slate-800' : 'text-slate-200'}`}>
                <MapPin className={`w-3.5 h-3.5 ${isWhitish ? 'text-indigo-600' : 'text-cyan-300'}`} />
                <span>Weather Location</span>
              </label>
              {citySavedNotice && (
                <span className="text-[10px] text-emerald-500 font-medium flex items-center gap-1">
                  <Check className="w-3 h-3" /> Saved
                </span>
              )}
            </div>
            <p className={`text-[11px] ${isWhitish ? 'text-slate-500' : 'text-slate-400'}`}>
              Enter your city to feed weather-based context rules (OpenWeatherMap)
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={cityInput}
                onChange={e => setCityInput(e.target.value)}
                placeholder="e.g. San Francisco, Tokyo, London"
                className={`flex-1 px-3 py-2 rounded-xl border text-xs focus:outline-none transition-all ${isWhitish
                  ? 'bg-white border-black/15 text-slate-900 focus:border-indigo-600'
                  : 'bg-black/30 border-white/15 text-white focus:border-cyan-400'
                  }`}
              />
              <button
                type="button"
                onClick={handleSaveCity}
                disabled={isSavingCity || !cityInput.trim()}
                className={`px-3 py-2 rounded-xl font-medium transition-all text-xs cursor-pointer disabled:opacity-50 ${isWhitish
                  ? 'bg-slate-900 text-white hover:bg-slate-800'
                  : 'bg-white/15 hover:bg-white/25 text-white'
                  }`}
              >
                {isSavingCity ? 'Saving...' : 'Update'}
              </button>
            </div>
          </div>

          {/* Launch on Startup */}
          <div className={`p-3.5 rounded-2xl border flex items-center justify-between ${isWhitish ? 'bg-black/5 border-black/10' : 'bg-white/5 border-white/10'}`}>
            <div>
              <label className={`font-semibold flex items-center gap-2 ${isWhitish ? 'text-slate-800' : 'text-slate-200'}`}>
                <Power className={`w-3.5 h-3.5 ${isWhitish ? 'text-indigo-600' : 'text-cyan-300'}`} />
                <span>Launch on System Login</span>
              </label>
              <p className={`text-[11px] mt-0.5 ${isWhitish ? 'text-slate-500' : 'text-slate-400'}`}>
                Automatically start AuraDesk minimized to menu bar on login
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const nextVal = !settings.launchOnStartup;
                updateSettings({ launchOnStartup: nextVal });
                electronBridge.saveSettings({ launchOnStartup: nextVal }).catch(console.warn);
              }}
              className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${settings.launchOnStartup ? (isWhitish ? 'bg-indigo-600' : 'bg-cyan-500') : (isWhitish ? 'bg-slate-300' : 'bg-slate-700')
                }`}
              aria-label="Toggle launch on login"
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${settings.launchOnStartup ? 'translate-x-5' : 'translate-x-0'
                  }`}
              />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className={`pt-3 border-t flex items-center justify-end ${isWhitish ? 'border-black/8' : 'border-white/10'}`}>
          <button
            onClick={onClose}
            className={`px-5 py-2 rounded-xl font-medium text-xs transition-all cursor-pointer ${isWhitish
              ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-sm'
              : 'bg-white/20 hover:bg-white/30 text-white shadow-sm'
              }`}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
