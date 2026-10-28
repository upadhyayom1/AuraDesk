import React, { useState } from 'react';
import { WallpaperProvider, useWallpaper } from './context/WallpaperContext';
import { MacSidebar, ActiveTab } from './components/MacSidebar';
import { MacTrayMenu } from './components/MacTrayMenu';
import { WallpaperDiscovery } from './components/WallpaperDiscovery';
import { CollectionsView } from './components/CollectionsView';
import { HistoryTrayView } from './components/HistoryTrayView';
import { RotationView } from './components/RotationView';
import { PersonalizationView } from './components/PersonalizationView';
import { SettingsModal } from './components/SettingsModal';
import { AddCustomWallpaperModal } from './components/AddCustomWallpaperModal';
import { Sun, Moon } from 'lucide-react';

const AuraDeskApp: React.FC = () => {
  const {
    currentWallpaper,
    isTrayOpen,
    setIsTrayOpen,
    glassTheme,
    setGlassTheme,
    isNativeElectron,
  } = useWallpaper();

  const [activeTab, setActiveTab] = useState<ActiveTab>('discovery');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAddCustomOpen, setIsAddCustomOpen] = useState(false);

  const isWhitish = glassTheme === 'whitish';

  return (
    <div
      className={`relative w-screen h-screen overflow-hidden flex flex-row font-sans select-none transition-colors duration-500 ${isWhitish ? 'bg-slate-100 text-slate-900' : 'bg-[#090d16] text-slate-100'
        }`}
    >
      {/* Dynamic Ambient Desktop Backdrop (renders current wallpaper with blur and subtle motion) */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <img
          src={currentWallpaper.imageUrl}
          alt=""
          aria-hidden="true"
          className={`w-full h-full object-cover filter blur-3xl scale-110 transition-all duration-1000 ease-out ${isWhitish ? 'opacity-35' : 'opacity-15'
            }`}
        />
        {/* Subtle vignette layer */}
        <div
          className={`absolute inset-0 ${isWhitish
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
      />

      {/* Edge-to-Edge Right Main Content Viewport */}
      <div
        className={`relative z-10 flex-1 h-full flex flex-col overflow-hidden ${isWhitish ? 'bg-white/30' : 'bg-black/20'
          }`}
      >
        {/* macOS Native Window Titlebar Region (draggable, integrated status & tools) */}
        <header
          className={`h-11 px-6 flex items-center justify-between text-xs shrink-0 backdrop-blur-md border-b app-drag ${isWhitish
            ? 'border-black/8 bg-white/50 text-slate-700'
            : 'border-white/10 bg-white/5 text-slate-300'
            }`}
        >
          <div className="flex items-center gap-2 app-no-drag">
            <span
              key={activeTab}
              className={`mac-view-transition font-semibold capitalize text-sm tracking-wide ${isWhitish ? 'text-slate-900' : 'text-white'}`}
            >
              {activeTab === 'discovery' && 'Explore 5K & 4K Wallpapers'}
              {activeTab === 'collections' && 'Collection Manager & Playlists'}
              {activeTab === 'rotation' && 'Automatic Wallpaper Rotation'}
              {activeTab === 'personalization' && 'Context-Aware Personalization'}
              {activeTab === 'history' && 'Rotation History & Instant Rollback'}
            </span>
          </div>

          <div className="flex items-center gap-2.5 app-no-drag">
            {/* Quick Switch to Light / Dark Mode Button */}
            <button
              type="button"
              onClick={() => setGlassTheme(isWhitish ? 'blackish' : 'whitish')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium transition-all shadow-xs cursor-pointer ${isWhitish
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
          </div>
        </header>

        {/* Scrollable Main Content Surface */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div key={activeTab} className="mac-view-transition min-h-full">
            {activeTab === 'discovery' && (
              <WallpaperDiscovery
                onOpenAddCustom={() => setIsAddCustomOpen(true)}
                onOpenCollections={() => setActiveTab('collections')}
              />
            )}
            {activeTab === 'collections' && (
              <CollectionsView onOpenAddCustom={() => setIsAddCustomOpen(true)} />
            )}
            {activeTab === 'rotation' && (
              <RotationView
                onOpenCollections={() => setActiveTab('collections')}
                onOpenHistory={() => setActiveTab('history')}
              />
            )}
            {activeTab === 'personalization' && (
              <PersonalizationView
                onOpenCollections={() => setActiveTab('collections')}
              />
            )}
            {activeTab === 'history' && <HistoryTrayView />}
          </div>
        </div>
      </div>

      {/* Global Modals */}
      {isSettingsOpen && (
        <SettingsModal
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

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
