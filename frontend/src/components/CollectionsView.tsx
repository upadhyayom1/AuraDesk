import React, { useState } from 'react';
import { useWallpaper } from '../context/WallpaperContext';
import {
  FolderHeart,
  Plus,
  Trash2,
  Sparkles,
  Check,
  Layers,
  Calendar,
  X,
  ExternalLink,
} from 'lucide-react';
import { WallpaperCollection } from '../types/wallpaper';

interface CollectionsViewProps {
  onOpenAddCustom: () => void;
}

export const CollectionsView: React.FC<CollectionsViewProps> = ({ onOpenAddCustom }) => {
  const {
    collections,
    activeCollectionId,
    setActiveCollectionId,
    wallpapers,
    applyWallpaper,
    currentWallpaper,
    createCollection,
    deleteCollection,
    toggleWallpaperInCollection,
    glassTheme,
  } = useWallpaper();

  const isWhitish = glassTheme === 'whitish';

  const [selectedColId, setSelectedColId] = useState<string>(activeCollectionId);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [newColDesc, setNewColDesc] = useState('');

  const selectedCol = collections.find(c => c.id === selectedColId) || collections[0];
  const collectionWallpapers = wallpapers.filter(w => selectedCol?.wallpaperIds.includes(w.id));

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColName.trim()) return;
    const created = createCollection(newColName.trim(), newColDesc.trim());
    setSelectedColId(created.id);
    setNewColName('');
    setNewColDesc('');
    setIsCreatingNew(false);
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Top Banner & Header */}
      <div
        className={`flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 rounded-2xl border shrink-0 transition-all ${
          isWhitish
            ? 'mac-glass-whitish-card border-white/80 text-slate-800'
            : 'mac-glass-blackish-card border-white/18 text-slate-100 specular-sheen'
        }`}
      >
        <div>
          <h2 className={`text-base font-bold tracking-wide ${isWhitish ? 'text-slate-900' : 'text-white'}`}>
            Wallpaper Collections
          </h2>
          <p className={`text-xs ${isWhitish ? 'text-slate-600' : 'text-slate-400'}`}>
            Organize wallpapers into named themed sets. The active collection feeds the automatic
            rotation engine.
          </p>
        </div>

        <button
          onClick={() => setIsCreatingNew(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-400/30 text-xs font-medium transition-all shadow-sm active:scale-95 whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Collection</span>
        </button>
      </div>

      {/* Collection Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {collections.map(col => {
          const isActiveRotation = activeCollectionId === col.id;
          const isSelected = selectedColId === col.id;
          return (
            <div
              key={col.id}
              onClick={() => setSelectedColId(col.id)}
              className={`p-4 rounded-2xl cursor-pointer transition-all duration-200 flex flex-col justify-between space-y-3 border ${
                isSelected
                  ? isWhitish
                    ? 'bg-white/90 border-white shadow-lg text-slate-900 ring-2 ring-blue-500/50'
                    : 'bg-white/15 border-white/30 shadow-xl text-white'
                  : isWhitish
                  ? 'mac-glass-whitish-card border-white/60 text-slate-800 hover:bg-white/70'
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
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono whitespace-nowrap border ${
                        isWhitish
                          ? 'bg-blue-500/15 border-blue-400/30 text-blue-900 font-bold'
                          : 'bg-cyan-500/25 border-cyan-400/30 text-cyan-300'
                      }`}>
                        Active Loop
                      </span>
                    )}
                  </div>
                  <p className={`text-xs line-clamp-2 mt-1 ${isWhitish ? 'text-slate-500' : 'text-slate-400'}`}>
                    {col.description}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                <span className="font-mono text-slate-400 text-[11px] tabular-nums">
                  {col.wallpaperIds.length} wallpapers
                </span>

                <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                  {!isActiveRotation && (
                    <button
                      onClick={() => setActiveCollectionId(col.id)}
                      className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-medium border border-white/15 transition-all"
                    >
                      Set Active
                    </button>
                  )}
                  {!col.isSystem && collections.length > 1 && (
                    <button
                      onClick={() => deleteCollection(col.id)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Delete Collection"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Collection Detailed View */}
      {selectedCol && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-semibold text-white tracking-wide">
              Wallpapers in "{selectedCol.name}" ({collectionWallpapers.length})
            </h3>
            <button
              onClick={onOpenAddCustom}
              className="text-xs text-cyan-300 hover:text-cyan-200 transition-colors flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Custom Image</span>
            </button>
          </div>

          {collectionWallpapers.length === 0 ? (
            <div className="p-8 text-center rounded-2xl mac-glass-panel-dark border border-white/10 space-y-2">
              <p className="text-sm text-slate-300">This collection is currently empty.</p>
              <p className="text-xs text-slate-400">
                Go to the Discovery tab and click "Collections" on any wallpaper to add it here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {collectionWallpapers.map(wall => {
                const isCurrent = currentWallpaper.id === wall.id;
                return (
                  <div
                    key={wall.id}
                    className="relative rounded-2xl overflow-hidden mac-glass-card group border border-white/10 space-y-2 p-3"
                  >
                    <div className="relative aspect-video rounded-xl overflow-hidden">
                      <img
                        src={wall.imageUrl}
                        alt={wall.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {isCurrent && (
                        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-emerald-500/90 text-[10px] font-bold text-white shadow-md">
                          Active Desktop
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="text-xs font-semibold text-white truncate">{wall.title}</h4>
                      <p className="text-[11px] text-slate-400 truncate">{wall.sourceCredit}</p>
                    </div>

                    <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                      <button
                        onClick={() => toggleWallpaperInCollection(wall.id, selectedCol.id)}
                        className="text-rose-400/80 hover:text-rose-300 text-[11px] transition-colors"
                      >
                        Remove
                      </button>

                      <button
                        onClick={() => applyWallpaper(wall, 'manual')}
                        className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-medium border border-white/15"
                      >
                        Apply Now
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <form
            onSubmit={handleCreate}
            className="w-full max-w-md mac-glass-panel-dark rounded-3xl p-6 border border-white/20 shadow-2xl space-y-4 animate-in fade-in zoom-in-95"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">New Wallpaper Collection</h3>
              <button
                type="button"
                onClick={() => setIsCreatingNew(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Collection Name</label>
                <input
                  type="text"
                  required
                  value={newColName}
                  onChange={e => setNewColName(e.target.value)}
                  placeholder="e.g. Cyberpunk Synthwave or Evening Relax"
                  className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Description</label>
                <textarea
                  value={newColDesc}
                  onChange={e => setNewColDesc(e.target.value)}
                  rows={3}
                  placeholder="What kind of wallpapers fit in this collection?"
                  className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCreatingNew(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-cyan-500/30 hover:bg-cyan-500/40 text-cyan-100 border border-cyan-400/30 font-medium text-xs shadow-md"
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
