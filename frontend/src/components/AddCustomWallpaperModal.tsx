import React, { useState } from 'react';
import { useWallpaper } from '../context/WallpaperContext';
import { X, Upload, Link as LinkIcon, Sparkles } from 'lucide-react';
import { WallpaperCategory } from '../types/wallpaper';

interface AddCustomWallpaperModalProps {
  onClose: () => void;
}

export const AddCustomWallpaperModal: React.FC<AddCustomWallpaperModalProps> = ({ onClose }) => {
  const { addCustomWallpaper, applyWallpaper, isNativeElectron, pickNativeLocalWallpapers, glassTheme } = useWallpaper();

  const isWhitish = glassTheme === 'whitish';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl || !title) return;

    const tags = tagsStr
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(Boolean);

    const created = await addCustomWallpaper({
      title: title.trim(),
      imageUrl: imageUrl.trim(),
      category,
      sourceCredit: sourceCredit.trim() || 'User Upload',
      width: 3840,
      height: 2160,
      aspectRatio: '16:9',
      tags,
    });

    await applyWallpaper(created, 'manual');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <form
        onSubmit={handleSubmit}
        className={`w-full max-w-lg rounded-3xl p-6 border shadow-2xl space-y-4 ${
          isWhitish ? 'mac-modal-light text-slate-900' : 'mac-modal-dark text-slate-100'
        }`}
      >
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold">Import Custom Wallpaper</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-slate-400 hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Preview Container */}
        <div
          className={`aspect-video w-full rounded-2xl overflow-hidden border flex items-center justify-center relative ${
            isWhitish ? 'bg-slate-100 border-slate-200' : 'bg-black/40 border-white/10'
          }`}
        >
          {imageUrl && !previewError ? (
            <img
              src={imageUrl}
              alt="Preview"
              className="w-full h-full object-cover"
              onError={() => setPreviewError(true)}
            />
          ) : (
            <div className={`text-center p-4 space-y-1 ${isWhitish ? 'text-slate-500' : 'text-slate-400'}`}>
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
                className={`w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-semibold shadow-xs transition-all active:scale-98 cursor-pointer ${
                  isWhitish
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                    : 'bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-200 border-cyan-400/30'
                }`}
              >
                <Upload className="w-3.5 h-3.5 text-cyan-400" />
                <span>Browse Files via Native macOS Dialog</span>
              </button>
              <div className={`text-center text-[10px] font-mono mt-2 ${isWhitish ? 'text-slate-400' : 'text-slate-500'}`}>
                — OR PASTE URL / UPLOAD —
              </div>
            </div>
          )}

          <div>
            <label className={`block font-medium mb-1 ${isWhitish ? 'text-slate-700' : 'text-slate-300'}`}>
              Image URL
            </label>
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
                className={`w-full pl-8 pr-3 py-2 rounded-xl border outline-none ${
                  isWhitish
                    ? 'bg-white border-slate-300 text-slate-900 focus:border-cyan-500'
                    : 'bg-black/40 border-white/15 text-white focus:border-cyan-400'
                }`}
              />
            </div>
          </div>

          {!isNativeElectron && (
            <>
              <div className={`text-center text-[11px] font-mono ${isWhitish ? 'text-slate-400' : 'text-slate-500'}`}>
                — OR LOCAL FILE —
              </div>

              <div>
                <label className={`block font-medium mb-1 ${isWhitish ? 'text-slate-700' : 'text-slate-300'}`}>
                  Upload Local Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className={`w-full text-xs file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-medium cursor-pointer ${
                    isWhitish
                      ? 'text-slate-600 file:bg-slate-200 file:text-slate-800'
                      : 'text-slate-400 file:bg-white/15 file:text-white hover:file:bg-white/25'
                  }`}
                />
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block font-medium mb-1 ${isWhitish ? 'text-slate-700' : 'text-slate-300'}`}>
                Wallpaper Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Pacific Coastline"
                className={`w-full px-3 py-2 rounded-xl border outline-none ${
                  isWhitish
                    ? 'bg-white border-slate-300 text-slate-900 focus:border-cyan-500'
                    : 'bg-black/40 border-white/15 text-white focus:border-cyan-400'
                }`}
              />
            </div>

            <div>
              <label className={`block font-medium mb-1 ${isWhitish ? 'text-slate-700' : 'text-slate-300'}`}>
                Category
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as any)}
                className={`w-full px-3 py-2 rounded-xl border outline-none ${
                  isWhitish ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-white/15 text-white'
                }`}
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
            <label className={`block font-medium mb-1 ${isWhitish ? 'text-slate-700' : 'text-slate-300'}`}>
              Tags (comma separated)
            </label>
            <input
              type="text"
              value={tagsStr}
              onChange={e => setTagsStr(e.target.value)}
              placeholder="minimal, dark, 5k"
              className={`w-full px-3 py-2 rounded-xl border outline-none ${
                isWhitish
                  ? 'bg-white border-slate-300 text-slate-900 focus:border-cyan-500'
                  : 'bg-black/40 border-white/15 text-white focus:border-cyan-400'
              }`}
            />
          </div>
        </div>

        <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
              isWhitish ? 'hover:bg-slate-200 text-slate-700' : 'hover:bg-white/10 text-slate-300'
            }`}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!imageUrl || !title}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-xs shadow-md transition-colors disabled:opacity-50"
          >
            Add & Apply
          </button>
        </div>
      </form>
    </div>
  );
};
