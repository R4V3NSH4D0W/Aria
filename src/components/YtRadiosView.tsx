import React from "react";
import { Radio, Play, Trash2 } from "lucide-react";
import { SavedRadio } from "../types";

interface YtRadiosViewProps {
  savedRadios: SavedRadio[];
  onSelectRadio: (radioId: string) => void;
  onDeleteRadio: (radioId: string, e: React.MouseEvent) => void;
}

export const YtRadiosView: React.FC<YtRadiosViewProps> = ({
  savedRadios,
  onSelectRadio,
  onDeleteRadio,
}) => {
  return (
    <div className="flex-1 p-6 lg:p-8 pb-36 lg:pb-36 overflow-y-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">
          YouTube Radios
        </h1>
        <p className="text-sm text-slate-400">
          Your saved YouTube Music mixes and dynamic radios. Paste a video or mix link to add more.
        </p>
      </div>

      {savedRadios.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white/[0.02] border border-white/5 rounded-2xl p-8 text-center">
          <Radio className="w-12 h-12 text-violet-400/40 mb-4 animate-pulse" />
          <h3 className="text-lg font-semibold text-slate-200 mb-1">No saved radios</h3>
          <p className="text-sm text-slate-400 max-w-sm">
            Paste a YouTube video link or dynamic mix link in the search bar to automatically generate and save a radio station.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
          {savedRadios.map((radio) => (
            <div
              key={radio.id}
              onClick={() => onSelectRadio(radio.id)}
              className="group relative transition-all duration-300 cursor-pointer hover:-translate-y-0.5"
            >
              {/* Thumbnail Container */}
              <div className="relative aspect-square w-full rounded-xl overflow-hidden mb-4 bg-slate-900 shadow-inner">
                {radio.thumbnail ? (
                  <img
                    src={radio.thumbnail}
                    alt={radio.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-violet-950/20">
                    <Radio className="w-10 h-10 text-violet-400/50" />
                  </div>
                )}
                
                {/* Play Hover Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                    <Play className="w-5 h-5 fill-white translate-x-0.5" />
                  </div>
                </div>

                {/* Delete Button (Upper Right) */}
                <button
                  onClick={(e) => onDeleteRadio(radio.id, e)}
                  className="absolute top-2.5 right-2.5 p-2 rounded-lg bg-black/60 hover:bg-red-500/80 text-slate-300 hover:text-white border border-white/5 transition-all duration-350 opacity-0 group-hover:opacity-100 z-10"
                  title="Remove Radio"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Title & Tracks count */}
              <h3 className="font-bold text-sm text-slate-100 truncate group-hover:text-white mb-1">
                {radio.title}
              </h3>
              <p className="text-xs text-slate-400 truncate">
                YouTube Music Radio
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
