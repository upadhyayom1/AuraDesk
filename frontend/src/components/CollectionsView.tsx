import React, { useState, useEffect } from 'react';
import { useWallpaper } from '../context/WallpaperContext';
import {
  Plus,
  Trash2,
  Sparkles,
  Layers,
  X,
  Loader2,
  FolderOpen,
  RotateCcw,
} from 'lucide-react';
import { Wallpaper } from '../types/wallpaper';
import { electronBridge, normalizeBackendWallpaper } from '../services/electronBridge';

interface CollectionsViewProps {
  onOpenAddCustom: () => void;
}

export const CollectionsView: React.FC<CollectionsViewProps> = ({ onOpenAddCustom }) => {
  const {
    collections,
    activeCollectionId,
    setActiveCollectionId,
    applyWallpaper,
    currentWallpaper,
    createCollection,
    deleteCollection,
    toggleWallpaperInCollection,
    applyCollection,
    exportCollection,
    unsetWallpaper,
    glassTheme,
  } = useWallpaper();

  const isWhitish = glassTheme === 'whitish';

  const [selectedColId, setSelectedColId] = useState<string>(activeCollectionId || (collections[0]?.id || ''));
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [newColDesc, setNewColDesc] = useState('');
  const [collectionWallpapers, setCollectionWallpapers] = useState<Wallpaper[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);

  // Sync selectedColId if activeCollectionId becomes available
  useEffect(() => {
    if (!selectedColId && collections.length > 0) {
      setSelectedColId(activeCollectionId || collections[0].id);
    }
  }, [collections, activeCollectionId, selectedColId]);

  // Load authoritative items from SQLite backend whenever selected collection changes
  useEffect(() => {
    if (!selectedColId) {
      setCollectionWallpapers([]);
      return;
    }

    let isCurrent = true;
    setIsLoadingItems(true);

    electronBridge.getCollection(selectedColId)
      .then(detail => {
        if (!isCurrent) return;
        if (detail && Array.isArray(detail.items)) {
          setCollectionWallpapers(detail.items.map(it => normalizeBackendWallpaper(it)));
        } else {
          setCollectionWallpapers([]);
        }
      })
      .catch(err => {
        console.warn('[CollectionsView] Failed to load collection items:', err);
        if (isCurrent) setCollectionWallpapers([]);
      })
      .finally(() => {
        if (isCurrent) setIsLoadingItems(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [selectedColId, collections]);

  const selectedCol = collections.find(c => c.id === selectedColId) || collections[0];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColName.trim()) return;
    const created = await createCollection(newColName.trim(), newColDesc.trim());
    if (created && created.id) {
      setSelectedColId(created.id);
    }
    setNewColName('');
    setNewColDesc('');
    setIsCreatingNew(false);
  };

  const handleDelete = async (id: string) => {
    const success = await deleteCollection(id);
    if (success && selectedColId === id) {
      const remaining = collections.filter(c => c.id !== id);
      setSelectedColId(remaining[0]?.id || '');
    }
  };

  return (
    <div className="space-y-6 pb-8 max-w-6xl mx-auto">
      {/* Top Banner & Header */}
      <div
        className={`flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-5 rounded-3xl border shrink-0 transition-all ${isWhitish
          ? 'mac-glass-whitish-card border-white/80 text-slate-800'
          : 'mac-glass-blackish-card border-white/15 text-slate-100 specular-sheen'
          }`}
      >
        <div>
          <h2 className={`text-base font-bold tracking-wide ${isWhitish ? 'text-slate-900' : 'text-white'}`}>
            Wallpaper Collections
          </h2>
          <p className={`text-xs ${isWhitish ? 'text-slate-600' : 'text-slate-400'}`}>
            Organize wallpapers into named themed sets persisted in SQLite. The active collection feeds the automatic
            rotation engine.
          </p>
        </div>

        <button
          onClick={() => setIsCreatingNew(true)}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-sm active:scale-95 whitespace-nowrap cursor-pointer ${isWhitish
            ? 'bg-slate-900 hover:bg-slate-800 text-white'
            : 'bg-white/15 hover:bg-white/20 text-white border border-white/20'
            }`}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Collection</span>
        </button>
      </div>

      {/* Collection Cards Row */}
      {collections.length === 0 ? (
        <div
          className={`p-10 text-center rounded-3xl border space-y-3 ${isWhitish
            ? 'bg-white/60 border-slate-200 text-slate-700'
            : 'bg-white/5 border-white/10 text-slate-300'
            }`}
        >
          <FolderOpen className="w-10 h-10 text-slate-400 mx-auto opacity-70" />
          <p className="text-sm font-semibold">No collections found in local database</p>
          <p className="text-xs opacity-75 max-w-sm mx-auto">
            Create your first collection to group wallpapers together and enable background rotation.
          </p>
          <button
            onClick={() => setIsCreatingNew(true)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer ${
              isWhitish
                ? 'bg-slate-900 hover:bg-slate-800 text-white'
                : 'bg-white text-slate-900 hover:bg-slate-100'
            }`}
          >
            Create First Collection
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {collections.map(col => {
            const isActiveRotation = activeCollectionId === col.id;
            const isSelected = selectedColId === col.id;
            return (
              <div
                key={col.id}
                onClick={() => setSelectedColId(col.id)}
                className={`p-4 rounded-2xl cursor-pointer transition-all duration-200 flex flex-col justify-between space-y-3 border ${isSelected
                  ? isWhitish
                    ? 'bg-white border-slate-900 shadow-md text-slate-900 ring-2 ring-slate-900/15'
                    : 'bg-white/15 border-white/30 shadow-xl text-white ring-1 ring-white/30'
                  : isWhitish
                    ? 'mac-glass-whitish-card border-white/60 text-slate-800 hover:bg-white/80'
                    : 'mac-glass-blackish-card border-white/15 text-slate-200 hover:bg-white/10'
                  }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className={`text-sm font-semibold truncate ${isWhitish ? 'text-slate-900' : 'text-white'}`}>
                        {col.name}
                      </h3>
                      {isActiveRotation && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono whitespace-nowrap border ${isWhitish
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold'
                          : 'bg-emerald-500/20 border-emerald-400/30 text-emerald-300'
                          }`}>
                          Active Loop
                        </span>
                      )}
                    </div>
                    <p className={`text-xs line-clamp-2 mt-1 ${isWhitish ? 'text-slate-500' : 'text-slate-400'}`}>
                      {col.description || 'Custom collection'}
                    </p>
                  </div>
                </div>

                <div className={`pt-2 border-t flex items-center justify-between text-xs ${isWhitish ? 'border-black/5' : 'border-white/10'}`}>
                  <span className={`font-mono text-[11px] tabular-nums ${isWhitish ? 'text-slate-500' : 'text-slate-400'}`}>
                    {col.wallpaperIds.length} wallpapers
                  </span>

                  <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                    {!isActiveRotation && (
                      <button
                        onClick={() => setActiveCollectionId(col.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all cursor-pointer ${isWhitish
                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
                          : 'bg-white/10 hover:bg-white/20 text-white border-white/15'
                          }`}
                      >
                        Set Active
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(col.id)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Delete Collection"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Selected Collection Detailed View */}
      {selectedCol && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between px-1 flex-wrap gap-2">
            <h3 className={`text-sm font-semibold tracking-wide ${isWhitish ? 'text-slate-900' : 'text-white'}`}>
              Wallpapers in &quot;{selectedCol.name}&quot; ({collectionWallpapers.length})
            </h3>
            <div className="flex items-center gap-2">
              {collectionWallpapers.length > 0 && (
                <>
                  <button
                    onClick={() => applyCollection(selectedCol.id, 'next')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shadow-xs active:scale-95 cursor-pointer border ${
                      isWhitish
                        ? 'bg-slate-900 hover:bg-slate-800 text-white border-transparent'
                        : 'bg-white/15 hover:bg-white/20 text-white border-white/20'
                    }`}
                    title="Apply next wallpaper from this collection directly to your desktop"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Apply to Desktop</span>
                  </button>
                  <button
                    onClick={() => exportCollection(selectedCol.id)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all shadow-xs active:scale-95 cursor-pointer border ${isWhitish
                      ? 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                      }`}
                    title="Export collection vault to JSON file"
                  >
                    Export Vault
                  </button>
                </>
              )}
              <button
                onClick={onOpenAddCustom}
                className={`text-xs hover:underline transition-colors flex items-center gap-1 cursor-pointer font-semibold ${
                  isWhitish ? 'text-slate-800' : 'text-slate-200'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Custom Image</span>
              </button>
            </div>
          </div>

          {isLoadingItems ? (
            <div className="p-8 flex items-center justify-center gap-2 text-slate-400 text-xs">
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
              <span>Loading collection wallpapers from database...</span>
            </div>
          ) : collectionWallpapers.length === 0 ? (
            <div
              className={`p-8 text-center rounded-2xl border space-y-2 ${isWhitish
                ? 'bg-white/60 border-slate-200 text-slate-700'
                : 'bg-white/5 border-white/10 text-slate-300'
                }`}
            >
              <p className="text-sm font-semibold">This collection is currently empty.</p>
              <p className="text-xs opacity-75">
                Go to the Explore tab and click &quot;Add to Collection&quot; on any wallpaper to add it here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {collectionWallpapers.map(wall => {
                const isCurrent = currentWallpaper.id === wall.id;
                return (
                  <div
                    key={wall.id}
                    className={`relative rounded-2xl overflow-hidden group border space-y-2 p-3 flex flex-col justify-between transition-all ${isWhitish
                      ? 'bg-white/80 border-slate-200/90 text-slate-900 shadow-xs hover:border-slate-300'
                      : 'mac-glass-card border-white/10 text-white hover:border-white/20'
                      }`}
                  >
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-900 group">
                      <img
                        src={wall.thumbUrl || wall.imageUrl}
                        alt={wall.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {isCurrent && (
                        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-emerald-500/95 text-[10px] font-bold text-white shadow-md z-10">
                          Active Desktop
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 z-20">
                        {isCurrent ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              unsetWallpaper();
                            }}
                            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-lg active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                            title="Unset this wallpaper and restore previous"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Unset Wallpaper</span>
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              applyWallpaper(wall, 'manual');
                            }}
                            className="px-3 py-1.5 rounded-lg bg-white text-slate-900 hover:bg-slate-100 font-semibold text-xs shadow-lg active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                            title="Apply as system desktop wallpaper"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Set Wallpaper</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className={`text-xs font-semibold truncate ${isWhitish ? 'text-slate-900' : 'text-white'}`}>
                        {wall.title}
                      </h4>
                      <p className={`text-[11px] truncate ${isWhitish ? 'text-slate-500' : 'text-slate-400'}`}>
                        {wall.sourceCredit || wall.photographer || 'AuraDesk'}
                      </p>
                    </div>

                    <div className={`pt-2 border-t flex items-center justify-between text-xs ${isWhitish ? 'border-slate-100' : 'border-white/10'}`}>
                      <button
                        onClick={() => toggleWallpaperInCollection(wall.id, selectedCol.id, wall)}
                        className="text-rose-500 hover:text-rose-600 text-[11px] transition-colors cursor-pointer"
                      >
                        Remove
                      </button>

                      <button
                        onClick={() => isCurrent ? unsetWallpaper() : applyWallpaper(wall, 'manual')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border cursor-pointer transition-all ${
                          isCurrent
                            ? isWhitish
                              ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                              : 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border-rose-400/30'
                            : isWhitish
                            ? 'bg-slate-900 hover:bg-slate-800 text-white border-transparent'
                            : 'bg-white/10 hover:bg-white/20 text-white border-white/15'
                          }`}
                        title={isCurrent ? 'Unset wallpaper' : 'Apply as desktop wallpaper'}
                      >
                        {isCurrent ? (
                          <span className="flex items-center gap-1">
                            <RotateCcw className="w-3 h-3" /> Unset
                          </span>
                        ) : (
                          'Apply Now'
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Create Collection Modal */}
      {isCreatingNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <form
            onSubmit={handleCreate}
            className={`w-full max-w-md rounded-3xl p-6 border shadow-2xl space-y-4 ${isWhitish ? 'mac-modal-light text-slate-900' : 'mac-modal-dark text-slate-100'
              }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-sm font-bold">New Wallpaper Collection</h3>
              <button
                type="button"
                onClick={() => setIsCreatingNew(false)}
                className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className={`block font-medium mb-1 ${isWhitish ? 'text-slate-700' : 'text-slate-300'}`}>
                  Collection Name
                </label>
                <input
                  type="text"
                  required
                  value={newColName}
                  onChange={e => setNewColName(e.target.value)}
                  placeholder="e.g. Cyberpunk Synthwave, Focus Mode, Morning Calm"
                  className={`w-full px-3 py-2 rounded-xl border outline-none ${isWhitish
                    ? 'bg-white border-slate-300 text-slate-900 focus:border-cyan-500'
                    : 'bg-black/40 border-white/15 text-white focus:border-cyan-400'
                    }`}
                  autoFocus
                />
              </div>

              <div>
                <label className={`block font-medium mb-1 ${isWhitish ? 'text-slate-700' : 'text-slate-300'}`}>
                  Description (optional)
                </label>
                <textarea
                  value={newColDesc}
                  onChange={e => setNewColDesc(e.target.value)}
                  rows={3}
                  placeholder="What kind of wallpapers fit in this collection?"
                  className={`w-full px-3 py-2 rounded-xl border outline-none ${isWhitish
                    ? 'bg-white border-slate-300 text-slate-900 focus:border-cyan-500'
                    : 'bg-black/40 border-white/15 text-white focus:border-cyan-400'
                    }`}
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsCreatingNew(false)}
                className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${isWhitish ? 'hover:bg-slate-200 text-slate-700' : 'hover:bg-white/10 text-slate-300'
                  }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`px-4 py-2 rounded-xl font-semibold text-xs shadow-md transition-colors cursor-pointer ${
                  isWhitish
                    ? 'bg-slate-900 hover:bg-slate-800 text-white'
                    : 'bg-white/20 hover:bg-white/30 text-white border border-white/20'
                }`}
              >
                Create Collection
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
