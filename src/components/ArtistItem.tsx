import React, { useState } from "react";
import { Disc, Play } from "lucide-react";
import { ArtistItem as ArtistItemType } from "../types";

interface ArtistItemProps {
  artist: ArtistItemType;
  onClick: () => void;
}

export const ArtistItem: React.FC<ArtistItemProps> = ({ artist, onClick }) => {
  const [imgError, setImgError] = useState(false);

  return (
    <div
      onClick={onClick}
      className="group flex items-center justify-between p-3.5 rounded-2xl border border-white/5 bg-[#0e1015]/40 hover:bg-[#12151c]/60 backdrop-blur-sm text-slate-300 hover:text-white transition-all duration-300 cursor-pointer shadow-md hover:shadow-lg hover:border-indigo-500/20"
    >
      <div className="flex items-center gap-4 min-w-0">
        {/* Circular Avatar */}
        <div className="w-14 h-14 rounded-full overflow-hidden relative shrink-0 shadow-lg border border-white/5 bg-slate-800 flex items-center justify-center">
          {!imgError && artist.thumbnail ? (
            <img
              src={artist.thumbnail}
              alt={artist.title}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <Disc className="w-6 h-6 text-indigo-400/60 animate-[spin_12s_linear_infinite]" />
          )}
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <Play className="w-5 h-5 text-indigo-400 fill-indigo-400" />
          </div>
        </div>

        <div className="min-w-0">
          <h4 className="font-semibold text-sm truncate pr-2 group-hover:text-indigo-300 transition-colors">
            {artist.title}
          </h4>
          <p className="text-xs text-slate-500 font-medium uppercase mt-0.5 tracking-wider">
            Artist
          </p>
        </div>
      </div>

      <div className="flex items-center pr-2 shrink-0">
        <span className="text-[10px] text-slate-500 group-hover:text-indigo-400 transition-colors uppercase tracking-wider font-semibold border border-white/5 group-hover:border-indigo-500/20 px-2 py-0.5 rounded-md">
          View Artist
        </span>
      </div>
    </div>
  );
};
