import React, { useState } from 'react';
import { WallpaperProvider, useWallpaper } from './context/WallpaperContext';
import { MacMenuBar } from './components/MacMenuBar';
import { MacSidebar, ActiveTab } from './components/MacSidebar';
import { MacTrayMenu } from './components/MacTrayMenu';
import { DesktopSimulator } from './components/DesktopSimulator';
import { WallpaperDiscovery } from './components/WallpaperDiscovery';
import { CollectionsView } from './components/CollectionsView';
import { ContextRulesView } from './components/ContextRulesView';
import { CalendarSchedulerView } from './components/CalendarSchedulerView';
import { HistoryTrayView } from './components/HistoryTrayView';
import { GlassDesignShowcase } from './components/GlassDesignShowcase';
import { SettingsModal } from './components/SettingsModal';
import { TeamInfoModal } from './components/TeamInfoModal';
import { AddCustomWallpaperModal } from './components/AddCustomWallpaperModal';

const AuraDeskApp: React.FC = () => {
  const { currentWallpaper, isTrayOpen, setIsTrayOpen, glassTheme } = useWallpaper();

  const [activeTab, setActiveTab] = useState<ActiveTab>('discovery');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isAddCustomOpen, setIsAddCustomOpen] = useState(false);
  const [isWindowMinimized, setIsWindowMinimized] = useState(false);

  const isWhitish = glassTheme === 'whitish';

  return (
    <div
      className={`relative w-screen h-screen overflow-hidden flex flex-col font-sans select-none transition-colors duration-500 ${
        isWhitish ? 'bg-slate-200 text-slate-900' : 'bg-black text-slate-100'
      }`}
    >
      {/* Dynamic Ambient Desktop Backdrop (renders current wallpaper with blur and subtle motion) */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <img
          src={currentWallpaper.imageUrl}
          alt=""
          aria-hidden="true"
          className={`w-full h-full object-cover filter blur-3xl scale-110 transition-all duration-1000 ease-out ${
            isWhitish ? 'opacity-65' : 'opacity-25'
          }`}
        />
        {/* Subtle vignette layer (neutral, no blue) */}
        <div
          className={`absolute inset-0 ${
            isWhitish
              ? 'bg-radial from-transparent via-white/20 to-slate-200/60'
              : 'bg-radial from-transparent via-black/50 to-neutral-950'
          }`}
        ></div>
      </div>

      {/* macOS Top Menu Bar */}
      <MacMenuBar
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenTeam={() => setIsTeamModalOpen(true)}
      />

      {/* macOS System Tray Flyout Menu (when opened) */}
      {isTrayOpen && (
        <MacTrayMenu
          onOpenAppWindow={() => {
            setIsWindowMinimized(false);
            setIsTrayOpen(false);
          }}
          onOpenSettings={() => {
            setIsSettingsOpen(true);
            setIsTrayOpen(false);
          }}
        />
      )}

      {/* Main macOS Application Workspace Window */}
      <main className="relative z-10 flex-1 p-3 md:p-6 flex items-center justify-center overflow-hidden">
        {isWindowMinimized ? (
          /* Minimized State: Floating Quick Dock Pill */
          <div
            className={`px-6 py-4 rounded-3xl shadow-2xl flex items-center gap-4 animate-in fade-in zoom-in-95 border ${
              isWhitish
                ? 'mac-glass-whitish border-white/80 text-slate-900'
                : 'mac-glass-blackish border-white/20 text-white'
            }`}
          >
            <img
              src={currentWallpaper.imageUrl}
              alt=""
              className="w-10 h-10 rounded-xl object-cover border border-white/40 shadow-sm"
            />
            <div>
              <p className={`text-xs font-mono ${isWhitish ? 'text-cyan-700' : 'text-cyan-300'}`}>
                AuraDesk Minimized to Tray
              </p>
              <p className={`text-sm font-semibold ${isWhitish ? 'text-slate-900' : 'text-white'}`}>
                {currentWallpaper.title}
              </p>
            </div>
            <button
              onClick={() => setIsWindowMinimized(false)}
              className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ml-2 border ${
                isWhitish
                  ? 'bg-white/80 hover:bg-white text-slate-900 border-white/90 shadow-sm'
                  : 'bg-white/20 hover:bg-white/30 text-white border-white/20'
              }`}
            >
              Restore Window
            </button>
          </div>
        ) : (
          /* Full macOS Frosted Glass Window Frame */
          <div
            className={`relative w-full h-full max-w-7xl rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row transition-all duration-300 ${
              isWhitish
                ? 'mac-glass-whitish border border-white/75'
                : 'mac-glass-blackish specular-sheen border border-white/18'
            }`}
          >
            {/* Left Glass Sidebar */}
            <MacSidebar
              activeTab={activeTab}
              onSelectTab={setActiveTab}
              onOpenNewWallpaperModal={() => setIsAddCustomOpen(true)}
              onOpenSettings={() => setIsSettingsOpen(true)}
              onOpenTeam={() => setIsTeamModalOpen(true)}
            />

            {/* Right Main Content Viewport */}
            <div
              className={`flex-1 h-full flex flex-col overflow-hidden ${
                isWhitish ? 'bg-white/15' : 'bg-black/25'
              }`}
            >
              {/* Window Header Titlebar & Tab Breadcrumb */}
              <div
                className={`h-12 px-6 flex items-center justify-between text-xs shrink-0 backdrop-blur-md border-b ${
                  isWhitish
                    ? 'border-black/8 bg-white/40 text-slate-700'
                    : 'border-white/10 bg-white/5 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`font-semibold capitalize ${isWhitish ? 'text-slate-900' : 'text-white'}`}>
                    {activeTab === 'discovery' && 'Explore 5K & 4K Wallpapers'}
                    {activeTab === 'desktop' && 'Live Desktop Simulation & Display Engine'}
                    {activeTab === 'collections' && 'Collection Manager & Playlists'}
                    {activeTab === 'context-rules' && 'Personalization & Context Rules'}
                    {activeTab === 'calendar' && 'Calendar Event Automation'}
                    {activeTab === 'history' && 'Rotation History & Instant Rollback'}
                    {activeTab === 'glass-design' && 'MacBook Frosted Glass UI Design System'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-mono ${isWhitish ? 'text-slate-500' : 'text-slate-400'}`}>
                    AuraDesk · Softablitz 2026 Team 220
                  </span>
                </div>
              </div>

              {/* Scrollable Main Content Surface */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6">
                {activeTab === 'discovery' && (
                  <WallpaperDiscovery
                    onPreviewOnDesktop={() => setActiveTab('desktop')}
                    onOpenAddCustom={() => setIsAddCustomOpen(true)}
                  />
                )}
                {activeTab === 'desktop' && <DesktopSimulator />}
                {activeTab === 'collections' && (
                  <CollectionsView onOpenAddCustom={() => setIsAddCustomOpen(true)} />
                )}
                {activeTab === 'context-rules' && <ContextRulesView />}
                {activeTab === 'calendar' && <CalendarSchedulerView />}
                {activeTab === 'history' && <HistoryTrayView />}
                {activeTab === 'glass-design' && <GlassDesignShowcase />}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Global Modals */}
      {isSettingsOpen && (
        <SettingsModal
          onClose={() => setIsSettingsOpen(false)}
          onOpenTeam={() => {
            setIsSettingsOpen(false);
            setIsTeamModalOpen(true);
          }}
        />
      )}

      {isTeamModalOpen && <TeamInfoModal onClose={() => setIsTeamModalOpen(false)} />}

      {isAddCustomOpen && (
        <AddCustomWallpaperModal onClose={() => setIsAddCustomOpen(false)} />
      )}
    </div>
  );
};

export default function App() {
  return (
    <WallpaperProvider>
      <AuraDeskApp />
    </WallpaperProvider>
  );
}
