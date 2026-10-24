import React, { useState } from 'react';
import { useWallpaper } from '../context/WallpaperContext';
import { X, Upload, Link as LinkIcon, Sparkles } from 'lucide-react';
import { WallpaperCategory } from '../types/wallpaper';

interface AddCustomWallpaperModalProps {
  onClose: () => void;
}

export const AddCustomWallpaperModal: React.FC<AddCustomWallpaperModalProps> = ({ onClose }) => {
  const { addCustomWallpaper, applyWallpaper, isNativeElectron, pickNativeLocalWallpapers } = useWallpaper();

  const [title, setTitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [category, setCategory] = useState<WallpaperCategory>('nature');
  const [sourceCredit, setSourceCredit] = useState('Personal Local Upload');
  const [tagsStr, setTagsStr] = useState('custom, 4k');
  const [previewError, setPreviewError] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!title) {
      setTitle(file.name.replace(/\.[^/.]+$/, ''));
    }

    const reader = new FileReader();
    reader.onload = event => {
      if (typeof event.target?.result === 'string') {
        setImageUrl(event.target.result);
        setPreviewError(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl || !title) return;

    const tags = tagsStr
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(Boolean);

    const created = addCustomWallpaper({
      title: title.trim(),
      imageUrl: imageUrl.trim(),
      category,
      sourceCredit: sourceCredit.trim() || 'User Upload',
      width: 3840,
      height: 2160,
      aspectRatio: '16:9',
      tags,
    });

    applyWallpaper(created, 'manual');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg mac-glass-panel-dark rounded-3xl p-6 border border-white/20 shadow-2xl space-y-4 animate-in fade-in zoom-in-95"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-300" />
            <h3 className="text-base font-bold text-white">Import Custom Wallpaper</h3>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Preview Container */}
        <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black/40 border border-white/10 flex items-center justify-center relative">
          {imageUrl && !previewError ? (
            <img
              src={imageUrl}
              alt="Preview"
              className="w-full h-full object-cover"
              onError={() => setPreviewError(true)}
            />
          ) : (
            <div className="text-center p-4 text-slate-400 space-y-1">
              <Upload className="w-6 h-6 mx-auto opacity-50" />
              <p className="text-xs">Provide an image URL or choose a local file</p>
            </div>
          )}
        </div>

        <div className="space-y-3 text-xs">
          {isNativeElectron && (
            <div>
              <button
                type="button"
                onClick={async () => {
                  const picked = await pickNativeLocalWallpapers();
                  if (picked && picked.length > 0) {
                    onClose();
                  }
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 text-cyan-200 border border-cyan-400/40 text-xs font-semibold shadow-sm transition-all active:scale-98"
              >
                <Upload className="w-3.5 h-3.5 text-cyan-300" />
                <span>Browse Files via Native macOS Dialog</span>
              </button>
              <div className="text-center text-slate-500 text-[10px] font-mono mt-2">— OR PASTE URL / UPLOAD —</div>
            </div>
          )}

          <div>
            <label className="block text-slate-300 font-medium mb-1">Image URL</label>
            <div className="relative">
              <LinkIcon className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
              <input
                type="url"
                value={imageUrl}
                onChange={e => {
                  setImageUrl(e.target.value);
                  setPreviewError(false);
                }}
                placeholder="https://images.unsplash.com/..."
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-white/10 border border-white/15 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          {!isNativeElectron && (
            <>
              <div className="text-center text-slate-500 text-[11px] font-mono">— OR LOCAL FILE —</div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Upload Local Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="w-full text-slate-400 text-xs file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-medium file:bg-white/15 file:text-white hover:file:bg-white/25 cursor-pointer"
                />
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Wallpaper Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Pacific Coastline"
                className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/15 text-white"
              >
                <option value="nature">Nature</option>
                <option value="minimalist">Minimalist</option>
                <option value="cyberpunk">Cyberpunk</option>
                <option value="architecture">Architecture</option>
                <option value="space">Space</option>
                <option value="abstract">Abstract Glass</option>
                <option value="moody">Moody & Rain</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Tags (comma separated)</label>
            <input
              type="text"
              value={tagsStr}
              onChange={e => setTagsStr(e.target.value)}
              placeholder="minimal, dark, 5k"
              className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400"
            />
          </div>
        </div>

        <div className="pt-2 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs text-slate-300 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!imageUrl || !title}
            className="px-4 py-2 rounded-xl bg-cyan-500/30 hover:bg-cyan-500/40 text-cyan-100 border border-cyan-400/30 font-medium text-xs shadow-md disabled:opacity-50"
          >
            Add & Apply
          </button>
        </div>
      </form>
    </div>
  );
};
