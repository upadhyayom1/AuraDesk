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
import { Sun, Moon, Minus, X } from 'lucide-react';

const AuraDeskApp: React.FC = () => {
  const {
    currentWallpaper,
    isTrayOpen,
    setIsTrayOpen,
    glassTheme,
    setGlassTheme,
    minimizeAppToTray,
    quitApplication,
    isNativeElectron,
  } = useWallpaper();

  const [activeTab, setActiveTab] = useState<ActiveTab>('discovery');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isAddCustomOpen, setIsAddCustomOpen] = useState(false);
  const [isWindowMinimized, setIsWindowMinimized] = useState(false);

  const isWhitish = glassTheme === 'whitish';

  return (
    <div
      className={`relative w-screen h-screen overflow-hidden flex flex-row font-sans select-none transition-colors duration-500 ${
        isWhitish ? 'bg-slate-100 text-slate-900' : 'bg-[#090d16] text-slate-100'
      }`}
    >
      {/* Dynamic Ambient Desktop Backdrop (renders current wallpaper with blur and subtle motion) */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <img
          src={currentWallpaper.imageUrl}
          alt=""
          aria-hidden="true"
          className={`w-full h-full object-cover filter blur-3xl scale-110 transition-all duration-1000 ease-out ${
            isWhitish ? 'opacity-35' : 'opacity-15'
          }`}
        />
        {/* Subtle vignette layer */}
        <div
          className={`absolute inset-0 ${
            isWhitish
              ? 'bg-radial from-transparent via-white/30 to-slate-100/70'
              : 'bg-radial from-transparent via-black/40 to-[#070b13]'
          }`}
        ></div>
      </div>

      {/* Edge-to-Edge Left Glass Sidebar with Native Traffic Light Inset */}
      <MacSidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenNewWallpaperModal={() => setIsAddCustomOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenTeam={() => setIsTeamModalOpen(true)}
      />

      {/* Edge-to-Edge Right Main Content Viewport */}
      <div
        className={`relative z-10 flex-1 h-full flex flex-col overflow-hidden ${
          isWhitish ? 'bg-white/30' : 'bg-black/20'
        }`}
      >
        {/* macOS Native Window Titlebar Region (draggable, integrated status & tools) */}
        <header
          className={`h-11 px-6 flex items-center justify-between text-xs shrink-0 backdrop-blur-md border-b app-drag ${
            isWhitish
              ? 'border-black/8 bg-white/50 text-slate-700'
              : 'border-white/10 bg-white/5 text-slate-300'
          }`}
        >
          <div className="flex items-center gap-2 app-no-drag">
            <span className={`font-semibold capitalize text-sm tracking-wide ${isWhitish ? 'text-slate-900' : 'text-white'}`}>
              {activeTab === 'discovery' && 'Explore 5K & 4K Wallpapers'}
              {activeTab === 'desktop' && 'Live Desktop Simulation & Display Engine'}
              {activeTab === 'collections' && 'Collection Manager & Playlists'}
              {activeTab === 'context-rules' && 'Personalization & Context Rules'}
              {activeTab === 'calendar' && 'Calendar Event Automation'}
              {activeTab === 'history' && 'Rotation History & Instant Rollback'}
              {activeTab === 'glass-design' && 'MacBook Frosted Glass UI Design System'}
            </span>
          </div>

          <div className="flex items-center gap-2.5 app-no-drag">
            {/* Quick Switch to Light / Dark Mode Button */}
            <button
              type="button"
              onClick={() => setGlassTheme(isWhitish ? 'blackish' : 'whitish')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium transition-all shadow-xs cursor-pointer ${
                isWhitish
                  ? 'bg-white/90 hover:bg-white text-slate-800 border-slate-300/80 hover:border-slate-400 shadow-slate-200/50'
                  : 'bg-white/10 hover:bg-white/15 text-slate-200 border-white/20 hover:border-white/30'
              }`}
              title={isWhitish ? 'Switch to Dark Mode (Obsidian Glass)' : 'Switch to Light Mode (Frosted Glass)'}
              aria-label={isWhitish ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            >
              {isWhitish ? (
                <>
                  <Moon className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Dark Mode</span>
                </>
              ) : (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />
                  <span>Light Mode</span>
                </>
              )}
            </button>

            <span className={`text-[11px] font-mono px-2.5 py-0.5 rounded-full border ${
              isWhitish ? 'border-slate-300 text-slate-600 bg-white/60' : 'border-white/15 text-slate-400 bg-white/5'
            }`}>
              AuraDesk · Softablitz 2026 Team 220
            </span>

            {/* Electron Window Actions if running as native desktop app */}
            {isNativeElectron && (
              <div className={`flex items-center gap-1 pl-2 border-l ${isWhitish ? 'border-slate-300' : 'border-white/15'}`}>
                <button
                  type="button"
                  onClick={minimizeAppToTray}
                  className={`p-1.5 rounded-md transition-colors ${
                    isWhitish ? 'hover:bg-black/5 text-slate-600' : 'hover:bg-white/10 text-slate-400'
                  }`}
                  title="Minimize to Tray"
                  aria-label="Minimize"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={quitApplication}
                  className={`p-1.5 rounded-md transition-colors ${
                    isWhitish ? 'hover:bg-rose-500/10 hover:text-rose-600 text-slate-600' : 'hover:bg-rose-500/20 hover:text-rose-400 text-slate-400'
                  }`}
                  title="Quit AuraDesk"
                  aria-label="Quit"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </header>

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
