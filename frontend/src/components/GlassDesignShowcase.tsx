import React, { useState } from 'react';
import { useWallpaper } from '../context/WallpaperContext';
import {
  Sparkles,
  Copy,
  Check,
  Folder,
  Download,
  FileText,
  Monitor,
  HardDrive,
  Cloud,
  Share2,
  ChevronRight,
  Circle,
  Triangle,
  Globe,
  Sliders,
  Play,
  ArrowRight,
  Maximize2,
  Layers,
} from 'lucide-react';

export const GlassDesignShowcase: React.FC = () => {
  const { glassTheme, setGlassTheme } = useWallpaper();

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [blurAmount, setBlurAmount] = useState<number>(32);
  const [glassOpacity, setGlassOpacity] = useState<number>(60);
  const [activeFinderItem, setActiveFinderItem] = useState<string>('Downloads');

  const copyCode = (code: string, key: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const isWhitish = glassTheme === 'whitish';

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Top Banner with Quick Switcher */}
      <div
        className={`p-5 rounded-3xl border transition-all duration-300 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
          isWhitish
            ? 'mac-glass-whitish-card border-white/70 text-slate-800'
            : 'mac-glass-blackish-card border-white/18 text-white'
        }`}
      >
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className={`px-2.5 py-0.5 rounded-md text-[10px] font-mono border ${
                isWhitish
                  ? 'bg-black/5 text-slate-700 border-black/10'
                  : 'bg-white/10 text-cyan-300 border-white/15'
              }`}
            >
              Dual Glassmorphic Design Paradigm
            </span>
          </div>
          <h2 className={`text-lg font-bold tracking-tight ${isWhitish ? 'text-slate-900' : 'text-white'}`}>
            Frosted Glass Design System
          </h2>
          <p className={`text-xs max-w-xl ${isWhitish ? 'text-slate-600' : 'text-slate-300'}`}>
            Modeled directly after authentic macOS translucent surfaces: silky whitish frost for light
            environments and deep obsidian glass with specular rim reflections for dark themes.
          </p>
        </div>

        {/* Segmented Mode Selector */}
        <div
          className={`flex items-center p-1 rounded-2xl border ${
            isWhitish ? 'bg-white/80 border-white/90 shadow-sm' : 'bg-black/60 border-white/15'
          }`}
        >
          <button
            onClick={() => setGlassTheme('whitish')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              glassTheme === 'whitish'
                ? 'bg-white text-slate-950 shadow-md border border-black/5'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Whitish Glass (Ref 1)
          </button>
          <button
            onClick={() => setGlassTheme('blackish')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              glassTheme === 'blackish'
                ? 'bg-neutral-800 text-white shadow-md border border-white/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Blackish Dark (Ref 2)
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 1: WHITISH TRANSPARENT GLASSMORPHISM (Reference Image 1)
          ───────────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className={`text-sm font-bold tracking-wide flex items-center gap-2 ${isWhitish ? 'text-slate-900' : 'text-white'}`}>
              <span className="w-2 h-2 rounded-full bg-sky-400"></span>
              Style A: Whitish Transparent Glassmorphism (macOS Finder Frost)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Reference: Translucent white frost with blurred outdoor wallpaper background and rounded pill highlights.
            </p>
          </div>

          <button
            onClick={() =>
              copyCode(
                `/* Whitish Frosted Glass Container */\nbackground: rgba(255, 255, 255, 0.62);\nbackdrop-filter: blur(36px) saturate(190%);\n-webkit-backdrop-filter: blur(36px) saturate(190%);\nborder: 1px solid rgba(255, 255, 255, 0.75);\nbox-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.18), inset 0 1px 2px rgba(255, 255, 255, 0.95);`,
                'whitish-css'
              )
            }
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-medium text-slate-300 transition-colors border border-white/10"
          >
            {copiedKey === 'whitish-css' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>Copy Whitish CSS</span>
          </button>
        </div>

        {/* Whitish macOS Finder Window Simulation with Nature Backdrop */}
        <div className="relative rounded-3xl overflow-hidden p-6 md:p-8 min-h-[420px] flex items-center justify-center border border-white/20 shadow-2xl">
          {/* Alpine Landscape Wallpaper Backdrop (matching Reference Image 1) */}
          <img
            src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1600&q=80"
            alt="Alpine Backdrop"
            className="absolute inset-0 w-full h-full object-cover filter blur-xs scale-105"
          />
          <div className="absolute inset-0 bg-black/10"></div>

          {/* The Translucent Whitish Frosted Glass Finder Window */}
          <div className="relative z-10 w-full max-w-3xl mac-glass-whitish rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row text-slate-800">
            {/* Left Frosted Sidebar */}
            <div className="w-full md:w-64 p-4 border-b md:border-b-0 md:border-r border-white/60 bg-white/35 backdrop-blur-3xl flex flex-col justify-between">
              <div className="space-y-4">
                {/* Traffic lights */}
                <div className="flex items-center gap-2 pb-1">
                  <span className="w-3 h-3 rounded-full bg-rose-500/90 shadow-xs border border-rose-600/40"></span>
                  <span className="w-3 h-3 rounded-full bg-amber-500/90 shadow-xs border border-amber-600/40"></span>
                  <span className="w-3 h-3 rounded-full bg-emerald-500/90 shadow-xs border border-emerald-600/40"></span>
                </div>

                {/* Favourites Section */}
                <div className="space-y-1">
                  <p className="px-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    Favourites
                  </p>

                  {[
                    { id: 'Downloads', label: 'Downloads', icon: Download },
                    { id: 'Documents', label: 'Documents', icon: FileText },
                    { id: 'Desktop', label: 'Desktop', icon: Monitor },
                    { id: 'Applications', label: 'Applications', icon: HardDrive },
                  ].map(item => {
                    const Icon = item.icon;
                    const isSelected = activeFinderItem === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveFinderItem(item.id)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                          isSelected
                            ? 'bg-white/80 text-slate-900 shadow-sm border border-white/90'
                            : 'text-slate-700 hover:text-slate-950 hover:bg-white/40'
                        }`}
                      >
                        <Icon className="w-4 h-4 text-slate-600" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Locations Section */}
                <div className="space-y-1 pt-1">
                  <p className="px-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    Locations
                  </p>
                  <div className="px-3 py-1.5 rounded-xl text-xs text-slate-600 flex items-center gap-2.5 hover:bg-white/40 cursor-pointer">
                    <Cloud className="w-4 h-4 text-slate-500" />
                    <span>iCloud Drive</span>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl text-xs text-slate-600 flex items-center gap-2.5 hover:bg-white/40 cursor-pointer">
                    <HardDrive className="w-4 h-4 text-slate-500" />
                    <span>byJWXN</span>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl text-xs text-slate-600 flex items-center gap-2.5 hover:bg-white/40 cursor-pointer">
                    <Share2 className="w-4 h-4 text-slate-500" />
                    <span>AirDrop</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Frosted Content Viewport */}
            <div className="flex-1 p-5 space-y-4 bg-white/25 backdrop-blur-2xl">
              {/* Header Title with macOS segmented pill navigation */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 p-1 rounded-xl bg-white/60 border border-white/80 shadow-xs">
                  <span className="px-2 py-0.5 text-xs text-slate-700 font-bold">‹</span>
                  <span className="px-2 py-0.5 text-xs text-slate-400">›</span>
                </div>
                <h4 className="text-base font-bold text-slate-900 tracking-tight">Downloads</h4>
              </div>

              {/* Folders Grid matching Reference Image 1 */}
              <div className="space-y-4">
                <p className="text-xs font-semibold text-slate-600">Today</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { name: 'geist-font', items: '6 Items', active: true },
                    { name: 'PulseBoard', items: '12 Items' },
                    { name: 'Atlas_Design', items: '8 Items' },
                  ].map(folder => (
                    <div
                      key={folder.name}
                      className={`p-3 rounded-2xl flex flex-col items-center text-center cursor-pointer transition-all ${
                        folder.active
                          ? 'bg-white/70 shadow-md border border-white/90 scale-102 ring-1 ring-blue-400/40'
                          : 'hover:bg-white/50 border border-transparent'
                      }`}
                    >
                      {/* Signature macOS Blue Folder SVG */}
                      <div className="w-16 h-12 rounded-xl bg-gradient-to-b from-blue-400 to-blue-600 shadow-md relative flex items-center justify-center border-t border-blue-200/60 mb-2">
                        <div className="absolute top-1 left-2 w-5 h-1.5 bg-blue-300 rounded-t-xs"></div>
                      </div>
                      <p className="text-xs font-semibold text-slate-900 truncate max-w-full">
                        {folder.name}
                      </p>
                      <p className="text-[10px] text-blue-600 font-medium">{folder.items}</p>
                    </div>
                  ))}
                </div>

                <p className="text-xs font-semibold text-slate-600 pt-2">Yesterday</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { name: 'AEUX_0.8.2', items: '4 Items' },
                    { name: 'Invoices_2026', items: '48 Items' },
                    { name: 'Liquid_Wallpapers', items: '24 Items' },
                  ].map(folder => (
                    <div
                      key={folder.name}
                      className="p-3 rounded-2xl flex flex-col items-center text-center hover:bg-white/50 border border-transparent cursor-pointer transition-all"
                    >
                      <div className="w-16 h-12 rounded-xl bg-gradient-to-b from-blue-400 to-blue-600 shadow-md relative flex items-center justify-center border-t border-blue-200/60 mb-2">
                        <div className="absolute top-1 left-2 w-5 h-1.5 bg-blue-300 rounded-t-xs"></div>
                      </div>
                      <p className="text-xs font-semibold text-slate-900 truncate max-w-full">
                        {folder.name}
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium">{folder.items}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 2: BLACKISH MODERN DARK GLASSMORPHISM (Reference Image 2)
          ───────────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className={`text-sm font-bold tracking-wide flex items-center gap-2 ${isWhitish ? 'text-slate-900' : 'text-white'}`}>
              <span className="w-2 h-2 rounded-full bg-white"></span>
              Style B: Blackish Modern Dark Glassmorphism (Specular Rim Light)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Reference: Pitch black obsidian backdrop with dark translucent glass, specular white rim arcs, and glossy reflection sheens.
            </p>
          </div>

          <button
            onClick={() =>
              copyCode(
                `/* Blackish Dark Specular Glass Container */\nbackground: rgba(14, 14, 16, 0.72);\nbackdrop-filter: blur(36px) saturate(180%);\n-webkit-backdrop-filter: blur(36px) saturate(180%);\nborder: 1px solid rgba(255, 255, 255, 0.18);\nbox-shadow: 0 30px 70px rgba(0, 0, 0, 0.85), inset 0 1px 1px rgba(255, 255, 255, 0.35);\n/* Specular sheen gradient: linear-gradient(135deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0) 60%) */`,
                'blackish-css'
              )
            }
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-medium text-slate-300 transition-colors border border-white/10"
          >
            {copiedKey === 'blackish-css' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>Copy Blackish CSS</span>
          </button>
        </div>

        {/* Dark Obsidian Surface with Specular Glass Elements matching Image 2 */}
        <div className="relative rounded-3xl overflow-hidden p-6 md:p-10 bg-black border border-white/15 shadow-2xl text-white">
          {/* Subtle dark radial spotlight (pure blackish, no blue!) */}
          <div className="absolute inset-0 bg-radial from-neutral-900/50 via-black to-black pointer-events-none"></div>

          <div className="relative z-10 space-y-6">
            {/* Header Title matching Reference Image 2 */}
            <div className="text-center space-y-1">
              <h4 className="text-xs font-mono tracking-widest text-slate-300 uppercase">
                ‹ GLASSOK / SPECULAR DESIGN USER ELEMENT ›
              </h4>
              <p className="text-[10px] text-slate-500 font-mono">
                CLEAN HIGH-CONTRAST OBSIDIAN GLASS
              </p>
            </div>

            {/* Layout Grid matching Reference Image 2 components */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* Left Column: Glossy Square Card & Pill Buttons */}
              <div className="space-y-4">
                {/* 1. Large Rounded Glossy Glass Card with Left Corner Icons */}
                <div className="relative rounded-3xl p-6 mac-glass-blackish specular-sheen border border-white/25 shadow-2xl min-h-[220px] flex flex-col justify-between group hover:border-white/40 transition-all">
                  {/* Left Column Action Dots */}
                  <div className="space-y-4">
                    <button className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/25 border border-white/30 flex items-center justify-center transition-transform active:scale-90 shadow-sm">
                      <Triangle className="w-3 h-3 text-white fill-white" />
                    </button>
                    <button className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/25 border border-white/30 flex items-center justify-center transition-transform active:scale-90 shadow-sm">
                      <Globe className="w-3 h-3 text-white" />
                    </button>
                    <button className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/25 border border-white/30 flex items-center justify-center transition-transform active:scale-90 shadow-sm">
                      <Circle className="w-2.5 h-2.5 text-white fill-white" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 font-mono pt-4 border-t border-white/10">
                    <span>AuraDesk Obsidian Core</span>
                    <span className="text-white">5K Ready</span>
                  </div>
                </div>

                {/* 2. Three Sleek Pill Buttons matching Reference Image 2 bottom-left */}
                <div className="space-y-2">
                  <div className="w-full flex items-center justify-between px-4 py-2.5 rounded-full mac-glass-blackish specular-sheen border border-white/25 shadow-lg hover:border-white/45 cursor-pointer transition-all group">
                    <div className="flex items-center gap-2.5">
                      <span className="w-3.5 h-3.5 rounded-full bg-white/20 border border-white/40"></span>
                      <span className="text-xs font-medium text-slate-200 group-hover:text-white">
                        Curated Selection Loop
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 group-hover:text-white font-mono">››</span>
                  </div>

                  <div className="w-full flex items-center justify-between px-4 py-2.5 rounded-full mac-glass-blackish specular-sheen border border-white/25 shadow-lg hover:border-white/45 cursor-pointer transition-all group">
                    <div className="flex items-center gap-2.5">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                      <span className="text-xs font-medium text-slate-200 group-hover:text-white">
                        Dynamic Weather Personalization
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 group-hover:text-white font-mono">⚡</span>
                  </div>

                  <div className="w-full flex items-center justify-between px-4 py-2.5 rounded-full mac-glass-blackish specular-sheen border border-white/25 shadow-lg hover:border-white/45 cursor-pointer transition-all group">
                    <div className="flex items-center gap-2.5">
                      <HardDrive className="w-3.5 h-3.5 text-slate-300" />
                      <span className="text-xs font-medium text-slate-200 group-hover:text-white">
                        Persistent Rotation History
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 group-hover:text-white font-mono">✓</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Sleek Specular Buttons & Viewport */}
              <div className="space-y-4">
                {/* 1. Pill Action Box matching Top-Right of Image 2 ("Bndlood") */}
                <div className="p-4 rounded-3xl mac-glass-blackish specular-sheen border border-white/25 shadow-2xl flex items-center justify-between hover:border-white/40 transition-all cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/10 border border-white/30 flex items-center justify-center">
                      <Circle className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div>
                      <h5 className="text-xs font-semibold text-white">Direct Apply Engine</h5>
                      <p className="text-[10px] text-slate-400">One-click wallpaper swap</p>
                    </div>
                  </div>
                  <button className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/30 text-xs font-medium text-white transition-all">
                    Set Active
                  </button>
                </div>

                {/* 2. Glassmorphic Control Pill with Micro Sliders (Image 2 middle-right) */}
                <div className="p-5 rounded-3xl mac-glass-blackish specular-sheen border border-white/25 shadow-2xl space-y-3 hover:border-white/40 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white">Glassromorphic Engine</span>
                    </div>
                    <span className="text-[10px] font-mono text-cyan-300">4K Ultra</span>
                  </div>

                  {/* Micro pill slider controls inside */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1.5 p-1 rounded-full bg-black/60 border border-white/15 text-[10px]">
                      <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white font-medium">Day</span>
                      <span className="px-2.5 py-0.5 rounded-full text-slate-400">Night</span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-400 text-xs font-mono">
                      <span>‹</span>
                      <span className="text-white">~</span>
                      <span>›</span>
                    </div>
                  </div>
                </div>

                {/* 3. Wide Smooth Glass Viewport matching Bottom-Right of Image 2 */}
                <div className="relative rounded-3xl p-6 mac-glass-blackish specular-sheen border border-white/25 shadow-2xl min-h-[140px] flex items-center justify-center text-center overflow-hidden">
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-white tracking-wide">
                      AuraDesk Blackish Obsidian Glass
                    </p>
                    <p className="text-[11px] text-slate-400 max-w-xs">
                      Zero blue tint. Pure neutral dark surfaces with specular edge highlights and
                      Apple-grade optical refraction.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
