import React from 'react';
import { useWallpaper } from '../context/WallpaperContext';
import {
  Sun,
  Moon,
  Sunset,
  Sunrise,
  CloudRain,
  Cloud,
  CloudLightning,
  Snowflake,
  Wifi,
  BatteryCharging,
  Sliders,
  RotateCw,
  Sparkles,
} from 'lucide-react';

interface MacMenuBarProps {
  onOpenSettings: () => void;
  onOpenTeam: () => void;
}

export const MacMenuBar: React.FC<MacMenuBarProps> = ({ onOpenSettings, onOpenTeam }) => {
  const {
    weatherCondition,
    timeOfDay,
    currentTimeString,
    currentWallpaper,
    rotateNext,
    schedulerRunning,
    secondsRemaining,
    isTrayOpen,
    setIsTrayOpen,
    glassTheme,
    setGlassTheme,
  } = useWallpaper();

  const getWeatherIcon = () => {
    switch (weatherCondition) {
      case 'clear':
        return <Sun className="w-3.5 h-3.5 text-amber-300" />;
      case 'rain':
        return <CloudRain className="w-3.5 h-3.5 text-sky-300" />;
      case 'thunderstorm':
        return <CloudLightning className="w-3.5 h-3.5 text-indigo-300" />;
      case 'snow':
        return <Snowflake className="w-3.5 h-3.5 text-blue-200" />;
      case 'clouds':
      case 'mist':
      default:
        return <Cloud className="w-3.5 h-3.5 text-slate-300" />;
    }
  };

  const getTimeIcon = () => {
    switch (timeOfDay) {
      case 'dawn':
        return <Sunrise className="w-3.5 h-3.5 text-amber-400" />;
      case 'day':
        return <Sun className="w-3.5 h-3.5 text-yellow-300" />;
      case 'goldenHour':
        return <Sunset className="w-3.5 h-3.5 text-orange-400" />;
      case 'night':
      default:
        return <Moon className="w-3.5 h-3.5 text-indigo-300" />;
    }
  };

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <header className="relative w-full h-8 bg-black/40 backdrop-blur-xl border-b border-white/10 text-xs text-white/90 flex items-center justify-between px-3.5 z-40 select-none shadow-sm">
      {/* Left Apple Menu & App Menu */}
      <div className="flex items-center gap-4">
        {/* Apple Logo SVG */}
        <button
          onClick={onOpenTeam}
          className="flex items-center justify-center text-white/90 hover:text-white transition-opacity"
          title="About AuraDesk (Softablitz 2026 Team 220)"
          aria-label="Apple menu"
        >
          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 170 170">
            <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.65-7.79-11.87-14.26-6.04-9.28-10.87-20.15-14.49-32.61-3.61-12.45-5.42-24.16-5.42-35.13 0-14.39 3.56-26.24 10.68-35.54 7.12-9.3 16.03-14.07 26.74-14.31 5.38 0 11.22 1.48 17.52 4.44 6.3 2.96 10.15 4.51 11.55 4.65 1.58-.2 5.68-1.78 12.3-4.73 6.63-2.96 12.39-4.27 17.29-3.95 13.06.84 23.36 5.86 30.9 15.06-11.5 6.98-17.14 16.63-16.92 28.94.21 9.8 4.04 17.95 11.48 24.44 7.44 6.49 16.34 10.18 26.7 11.08-2.3 6.87-5.19 14.15-8.68 21.84zM119.22 33.64c0-7.39 2.65-14.32 7.95-20.79 5.3-6.47 11.89-10.75 19.78-12.85.95 7.82-1.39 15.17-7.03 22.04-5.63 6.87-12.53 10.75-20.7 11.6z"/>
          </svg>
        </button>

        {/* AuraDesk Menu items */}
        <span className="font-semibold text-white tracking-wide">AuraDesk</span>
        <button
          onClick={onOpenSettings}
          className="text-white/75 hover:text-white transition-colors"
        >
          Preferences
        </button>
        <button
          onClick={onOpenTeam}
          className="text-white/75 hover:text-white transition-colors"
        >
          Team 220
        </button>
        <button
          onClick={() => rotateNext(true)}
          className="text-white/75 hover:text-white transition-colors flex items-center gap-1.5"
          title="Rotate to next wallpaper (⌘N)"
        >
          <span>Next Wallpaper</span>
          <span className="text-[10px] text-white/50 bg-white/10 px-1 rounded">⌘N</span>
        </button>
      </div>

      {/* Right System Tray Icons & Status */}
      <div className="flex items-center gap-3">
        {/* Glass Theme Switcher: Whitish Glass (Image 1) vs Blackish Dark (Image 2) */}
        <div className="flex items-center p-0.5 rounded-lg bg-black/40 border border-white/15 text-[11px]">
          <button
            onClick={() => setGlassTheme('whitish')}
            className={`px-2 py-0.5 rounded-md transition-all font-medium flex items-center gap-1 ${
              glassTheme === 'whitish'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-white/70 hover:text-white'
            }`}
            title="Whitish Transparent macOS Glassmorphism (Reference 1)"
          >
            <span>Whitish Glass</span>
          </button>
          <button
            onClick={() => setGlassTheme('blackish')}
            className={`px-2 py-0.5 rounded-md transition-all font-medium flex items-center gap-1 ${
              glassTheme === 'blackish'
                ? 'bg-neutral-800 text-white border border-white/20 shadow-sm'
                : 'text-white/70 hover:text-white'
            }`}
            title="Blackish Modern Dark Glassmorphism (Reference 2)"
          >
            <span>Blackish Glass</span>
          </button>
        </div>

        {/* Dynamic Context Pill: Weather & Time */}
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/10 border border-white/10 text-white/90">
          {getWeatherIcon()}
          <span className="capitalize">{weatherCondition}</span>
          <span className="text-white/40">·</span>
          {getTimeIcon()}
          <span className="capitalize">{timeOfDay}</span>
        </div>

        {/* Rotation countdown badge */}
        <div
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] ${
            schedulerRunning
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
              : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
          }`}
          title={schedulerRunning ? `Auto-rotation in ${formatCountdown(secondsRemaining)}` : 'Scheduler Paused'}
        >
          <RotateCw className={`w-3 h-3 ${schedulerRunning ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }} />
          <span className="font-mono tabular-nums">{schedulerRunning ? formatCountdown(secondsRemaining) : 'Paused'}</span>
        </div>

        {/* System tray icon to open AuraDesk quick flyout */}
        <button
          onClick={() => setIsTrayOpen(!isTrayOpen)}
          className={`flex items-center justify-center p-1 rounded-md transition-all ${
            isTrayOpen ? 'bg-white/25 text-white' : 'text-white/80 hover:text-white hover:bg-white/10'
          }`}
          title="AuraDesk System Tray Menu"
          aria-label="AuraDesk System Tray"
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
        </button>

        <Wifi className="w-3.5 h-3.5 text-white/80" />
        <BatteryCharging className="w-4 h-4 text-emerald-400" />

        {/* System Clock */}
        <span className="font-medium text-white/95 tracking-wider font-mono tabular-nums pl-1">
          {currentTimeString}
        </span>
      </div>
    </header>
  );
};
