import React from "react";
import {
  ExternalLink,
  ChevronRight,
  XCircle,
  Layers,
  Image as ImageIcon,
  CheckCircle2,
  Upload,
} from "lucide-react";

interface Preset {
  url: string;
  preview: string | null;
}

interface AppearanceTabProps {
  customUrl: string;
  setCustomUrl: (url: string) => void;
  wallpaperUrl: string;
  applyWallpaper: (url: string) => void;
  wallpaperOpacity: number;
  setWallpaperOpacity: (opacity: number) => void;
  presets: Preset[];
}

export const AppearanceTab: React.FC<AppearanceTabProps> = ({
  customUrl,
  setCustomUrl,
  wallpaperUrl,
  applyWallpaper,
  wallpaperOpacity,
  setWallpaperOpacity,
  presets,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
      <div className="space-y-5">
        {/* Custom Wallpaper URL */}
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/15 flex items-center justify-center shrink-0">
              <ExternalLink className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Custom URL</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Paste a direct image or animated GIF link.
              </p>
            </div>
          </div>
          <div className="p-5 space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                placeholder="https://example.com/my-wallpaper.jpg"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && customUrl.trim()) {
                    applyWallpaper(customUrl.trim());
                  }
                }}
                className="min-w-0 flex-1 bg-black/30 border border-white/5 focus:border-indigo-500/40 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-700 focus:outline-none transition-colors"
              />
              <button
                onClick={() => applyWallpaper(customUrl.trim())}
                disabled={
                  !customUrl.trim() || customUrl.trim() === wallpaperUrl
                }
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shrink-0"
              >
                <ChevronRight className="w-4 h-4" />
                Apply
              </button>
            </div>
            {wallpaperUrl && (
              <button
                onClick={() => applyWallpaper("")}
                className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5" />
                Remove current wallpaper
              </button>
            )}
          </div>
        </div>

        {/* Local Wallpaper Upload */}
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/15 flex items-center justify-center shrink-0">
              <Upload className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Local Wallpaper</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload an image from your computer.
              </p>
            </div>
          </div>
          <div className="p-5">
            <label className="flex flex-col items-center justify-center border border-dashed border-white/10 hover:border-indigo-500/40 rounded-xl p-6 cursor-pointer hover:bg-white/[0.01] transition-all group">
              <Upload className="w-6 h-6 text-slate-500 group-hover:text-indigo-400 mb-2 transition-colors animate-pulse" />
              <span className="text-xs text-slate-300 font-semibold group-hover:text-white transition-colors">
                Select Image File
              </span>
              <span className="text-[10px] text-slate-500 mt-1">
                JPG, PNG, GIF or WEBP (Safely optimized)
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    const result = event.target?.result as string;
                    if (!result) return;
                    
                    const img = new Image();
                    img.onload = () => {
                      const canvas = document.createElement("canvas");
                      const MAX_WIDTH = 1920;
                      const MAX_HEIGHT = 1080;
                      let width = img.width;
                      let height = img.height;

                      if (width > height) {
                        if (width > MAX_WIDTH) {
                          height *= MAX_WIDTH / width;
                          width = MAX_WIDTH;
                        }
                      } else {
                        if (height > MAX_HEIGHT) {
                          width *= MAX_HEIGHT / height;
                          height = MAX_HEIGHT;
                        }
                      }

                      canvas.width = width;
                      canvas.height = height;
                      const ctx = canvas.getContext("2d");
                      ctx?.drawImage(img, 0, 0, width, height);

                      // Compress to JPEG with 0.75 quality (perfect compromise for localStorage limits)
                      const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.75);
                      applyWallpaper(compressedDataUrl);
                    };
                    img.src = result;
                  };
                  reader.readAsDataURL(file);
                }}
              />
            </label>
          </div>
        </div>

        {/* Opacity + Preview Card */}
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
            <div className="w-8 h-8 rounded-xl bg-pink-500/15 flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4 text-pink-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">
                Background Opacity
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Control how prominent your chosen wallpaper appears.
              </p>
            </div>
            <span className="ml-auto font-mono text-sm font-bold text-indigo-400 tabular-nums">
              {Math.round(wallpaperOpacity * 100)}%
            </span>
          </div>
          <div className="p-5">
            <div className="relative">
              <input
                type="range"
                min="0"
                max="0.95"
                step="0.05"
                value={wallpaperOpacity}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setWallpaperOpacity(val);
                  localStorage.setItem(
                    "aria_wallpaper_opacity",
                    val.toString()
                  );
                }}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-indigo-500 bg-white/10"
              />
              <div className="flex justify-between mt-2">
                <span className="text-xs text-slate-600">Subtle</span>
                <span className="text-xs text-slate-600">Vivid</span>
              </div>
            </div>
          </div>
        </div>

        {/* Preset Wallpapers */}
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/15 flex items-center justify-center shrink-0">
              <ImageIcon className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">
                Preset Backdrops
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Curated high-quality backgrounds for Aria.
              </p>
            </div>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-3 gap-3">
              {presets.map((preset, index) => {
                const isActive = wallpaperUrl === preset.url;
                return (
                  <button
                    key={preset.url || `none-${index}`}
                    onClick={() => applyWallpaper(preset.url)}
                    className={`relative rounded-xl overflow-hidden h-20 border text-xs font-semibold transition-all duration-200 cursor-pointer group ${
                      isActive
                        ? "border-indigo-500 ring-2 ring-indigo-500/30 scale-[1.02]"
                        : "border-white/5 hover:border-white/15 hover:scale-[1.01]"
                    }`}
                  >
                    {/* Background preview */}
                    {preset.url ? (
                      <div
                        className="absolute inset-0 bg-cover bg-center transition-all duration-300 group-hover:scale-105"
                        style={{ backgroundImage: `url(${preset.url})` }}
                      />
                    ) : (
                      <div className="absolute inset-0 bg-[#0a0b0e]" />
                    )}
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors" />
                    {/* Label */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                      {isActive ? (
                        <CheckCircle2 className="w-5 h-5 text-indigo-400 drop-shadow-lg" />
                      ) : (
                        !preset.url && (
                          <span className="relative z-10 text-[11px] font-semibold text-slate-300">
                            None
                          </span>
                        )
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
            <ImageIcon className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Live Preview</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Shows the current backdrop with cover fit.
            </p>
          </div>
        </div>
        <div className="p-5">
          <div className="relative aspect-video overflow-hidden rounded-xl border border-white/5 bg-[#0a0b0e]">
            {wallpaperUrl ? (
              <img
                src={wallpaperUrl}
                alt=""
                draggable={false}
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
                style={{ opacity: wallpaperOpacity }}
              />
            ) : (
              <div className="h-full w-full bg-[#0a0b0e]" />
            )}
            <div className="absolute inset-0 bg-black/20" />
          </div>
        </div>
      </div>
    </div>
  );
};
