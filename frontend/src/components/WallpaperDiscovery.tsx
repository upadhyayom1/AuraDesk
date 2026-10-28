import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useWallpaper } from '../context/WallpaperContext';
import {
  Search,
  Sparkles,
  Plus,
  Check,
  FolderPlus,
  Info,
  ExternalLink,
  SlidersHorizontal,
  X,
  RefreshCw,
  RotateCcw,
  AlertCircle,
  Loader2,
  Globe,
  Image as ImageIcon,
} from 'lucide-react';
import { Wallpaper, WallpaperCategory } from '../types/wallpaper';
import {
  electronBridge,
  DiscoverySourceStatus,
} from '../services/electronBridge';

interface WallpaperDiscoveryProps {
  onOpenAddCustom: () => void;
}

export const WallpaperDiscovery: React.FC<WallpaperDiscoveryProps> = ({
  onOpenAddCustom,
}) => {
  const {
    currentWallpaper,
    applyWallpaper,
    unsetWallpaper,
    collections,
    toggleWallpaperInCollection,
    glassTheme,
  } = useWallpaper();

  const isWhitish = glassTheme === 'whitish';

  // Live Discovery State
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedSource, setSelectedSource] = useState<'all' | 'unsplash' | 'pexels'>('all');
  const [selectedOrientation, setSelectedOrientation] = useState<'all' | 'landscape' | 'portrait' | 'squarish'>('all');
  const [selectedCategory, setSelectedCategory] = useState<WallpaperCategory>('all');
  const [onlineWallpapers, setOnlineWallpapers] = useState<Wallpaper[]>([]);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [sourcesStatus, setSourcesStatus] = useState<DiscoverySourceStatus[]>([]);
  const [selectedWallpaperForDetails, setSelectedWallpaperForDetails] = useState<Wallpaper | null>(null);
  const [collectionPickerOpenForWallId, setCollectionPickerOpenForWallId] = useState<string | null>(null);

  // Stale request tracking
  const requestIdRef = useRef<number>(0);

  const categories: { id: WallpaperCategory; label: string; query?: string }[] = [
    { id: 'all', label: 'All Library' },
    { id: 'nature', label: 'Nature', query: 'nature 4k' },
    { id: 'minimalist', label: 'Minimalist', query: 'minimalist dark' },
    { id: 'cyberpunk', label: 'Cyberpunk', query: 'cyberpunk neon city' },
    { id: 'architecture', label: 'Architecture', query: 'modern architecture' },
    { id: 'space', label: 'Space & Cosmos', query: 'galaxy nebula space' },
    { id: 'abstract', label: 'Abstract 3D', query: 'abstract 3d geometry' },
    { id: 'moody', label: 'Moody & Rain', query: 'foggy forest rainy' },
  ];

  // Check discovery source status on mount
  useEffect(() => {
    electronBridge.getDiscoverySources().then(setSourcesStatus).catch(console.warn);
  }, []);

  // Debounce search query changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Main data loader (Browse or Search)
  const fetchWallpapers = useCallback(
    async (targetPage: number = 1, append: boolean = false) => {
      const currentRequestId = ++requestIdRef.current;

      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
        setError(null);
        setErrorCode(null);
      }

      try {
        const orientationFilter = selectedOrientation !== 'all' ? selectedOrientation : undefined;
        let result;

        if (debouncedQuery) {
          result = await electronBridge.searchWallpapers({
            query: debouncedQuery,
            source: selectedSource,
            orientation: orientationFilter,
            page: targetPage,
            perPage: 24,
          });
        } else {
          result = await electronBridge.browseWallpapers({
            source: selectedSource,
            page: targetPage,
            perPage: 24,
          });
        }

        // Drop stale responses if a newer query was fired
        if (currentRequestId !== requestIdRef.current) return;

        if (result.success && result.data) {
          const items = result.data.items || [];
          if (append) {
            setOnlineWallpapers(prev => [...prev, ...items]);
          } else {
            setOnlineWallpapers(items);
          }
          setPage(result.data.page);
          setTotalPages(result.data.totalPages);
          setTotalCount(result.data.total);
          setError(null);
          setErrorCode(null);
        } else {
          if (!append) {
            setError(result.error || 'Failed to load wallpapers from online providers');
            setErrorCode(result.code || 'INTERNAL_ERROR');
          }
        }
      } catch (err: any) {
        if (currentRequestId !== requestIdRef.current) return;
        if (!append) {
          setError(err.message || 'An unexpected error occurred while contacting discovery providers');
          setErrorCode('OFFLINE');
        }
      } finally {
        if (currentRequestId === requestIdRef.current) {
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      }
    },
    [debouncedQuery, selectedSource, selectedOrientation]
  );

  // Trigger search/browse when debounced query or filters change
  useEffect(() => {
    setPage(1);
    fetchWallpapers(1, false);
  }, [debouncedQuery, selectedSource, selectedOrientation, fetchWallpapers]);

  // Handle Category click (sets query or resets to browse)
  const handleCategorySelect = (cat: typeof categories[0]) => {
    setSelectedCategory(cat.id);
    if (cat.id === 'all') {
      setSearchQuery('');
    } else if (cat.query) {
      setSearchQuery(cat.query);
    }
  };

  const displayedWallpapers = onlineWallpapers;

  return (
    <div className="space-y-5 pb-8">
      {/* Top Search & Filter Bar */}
      <div
        className={`flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3.5 rounded-2xl shrink-0 transition-all ${isWhitish
          ? 'mac-glass-whitish-card border-white/80 text-slate-800'
          : 'mac-glass-blackish-card border-white/18 text-slate-100 specular-sheen'
          }`}
      >
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            id="wallpaper-search-input"
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search online wallpapers from Unsplash & Pexels (e.g. nature, architecture, cyberpunk)..."
            className={`w-full pl-9 pr-8 py-2 rounded-xl backdrop-blur-xl border text-xs placeholder-slate-400 focus:outline-none transition-all ${isWhitish
              ? 'bg-white/70 border-white/80 text-slate-900 focus:bg-white focus:border-cyan-600 focus:ring-1 focus:ring-cyan-500/20'
              : 'bg-white/10 border-white/15 text-white focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/40'
              }`}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filters and Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Provider / Source Filter */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs ${isWhitish ? 'bg-white/60 border-white/80 text-slate-800' : 'bg-white/10 border-white/15 text-white'
              }`}
          >
            <Globe className="w-3.5 h-3.5 text-slate-400" />
            <select
              id="source-selector"
              value={selectedSource}
              onChange={e => setSelectedSource(e.target.value as any)}
              className="bg-transparent text-xs focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900 text-white">All Sources</option>
              <option value="unsplash" className="bg-slate-900 text-white">Unsplash</option>
              <option value="pexels" className="bg-slate-900 text-white">Pexels</option>
            </select>
          </div>

          {/* Orientation Filter */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs ${isWhitish ? 'bg-white/60 border-white/80 text-slate-800' : 'bg-white/10 border-white/15 text-white'
              }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <select
              id="orientation-selector"
              value={selectedOrientation}
              onChange={e => setSelectedOrientation(e.target.value as any)}
              className="bg-transparent text-xs focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900 text-white">All Orientations</option>
              <option value="landscape" className="bg-slate-900 text-white">Landscape</option>
              <option value="portrait" className="bg-slate-900 text-white">Portrait</option>
              <option value="squarish" className="bg-slate-900 text-white">Square</option>
            </select>
          </div>

          {/* Add Custom Wallpaper */}
          <button
            onClick={onOpenAddCustom}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shadow-xs active:scale-95 whitespace-nowrap cursor-pointer border ${
              isWhitish
                ? 'bg-slate-900 hover:bg-slate-800 text-white border-transparent'
                : 'bg-white/15 hover:bg-white/20 text-white border-white/20'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Custom</span>
          </button>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {categories.map(cat => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => handleCategorySelect(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${isSelected
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

      {/* Sources Status & Mode Indicator Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs px-1">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-400/30 text-[11px] font-medium">
            <Globe className="w-3 h-3" />
            <span>Live Discovery (Unsplash & Pexels)</span>
          </span>
        </div>

        <div className={`text-[11px] font-mono flex items-center gap-3 ${isWhitish ? 'text-slate-500' : 'text-slate-400'}`}>
          {sourcesStatus.length > 0 && (
            <span className="flex items-center gap-1.5">
              Providers:
              {sourcesStatus.map(s => (
                <span
                  key={s.name}
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] uppercase font-mono ${s.ok
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                    }`}
                  title={`${s.name}: ${s.ok ? 'Configured & Online' : 'No API key set in .env'}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${s.ok ? 'bg-emerald-500' : 'bg-rose-400'}`} />
                  {s.name}
                </span>
              ))}
            </span>
          )}

          <span>
            Showing <strong className={`font-mono ${isWhitish ? 'text-slate-900' : 'text-white'}`}>{displayedWallpapers.length}</strong>
            {totalCount > 0 ? ` of ${totalCount}` : ''}
          </span>
        </div>
      </div>

      {/* Error State Banner with Accurate Error Code and Retry */}
      {error && (
        <div
          className={`p-4 rounded-2xl border transition-all ${isWhitish
            ? 'bg-rose-50/80 border-rose-200 text-rose-900'
            : 'bg-rose-950/40 border-rose-500/30 text-rose-200'
            }`}
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <h4 className="text-sm font-semibold">Online Discovery Error</h4>
              <p className="text-xs text-rose-400 leading-relaxed">
                {error}
                {errorCode === 'AUTH_REQUIRED' && (
                  <span className="block mt-1 text-[11px] opacity-90">
                    Please ensure valid <code>UNSPLASH_ACCESS_KEY</code> or <code>PEXELS_API_KEY</code> is configured in <code>.env</code>.
                  </span>
                )}
                {errorCode === 'RATE_LIMITED' && (
                  <span className="block mt-1 text-[11px] opacity-90">
                    Rate limit reached on external providers. Please wait a moment before trying again.
                  </span>
                )}
                {errorCode === 'OFFLINE' && (
                  <span className="block mt-1 text-[11px] opacity-90">
                    Check your internet connection and verify external DNS resolution.
                  </span>
                )}
              </p>
              <div className="pt-2 flex items-center gap-3">
                <button
                  onClick={() => fetchWallpapers(1, false)}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-400/40 text-xs font-medium flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Search</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading Shimmer State */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div
              key={i}
              className={`rounded-2xl overflow-hidden animate-pulse aspect-video flex flex-col justify-end p-4 border ${isWhitish
                ? 'bg-slate-200/60 border-slate-300/40'
                : 'bg-white/5 border-white/10'
                }`}
            >
              <div className="h-4 bg-white/20 rounded w-2/3 mb-2" />
              <div className="h-3 bg-white/10 rounded w-1/3" />
            </div>
          ))}
        </div>
      )}

      {/* Wallpapers Grid */}
      {!isLoading && displayedWallpapers.length === 0 ? (
        <div className="p-12 text-center rounded-2xl mac-glass-panel-dark border border-white/10 space-y-3">
          <ImageIcon className="w-10 h-10 text-slate-500 mx-auto" />
          <p className="text-sm font-semibold text-white">No wallpapers found</p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery ? `No online wallpapers matched "${searchQuery}".` : 'No wallpapers available in this feed.'} Try a different search term or change your orientation and source filters.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setSelectedSource('all');
                setSelectedOrientation('all');
              }}
              className="px-4 py-2 rounded-xl bg-white/15 hover:bg-white/20 text-white text-xs font-medium transition-all border border-white/20 cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        </div>
      ) : !isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedWallpapers.map(wall => {
            const isCurrent = currentWallpaper.id === wall.id || (
              currentWallpaper.imageUrl && wall.imageUrl && currentWallpaper.imageUrl === wall.imageUrl
            );
            const providerName = wall.source === 'unsplash' ? 'Unsplash' : wall.source === 'pexels' ? 'Pexels' : 'Local';

            return (
              <div
                key={wall.id}
                className={`group relative rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl flex flex-col justify-between ${isWhitish
                  ? 'mac-glass-whitish-card border border-white/70'
                  : 'mac-glass-blackish-card border border-white/18 specular-sheen'
                  } ${isCurrent ? (isWhitish ? 'ring-2 ring-blue-500/80 shadow-md' : 'ring-2 ring-white/60 shadow-xl') : ''}`}
              >
                {/* Image Banner */}
                <div className="relative aspect-video w-full overflow-hidden bg-slate-900">
                  <img
                    src={wall.thumbUrl || wall.imageUrl}
                    alt={wall.title}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />

                  {/* Top Badges */}
                  <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-10">
                    <span className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[10px] font-mono text-white/90 border border-white/20">
                      {wall.width}×{wall.height}
                    </span>

                    <span className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[10px] font-mono text-white/90 border border-white/20 capitalize">
                      {providerName}
                    </span>

                    {isCurrent && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/90 backdrop-blur-md text-[10px] font-bold text-white flex items-center gap-1 shadow-md">
                        <Check className="w-3 h-3" />
                        <span>Active</span>
                      </span>
                    )}
                  </div>

                  {/* Hover Overlay Action Bar */}
                  <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs flex items-center justify-center gap-2.5 z-20">
                    {isCurrent ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          unsetWallpaper();
                        }}
                        className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-xl active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                        title="Unset this wallpaper and restore previous"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Unset Wallpaper</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => applyWallpaper(wall, 'manual')}
                        className="px-4 py-2 rounded-xl bg-white text-slate-950 hover:bg-slate-100 font-semibold text-xs shadow-xl active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                        title="Apply as system desktop wallpaper"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Set Wallpaper</span>
                      </button>
                    )}

                    <button
                      onClick={() => setSelectedWallpaperForDetails(wall)}
                      className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white backdrop-blur-md border border-white/30 active:scale-95 transition-all cursor-pointer"
                      title="Wallpaper details & credits"
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

                    {/* Attribution & Creator */}
                    <div className={`flex items-center gap-1.5 text-[11px] mt-0.5 ${isWhitish ? 'text-slate-500' : 'text-slate-400'}`}>
                      <span className="truncate">{wall.photographer || wall.sourceCredit}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono text-[10px] opacity-75">{providerName}</span>
                    </div>
                  </div>

                  {/* Bottom Action strip */}
                  <div className={`pt-2 border-t flex items-center justify-between text-xs ${isWhitish ? 'border-black/8' : 'border-white/10'}`}>
                    {/* Add to collection popover */}
                    <div className="relative">
                      <button
                        onClick={() =>
                          setCollectionPickerOpenForWallId(
                            collectionPickerOpenForWallId === wall.id ? null : wall.id
                          )
                        }
                        className={`flex items-center gap-1 transition-colors py-1 px-2 rounded-lg cursor-pointer ${isWhitish
                          ? 'text-slate-600 hover:text-slate-900 hover:bg-black/5'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                          }`}
                      >
                        <FolderPlus className="w-3.5 h-3.5" />
                        <span>Collections</span>
                      </button>

                      {collectionPickerOpenForWallId === wall.id && (
                        <div
                          className={`absolute left-0 bottom-8 w-48 rounded-xl p-2 z-30 shadow-2xl border space-y-1 text-xs animate-in fade-in ${isWhitish
                            ? 'mac-glass-whitish border-white/90 text-slate-800'
                            : 'mac-glass-blackish border-white/20 text-white'
                            }`}
                        >
                          <p className={`text-[10px] font-mono px-2 py-0.5 uppercase ${isWhitish ? 'text-slate-500' : 'text-slate-400'}`}>
                            Add to Collection
                          </p>
                          {collections.length === 0 ? (
                            <p className="text-[11px] text-slate-400 px-2 py-1 italic">
                              No collections created yet.
                            </p>
                          ) : (
                            collections.map(col => {
                              const inCol = col.wallpaperIds.includes(wall.id);
                              return (
                                <button
                                  key={col.id}
                                  onClick={() => toggleWallpaperInCollection(wall.id, col.id, wall)}
                                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                                    inCol
                                      ? isWhitish
                                        ? 'bg-slate-100 text-slate-900 font-semibold border border-slate-200'
                                        : 'bg-white/15 text-white font-semibold border border-white/20'
                                      : isWhitish
                                      ? 'text-slate-700 hover:bg-black/5'
                                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                                    }`}
                                >
                                  <span className="truncate">{col.name}</span>
                                  {inCol && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-cyan-400" />}
                                </button>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => isCurrent ? unsetWallpaper() : applyWallpaper(wall, 'manual')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer group/unsetBtn ${
                        isCurrent
                          ? isWhitish
                            ? 'bg-emerald-50 hover:bg-rose-50 text-emerald-800 hover:text-rose-700 border border-emerald-300 hover:border-rose-300'
                            : 'bg-emerald-500/20 hover:bg-rose-500/30 text-emerald-300 hover:text-rose-300 border border-emerald-400/30 hover:border-rose-400/40'
                          : isWhitish
                          ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs'
                          : 'bg-white/10 hover:bg-white/20 text-white border border-white/15'
                        }`}
                      title={isCurrent ? 'Click to unset wallpaper and restore previous' : 'Apply as wallpaper'}
                    >
                      {isCurrent ? (
                        <span className="flex items-center gap-1">
                          <span className="group-hover/unsetBtn:hidden flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Current
                          </span>
                          <span className="hidden group-hover/unsetBtn:flex items-center gap-1">
                            <RotateCcw className="w-3 h-3" /> Unset
                          </span>
                        </span>
                      ) : (
                        'Apply'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination / Load More */}
      {!isLoading && displayedWallpapers.length > 0 && page < totalPages && (
        <div className="pt-4 flex justify-center">
          <button
            onClick={() => fetchWallpapers(page + 1, true)}
            disabled={isLoadingMore}
            className={`px-6 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all active:scale-95 shadow-sm cursor-pointer ${
              isWhitish
                ? 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300'
                : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
            }`}
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                <span>Loading More Wallpapers...</span>
              </>
            ) : (
              <span>Load More Wallpapers (Page {page + 1} of {totalPages})</span>
            )}
          </button>
        </div>
      )}

      {/* Details & Credits Modal */}
      {selectedWallpaperForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-md">
          <div
            className={`relative w-full max-w-2xl rounded-3xl p-6 border shadow-2xl space-y-4 animate-in fade-in zoom-in-95 ${isWhitish ? 'mac-modal-light text-slate-900' : 'mac-modal-dark text-slate-100'
              }`}
          >
            <button
              onClick={() => setSelectedWallpaperForDetails(null)}
              className={`absolute top-4 right-4 p-1.5 rounded-full transition-colors cursor-pointer ${isWhitish ? 'hover:bg-black/10 text-slate-600' : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
            >
              <X className="w-4 h-4" />
            </button>

            {/* High-res Image Preview */}
            <div className="aspect-video w-full rounded-2xl overflow-hidden border border-white/15 shadow-inner bg-slate-950">
              <img
                src={selectedWallpaperForDetails.imageUrl}
                alt={selectedWallpaperForDetails.title}
                className="w-full h-full object-cover"
              />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase border ${
                  isWhitish
                    ? 'bg-slate-100 text-slate-800 border-slate-200 font-semibold'
                    : 'bg-white/10 text-slate-200 border-white/15'
                }`}>
                  {selectedWallpaperForDetails.source || 'Online'}
                </span>
                <h2 className={`text-lg font-bold tracking-wide truncate ${isWhitish ? 'text-slate-900' : 'text-white'}`}>
                  {selectedWallpaperForDetails.title}
                </h2>
              </div>

              {selectedWallpaperForDetails.description && (
                <p className={`text-xs mt-1 italic ${isWhitish ? 'text-slate-600' : 'text-slate-300'}`}>
                  &quot;{selectedWallpaperForDetails.description}&quot;
                </p>
              )}

              {/* Photographer attribution with clickable external profile */}
              <div className={`flex items-center gap-2 text-xs mt-2 ${isWhitish ? 'text-slate-600' : 'text-slate-300'}`}>
                <span>Photographed by <strong>{selectedWallpaperForDetails.photographer || selectedWallpaperForDetails.sourceCredit}</strong></span>
                {selectedWallpaperForDetails.creditUrl && (
                  <button
                    onClick={() => electronBridge.openExternal(selectedWallpaperForDetails.creditUrl!)}
                    className="inline-flex items-center gap-1 text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer font-medium"
                  >
                    <span>View Profile</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Technical Specs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div className={`p-2.5 rounded-xl border ${isWhitish ? 'bg-slate-100 border-slate-200' : 'bg-white/5 border-white/5'}`}>
                <span className={`text-[10px] block font-mono ${isWhitish ? 'text-slate-500' : 'text-slate-400'}`}>Resolution</span>
                <span className={`font-mono font-medium ${isWhitish ? 'text-slate-900' : 'text-white'}`}>
                  {selectedWallpaperForDetails.width} × {selectedWallpaperForDetails.height}
                </span>
              </div>
              <div className={`p-2.5 rounded-xl border ${isWhitish ? 'bg-slate-100 border-slate-200' : 'bg-white/5 border-white/5'}`}>
                <span className={`text-[10px] block font-mono ${isWhitish ? 'text-slate-500' : 'text-slate-400'}`}>Aspect Ratio</span>
                <span className={`font-mono font-medium ${isWhitish ? 'text-slate-900' : 'text-white'}`}>
                  {selectedWallpaperForDetails.aspectRatio}
                </span>
              </div>
              <div className={`p-2.5 rounded-xl border ${isWhitish ? 'bg-slate-100 border-slate-200' : 'bg-white/5 border-white/5'}`}>
                <span className={`text-[10px] block font-mono ${isWhitish ? 'text-slate-500' : 'text-slate-400'}`}>Universal ID</span>
                <span className={`font-mono font-medium text-[11px] truncate block ${isWhitish ? 'text-slate-900' : 'text-white'}`} title={selectedWallpaperForDetails.id}>
                  {selectedWallpaperForDetails.id}
                </span>
              </div>
              <div className={`p-2.5 rounded-xl border ${isWhitish ? 'bg-slate-100 border-slate-200' : 'bg-white/5 border-white/5'}`}>
                <span className={`text-[10px] block font-mono ${isWhitish ? 'text-slate-500' : 'text-slate-400'}`}>Provider</span>
                <span className={`capitalize font-medium ${isWhitish ? 'text-cyan-700' : 'text-cyan-300'}`}>
                  {selectedWallpaperForDetails.source || 'Online'}
                </span>
              </div>
            </div>

            <div className={`pt-3 border-t flex items-center justify-end gap-3 ${isWhitish ? 'border-slate-200' : 'border-white/10'}`}>
              <button
                onClick={() => setSelectedWallpaperForDetails(null)}
                className={`px-4 py-2 rounded-xl text-xs font-medium cursor-pointer transition-colors ${isWhitish ? 'hover:bg-slate-200 text-slate-700' : 'text-slate-300 hover:text-white'
                  }`}
              >
                Close
              </button>
              {selectedWallpaperForDetails.id === currentWallpaper?.id ? (
                <button
                  onClick={() => {
                    unsetWallpaper();
                    setSelectedWallpaperForDetails(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs flex items-center gap-2 shadow-md cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Unset Wallpaper</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    applyWallpaper(selectedWallpaperForDetails, 'manual');
                    setSelectedWallpaperForDetails(null);
                  }}
                  className={`px-4 py-2 rounded-xl font-semibold text-xs flex items-center gap-2 shadow-md cursor-pointer transition-colors ${
                    isWhitish
                      ? 'bg-slate-900 hover:bg-slate-800 text-white'
                      : 'bg-white text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Apply as Wallpaper</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
