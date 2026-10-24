import React, { useState, useMemo } from 'react';
import { useWallpaper } from '../context/WallpaperContext';
import {
  Search,
  Filter,
  Sparkles,
  Download,
  Plus,
  Monitor,
  Check,
  FolderPlus,
  Info,
  ExternalLink,
  SlidersHorizontal,
  X,
  Heart,
} from 'lucide-react';
import { Wallpaper, WallpaperCategory } from '../types/wallpaper';

interface WallpaperDiscoveryProps {
  onPreviewOnDesktop: () => void;
  onOpenAddCustom: () => void;
}

export const WallpaperDiscovery: React.FC<WallpaperDiscoveryProps> = ({
  onPreviewOnDesktop,
  onOpenAddCustom,
}) => {
  const {
    wallpapers,
    currentWallpaper,
    applyWallpaper,
    collections,
    toggleWallpaperInCollection,
    glassTheme,
  } = useWallpaper();

  const isWhitish = glassTheme === 'whitish';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<WallpaperCategory>('all');
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<string>('all');
  const [selectedWallpaperForDetails, setSelectedWallpaperForDetails] = useState<Wallpaper | null>(null);
  const [collectionPickerOpenForWallId, setCollectionPickerOpenForWallId] = useState<string | null>(null);

  const categories: { id: WallpaperCategory; label: string }[] = [
    { id: 'all', label: 'All Library' },
    { id: 'nature', label: 'Nature 5K' },
    { id: 'minimalist', label: 'Minimalist' },
    { id: 'cyberpunk', label: 'Cyberpunk' },
    { id: 'architecture', label: 'Architecture' },
    { id: 'space', label: 'Space & Cosmos' },
    { id: 'abstract', label: 'Abstract Glass' },
    { id: 'moody', label: 'Rain & Moody' },
  ];

  const filteredWallpapers = useMemo(() => {
    return wallpapers.filter(w => {
      const matchCategory = selectedCategory === 'all' || w.category === selectedCategory;
      const matchSearch =
        searchQuery.trim() === '' ||
        w.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.sourceCredit.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchAspect = selectedAspectRatio === 'all' || w.aspectRatio === selectedAspectRatio;
      return matchCategory && matchSearch && matchAspect;
    });
  }, [wallpapers, selectedCategory, searchQuery, selectedAspectRatio]);

  return (
    <div className="space-y-5 pb-8">
      {/* Top Search & Filter Bar with macOS Glass Effect */}
      <div
        className={`flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3.5 rounded-2xl shrink-0 transition-all ${
          isWhitish
            ? 'mac-glass-whitish-card border-white/80 text-slate-800'
            : 'mac-glass-blackish-card border-white/18 text-slate-100 specular-sheen'
        }`}
      >
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search 4K/5K wallpapers, tags, photographers..."
            className={`w-full pl-9 pr-8 py-2 rounded-xl backdrop-blur-xl border text-xs placeholder-slate-400 focus:outline-none transition-all ${
              isWhitish
                ? 'bg-white/70 border-white/80 text-slate-900 focus:bg-white focus:border-cyan-600 focus:ring-1 focus:ring-cyan-500/20'
                : 'bg-white/10 border-white/15 text-white focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/40'
            }`}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filters and Add Custom */}
        <div className="flex items-center gap-2">
          {/* Aspect Ratio Filter */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs ${
              isWhitish ? 'bg-white/60 border-white/80 text-slate-800' : 'bg-white/10 border-white/15 text-white'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedAspectRatio}
              onChange={e => setSelectedAspectRatio(e.target.value)}
              className="bg-transparent text-xs focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900 text-white">All Ratios</option>
              <option value="16:9" className="bg-slate-900 text-white">16:9 Landscape</option>
              <option value="16:10" className="bg-slate-900 text-white">16:10 Retina</option>
              <option value="21:9" className="bg-slate-900 text-white">21:9 UltraWide</option>
            </select>
          </div>

          {/* Add Custom Wallpaper Button */}
          <button
            onClick={onOpenAddCustom}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-400/30 text-xs font-medium transition-all shadow-sm active:scale-95 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Custom</span>
          </button>
        </div>
      </div>

      {/* Category Filter Pills (Functional Interactive Segmented Control) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {categories.map(cat => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                isSelected
                  ? isWhitish
                    ? 'bg-white text-slate-900 shadow-xs border border-white/90'
                    : 'bg-white/25 text-white shadow-sm border border-white/30 backdrop-blur-md'
                  : isWhitish
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-white/40 border border-transparent'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Results Count & Active Filter Indicator */}
      <div className="flex items-center justify-between text-xs px-1">
        <span className={isWhitish ? 'text-slate-600' : 'text-slate-400'}>
          Showing <strong className={`font-mono ${isWhitish ? 'text-slate-900' : 'text-white'}`}>{filteredWallpapers.length}</strong> wallpapers
        </span>
        <span className={`text-[11px] font-mono ${isWhitish ? 'text-slate-500' : 'text-slate-500'}`}>
          Source: Unsplash / Pexels API Normalization
        </span>
      </div>

      {/* Wallpapers Grid */}
      {filteredWallpapers.length === 0 ? (
        <div className="p-12 text-center rounded-2xl mac-glass-panel-dark border border-white/10 space-y-3">
          <p className="text-sm font-semibold text-white">No wallpapers matched your search</p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Try adjusting your query or category filter, or import a new wallpaper via URL or file upload.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
            }}
            className="px-4 py-2 rounded-xl bg-white/15 hover:bg-white/20 text-white text-xs font-medium transition-all border border-white/20"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWallpapers.map(wall => {
            const isCurrent = currentWallpaper.id === wall.id;
            return (
              <div
                key={wall.id}
                className={`group relative rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl flex flex-col justify-between ${
                  isWhitish
                    ? 'mac-glass-whitish-card border border-white/70'
                    : 'mac-glass-blackish-card border border-white/18 specular-sheen'
                } ${isCurrent ? (isWhitish ? 'ring-2 ring-blue-500/80 shadow-md' : 'ring-2 ring-white/60 shadow-xl') : ''}`}
              >
                {/* Image Banner */}
                <div className="relative aspect-video w-full overflow-hidden bg-slate-900">
                  <img
                    src={wall.imageUrl}
                    alt={wall.title}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />

                  {/* Top Badges */}
                  <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-10">
                    <span className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[10px] font-mono text-white/90 border border-white/20">
                      {wall.width}×{wall.height}
                    </span>

                    {isCurrent && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/90 backdrop-blur-md text-[10px] font-bold text-white flex items-center gap-1 shadow-md">
                        <Check className="w-3 h-3" />
                        <span>Active</span>
                      </span>
                    )}
                  </div>

                  {/* Hover Overlay Action Bar */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs flex items-center justify-center gap-2.5 z-20">
                    <button
                      onClick={() => applyWallpaper(wall, 'manual')}
                      className="px-3.5 py-2 rounded-xl bg-white text-slate-950 hover:bg-white/90 font-medium text-xs shadow-xl active:scale-95 transition-all flex items-center gap-1.5"
                      title="Apply as desktop wallpaper"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
                      <span>Set Desktop</span>
                    </button>

                    <button
                      onClick={() => {
                        applyWallpaper(wall, 'manual');
                        onPreviewOnDesktop();
                      }}
                      className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white backdrop-blur-md border border-white/30 active:scale-95 transition-all"
                      title="Preview on MacBook screen"
                    >
                      <Monitor className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setSelectedWallpaperForDetails(wall)}
                      className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white backdrop-blur-md border border-white/30 active:scale-95 transition-all"
                      title="Wallpaper details & specs"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Card Content & Metadata */}
                <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className={`text-sm font-semibold tracking-wide truncate ${isWhitish ? 'text-slate-900' : 'text-white'}`}>
                      {wall.title}
                    </h3>

                    {/* Unboxed Zero-Pill Metadata */}
                    <div className={`flex items-center gap-1.5 text-[11px] mt-0.5 ${isWhitish ? 'text-slate-500' : 'text-slate-400'}`}>
                      <span className="capitalize">{wall.category}</span>
                      <span aria-hidden="true">·</span>
                      <span className="truncate">{wall.sourceCredit}</span>
                    </div>
                  </div>

                  {/* Bottom Action strip */}
                  <div className={`pt-2 border-t flex items-center justify-between text-xs ${isWhitish ? 'border-black/8' : 'border-white/10'}`}>
                    {/* Add to collection popover trigger */}
                    <div className="relative">
                      <button
                        onClick={() =>
                          setCollectionPickerOpenForWallId(
                            collectionPickerOpenForWallId === wall.id ? null : wall.id
                          )
                        }
                        className={`flex items-center gap-1 transition-colors py-1 px-2 rounded-lg ${
                          isWhitish
                            ? 'text-slate-600 hover:text-slate-900 hover:bg-black/5'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <FolderPlus className="w-3.5 h-3.5" />
                        <span>Collections</span>
                      </button>

                      {/* Dropdown Menu */}
                      {collectionPickerOpenForWallId === wall.id && (
                        <div
                          className={`absolute left-0 bottom-8 w-48 rounded-xl p-2 z-30 shadow-2xl border space-y-1 text-xs animate-in fade-in ${
                            isWhitish
                              ? 'mac-glass-whitish border-white/90 text-slate-800'
                              : 'mac-glass-blackish border-white/20 text-white'
                          }`}
                        >
                          <p className={`text-[10px] font-mono px-2 py-0.5 uppercase ${isWhitish ? 'text-slate-500' : 'text-slate-400'}`}>
                            Add to Collection
                          </p>
                          {collections.map(col => {
                            const inCol = col.wallpaperIds.includes(wall.id);
                            return (
                              <button
                                key={col.id}
                                onClick={() => toggleWallpaperInCollection(wall.id, col.id)}
                                className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition-colors ${
                                  inCol
                                    ? isWhitish
                                      ? 'bg-blue-500/15 text-blue-900 font-semibold'
                                      : 'bg-cyan-500/20 text-cyan-200'
                                    : isWhitish
                                    ? 'text-slate-700 hover:bg-black/5'
                                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                                }`}
                              >
                                <span className="truncate">{col.name}</span>
                                {inCol && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-400" />}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => applyWallpaper(wall, 'manual')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        isCurrent
                          ? isWhitish
                            ? 'bg-emerald-500/20 text-emerald-800 border border-emerald-500/30 font-semibold'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                          : isWhitish
                          ? 'bg-white/80 hover:bg-white text-slate-800 border border-white/90 shadow-xs'
                          : 'bg-white/10 hover:bg-white/20 text-white border border-white/15'
                      }`}
                    >
                      {isCurrent ? 'Current' : 'Apply'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Details Modal */}
      {selectedWallpaperForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="relative w-full max-w-2xl mac-glass-panel-dark rounded-3xl p-6 border border-white/20 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <button
              onClick={() => setSelectedWallpaperForDetails(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="aspect-video w-full rounded-2xl overflow-hidden border border-white/15 shadow-inner">
              <img
                src={selectedWallpaperForDetails.imageUrl}
                alt={selectedWallpaperForDetails.title}
                className="w-full h-full object-cover"
              />
            </div>

            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                {selectedWallpaperForDetails.title}
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Photography by {selectedWallpaperForDetails.sourceCredit}
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                <span className="text-[10px] text-slate-400 block font-mono">Resolution</span>
                <span className="font-mono text-white font-medium">
                  {selectedWallpaperForDetails.width} × {selectedWallpaperForDetails.height}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                <span className="text-[10px] text-slate-400 block font-mono">Aspect Ratio</span>
                <span className="font-mono text-white font-medium">
                  {selectedWallpaperForDetails.aspectRatio}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                <span className="text-[10px] text-slate-400 block font-mono">Best Weather</span>
                <span className="capitalize text-cyan-300 font-medium">
                  {selectedWallpaperForDetails.recommendedWeather?.join(', ') || 'Any'}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                <span className="text-[10px] text-slate-400 block font-mono">Best Time</span>
                <span className="capitalize text-amber-300 font-medium">
                  {selectedWallpaperForDetails.recommendedTime?.join(', ') || 'Any'}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {selectedWallpaperForDetails.tags.map(t => (
                <span
                  key={t}
                  className="px-2 py-0.5 rounded-md bg-white/10 text-[11px] text-slate-300"
                >
                  #{t}
                </span>
              ))}
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
              <button
                onClick={() => setSelectedWallpaperForDetails(null)}
                className="px-4 py-2 rounded-xl text-xs text-slate-300 hover:text-white"
              >
                Close
              </button>
              <button
                onClick={() => {
                  applyWallpaper(selectedWallpaperForDetails, 'manual');
                  setSelectedWallpaperForDetails(null);
                }}
                className="px-4 py-2 rounded-xl bg-cyan-500/30 hover:bg-cyan-500/40 text-cyan-100 border border-cyan-400/40 font-medium text-xs flex items-center gap-2 shadow-lg"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Apply as Wallpaper</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
