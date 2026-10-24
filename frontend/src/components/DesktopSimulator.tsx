import React, { useState } from 'react';
import { useWallpaper } from '../context/WallpaperContext';
import {
  Monitor,
  Maximize,
  RotateCw,
  Sliders,
  Download,
  Info,
  Layers,
  Crop,
  Check,
  Folder,
  FileCode,
  HardDrive,
  Image as ImageIcon,
} from 'lucide-react';
import { ScalingMode } from '../types/wallpaper';

export const DesktopSimulator: React.FC = () => {
  const {
    currentWallpaper,
    scalingMode,
    setScalingMode,
    rotateNext,
    currentTimeString,
    activeCollectionId,
    collections,
    activeRuleStatus,
    glassTheme,
  } = useWallpaper();

  const isWhitish = glassTheme === 'whitish';

  const [hoveredDockItem, setHoveredDockItem] = useState<string | null>(null);
  const [showMetaOverlay, setShowMetaOverlay] = useState<boolean>(true);

  const activeCollection = collections.find(c => c.id === activeCollectionId);

  const dockApps = [
    { id: 'finder', name: 'Finder', icon: '🔷', color: 'from-blue-500 to-cyan-400' },
    { id: 'safari', name: 'Safari', icon: '🧭', color: 'from-blue-400 to-indigo-500' },
    { id: 'messages', name: 'Messages', icon: '💬', color: 'from-emerald-400 to-green-500' },
    { id: 'mail', name: 'Mail', icon: '✉️', color: 'from-sky-400 to-blue-600' },
    { id: 'photos', name: 'Photos', icon: '🌸', color: 'from-amber-400 to-rose-500' },
    { id: 'code', name: 'VS Code', icon: '💻', color: 'from-blue-600 to-sky-500' },
    { id: 'terminal', name: 'Terminal', icon: '⌨️', color: 'from-slate-800 to-slate-900' },
    { id: 'auradesk', name: 'AuraDesk', icon: '✨', color: 'from-violet-500 to-fuchsia-500', active: true },
    { id: 'trash', name: 'Trash', icon: '🗑️', color: 'from-slate-400 to-slate-600' },
  ];

  const scalingOptions: { mode: ScalingMode; label: string; desc: string }[] = [
    { mode: 'fill', label: 'Fill Screen', desc: 'Auto-crops to full screen aspect ratio' },
    { mode: 'fit-blur', label: 'Fit with Blur Bleed', desc: 'Signature macOS aesthetic with ambient blurred backdrop' },
    { mode: 'center', label: 'Center Crop', desc: 'Retains native pixel dimensions centered' },
    { mode: 'stretch', label: 'Stretch', desc: 'Scales to exactly fit edges' },
  ];

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Control Toolbar */}
      <div
        className={`flex flex-wrap items-center justify-between gap-4 p-3.5 rounded-2xl border shrink-0 transition-all ${
          isWhitish
            ? 'mac-glass-whitish-card border-white/80 text-slate-800'
            : 'mac-glass-blackish-card border-white/18 text-slate-100 specular-sheen'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-xl border ${
              isWhitish
                ? 'bg-blue-500/15 text-blue-800 border-blue-400/30'
                : 'bg-cyan-500/20 text-cyan-300 border-cyan-400/30'
            }`}
          >
            <Monitor className="w-5 h-5" />
          </div>
          <div>
            <h2 className={`text-sm font-semibold tracking-wide ${isWhitish ? 'text-slate-900' : 'text-white'}`}>
              Live Desktop Canvas
            </h2>
            <p className={`text-xs ${isWhitish ? 'text-slate-500' : 'text-slate-400'}`}>
              Real-time MacBook Pro preview with active scaling, cropping, and dock interaction
            </p>
          </div>
        </div>

        {/* Scaling Mode Segmented Control */}
        <div
          className={`flex items-center gap-1.5 p-1 rounded-xl border ${
            isWhitish ? 'bg-white/60 border-white/80 shadow-xs' : 'bg-black/40 border-white/10'
          }`}
        >
          {scalingOptions.map(opt => (
            <button
              key={opt.mode}
              onClick={() => setScalingMode(opt.mode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                scalingMode === opt.mode
                  ? isWhitish
                    ? 'bg-white text-slate-900 shadow-sm border border-white/90 font-semibold'
                    : 'bg-white/20 text-white shadow-sm border border-white/20'
                  : isWhitish
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-slate-400 hover:text-white'
              }`}
              title={opt.desc}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => rotateNext(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-medium text-white transition-all border border-white/10 active:scale-95"
          >
            <RotateCw className="w-3.5 h-3.5 text-cyan-300" />
            <span>Cycle Next</span>
          </button>
          <button
            onClick={() => setShowMetaOverlay(!showMetaOverlay)}
            className={`p-1.5 rounded-xl text-xs font-medium transition-all border ${
              showMetaOverlay
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/30'
                : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
            }`}
            title="Toggle Wallpaper Specs Overlay"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* MacBook Screen Bezel & Display Viewport */}
      <div className="relative flex-1 min-h-[460px] rounded-3xl bg-slate-950 p-3 shadow-2xl border border-white/15 flex flex-col overflow-hidden">
        {/* Screen Outer Aluminum Border & Webcam Notch */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 w-24 h-3.5 bg-black rounded-b-lg border-b border-white/10 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-slate-900 border border-slate-700/80 flex items-center justify-center">
            <div className="w-0.5 h-0.5 rounded-full bg-emerald-500/60"></div>
          </div>
        </div>

        {/* The Screen Display Surface */}
        <div className="relative flex-1 rounded-2xl overflow-hidden shadow-inner flex flex-col justify-between">
          {/* Wallpaper Layer with chosen Scaling Mode */}
          <div className="absolute inset-0 z-0 overflow-hidden bg-black flex items-center justify-center">
            {scalingMode === 'fill' && (
              <img
                src={currentWallpaper.imageUrl}
                alt={currentWallpaper.title}
                className="w-full h-full object-cover select-none transition-all duration-700 ease-out"
              />
            )}

            {scalingMode === 'fit-blur' && (
              <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                {/* Background blurred bleed */}
                <img
                  src={currentWallpaper.imageUrl}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-70"
                />
                <div className="absolute inset-0 bg-black/30 backdrop-blur-xs"></div>
                {/* Foreground uncropped fit image */}
                <img
                  src={currentWallpaper.imageUrl}
                  alt={currentWallpaper.title}
                  className="relative z-10 max-w-[85%] max-h-[85%] object-contain rounded-xl shadow-2xl border border-white/20 select-none transition-all duration-500"
                />
              </div>
            )}

            {scalingMode === 'center' && (
              <div className="w-full h-full flex items-center justify-center bg-slate-950">
                <img
                  src={currentWallpaper.imageUrl}
                  alt={currentWallpaper.title}
                  className="max-w-[70%] max-h-[70%] object-contain rounded-lg shadow-2xl select-none"
                />
              </div>
            )}

            {scalingMode === 'stretch' && (
              <img
                src={currentWallpaper.imageUrl}
                alt={currentWallpaper.title}
                className="w-full h-full object-fill select-none transition-all duration-500"
              />
            )}
          </div>

          {/* Desktop Simulated Menu Bar */}
          <div className="relative z-20 w-full h-7 bg-black/40 backdrop-blur-md border-b border-white/10 px-4 flex items-center justify-between text-[11px] text-white/90">
            <div className="flex items-center gap-4">
              <span className="font-semibold"></span>
              <span className="font-medium">Finder</span>
              <span className="text-white/60 hover:text-white">File</span>
              <span className="text-white/60 hover:text-white">Edit</span>
              <span className="text-white/60 hover:text-white">View</span>
              <span className="text-white/60 hover:text-white">Go</span>
              <span className="text-white/60 hover:text-white">Window</span>
              <span className="text-white/60 hover:text-white">Help</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] text-cyan-300">
                AuraDesk Active
              </span>
              <span className="font-mono">{currentTimeString}</span>
            </div>
          </div>

          {/* Desktop Desktop Icons (Top-Right / Left) */}
          <div className="relative z-10 p-6 flex justify-between items-start pointer-events-none">
            {/* Left side desktop items */}
            <div className="space-y-4 pointer-events-auto">
              <div className="flex flex-col items-center w-16 p-1.5 rounded-lg hover:bg-white/15 cursor-pointer text-center group">
                <HardDrive className="w-8 h-8 text-slate-300 group-hover:scale-105 transition-transform drop-shadow" />
                <span className="text-[10px] text-white font-medium drop-shadow-md mt-1 leading-tight">
                  Macintosh HD
                </span>
              </div>

              <div className="flex flex-col items-center w-16 p-1.5 rounded-lg hover:bg-white/15 cursor-pointer text-center group">
                <Folder className="w-8 h-8 text-sky-400 group-hover:scale-105 transition-transform drop-shadow" />
                <span className="text-[10px] text-white font-medium drop-shadow-md mt-1 leading-tight">
                  Softablitz 2026
                </span>
              </div>
            </div>

            {/* Right side metadata floating card */}
            {showMetaOverlay && (
              <div className="pointer-events-auto mac-glass-panel-dark p-3.5 rounded-2xl max-w-xs border border-white/15 shadow-xl text-xs space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-cyan-300 uppercase tracking-wider">
                    Current Wallpaper
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {currentWallpaper.width} × {currentWallpaper.height}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white leading-tight">
                  {currentWallpaper.title}
                </h3>
                <p className="text-[11px] text-slate-300">
                  By {currentWallpaper.sourceCredit}
                </p>
                <div className="flex flex-wrap gap-1 pt-1">
                  {currentWallpaper.tags.slice(0, 4).map(tag => (
                    <span
                      key={tag}
                      className="px-1.5 py-0.5 rounded-md bg-white/10 text-[10px] text-slate-300"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-400">
                  <span>Collection: {activeCollection?.name}</span>
                  <span className="capitalize">{currentWallpaper.category}</span>
                </div>
              </div>
            )}
          </div>

          {/* Floating macOS Dock */}
          <div className="relative z-20 pb-3 flex justify-center">
            <div className="flex items-end gap-2 px-3 py-1.5 rounded-2xl bg-white/20 backdrop-blur-2xl border border-white/30 shadow-2xl">
              {dockApps.map(app => {
                const isHovered = hoveredDockItem === app.id;
                return (
                  <div
                    key={app.id}
                    onMouseEnter={() => setHoveredDockItem(app.id)}
                    onMouseLeave={() => setHoveredDockItem(null)}
                    className="relative flex flex-col items-center group cursor-pointer"
                  >
                    {/* Tooltip */}
                    {isHovered && (
                      <div className="absolute -top-8 px-2 py-0.5 rounded-md bg-slate-900/90 text-white text-[10px] whitespace-nowrap shadow-md border border-white/10 pointer-events-none">
                        {app.name}
                      </div>
                    )}
                    {/* App Icon */}
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg shadow-md transition-all duration-150 bg-gradient-to-tr ${app.color} ${
                        isHovered ? '-translate-y-2 scale-125' : 'hover:-translate-y-1'
                      } ${app.active ? 'ring-2 ring-white/50' : ''}`}
                    >
                      <span>{app.icon}</span>
                    </div>
                    {/* Active dot indicator */}
                    {app.active && (
                      <span className="w-1 h-1 rounded-full bg-white mt-1"></span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
