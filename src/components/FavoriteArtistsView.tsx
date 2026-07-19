import React from "react";
import { Users, Play, Pin, UserMinus } from "lucide-react";
import { FavoriteArtist } from "../types";

interface FavoriteArtistsViewProps {
  favoriteArtists: FavoriteArtist[];
  onSelectArtist: (browseId: string) => void;
  onUnfavoriteArtist: (artist: { browseId: string; name: string; thumbnail: string }) => void;
  onTogglePin: (browseId: string) => void;
}

export const FavoriteArtistsView: React.FC<FavoriteArtistsViewProps> = ({
  favoriteArtists,
  onSelectArtist,
  onUnfavoriteArtist,
  onTogglePin,
}) => {
  return (
    <div className="flex-1 p-6 lg:p-8 pb-36 lg:pb-36 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 pb-6 border-b border-white/5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">
            Subscriptions
          </h1>
          <p className="text-sm text-slate-400">
            Your collection of subscribed artists. Click to load their profile.
          </p>
        </div>
      </div>

      {favoriteArtists.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white/[0.02] border border-white/5 rounded-2xl p-8 text-center">
          <Users className="w-12 h-12 text-pink-400/40 mb-4 animate-pulse" />
          <h3 className="text-lg font-semibold text-slate-200 mb-1">No subscriptions yet</h3>
          <p className="text-sm text-slate-400 max-w-sm">
            Search for an artist and click the Subscribe button on their profile page to save them here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
          {favoriteArtists.map((artist) => (
            <div
              key={artist.browseId}
              onClick={() => onSelectArtist(artist.browseId)}
              className="group relative transition-all duration-300 cursor-pointer hover:-translate-y-0.5"
            >
              {/* Avatar Container */}
              <div className="relative aspect-square w-full rounded-2xl overflow-hidden mb-4 bg-slate-900 shadow-inner border border-white/10">
                <img
                  src={artist.thumbnail}
                  alt={artist.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                
                {/* Play Hover Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-pink-600 hover:bg-pink-500 text-white flex items-center justify-center shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                    <Play className="w-5 h-5 fill-white translate-x-0.5" />
                  </div>
                </div>

                {/* Actions Overlay (Upper Right) */}
                <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePin(artist.browseId);
                    }}
                    className={`p-2 rounded-full bg-black/70 border border-white/5 transition-all duration-300 ${
                      artist.isPinned
                        ? "text-amber-400 hover:bg-amber-500/80 hover:text-white"
                        : "text-slate-400 hover:bg-indigo-600/80 hover:text-white"
                    }`}
                    title={artist.isPinned ? "Unpin from Sidebar" : "Pin to Sidebar"}
                  >
                    <Pin className={`w-3.5 h-3.5 ${artist.isPinned ? "fill-amber-400 text-amber-400" : ""}`} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onUnfavoriteArtist(artist);
                    }}
                    className="p-2 rounded-full bg-black/70 hover:bg-red-950/80 text-slate-400 hover:text-red-400 border border-white/5 transition-all duration-300"
                    title="Unsubscribe"
                  >
                    <UserMinus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Title */}
              <div className="text-center">
                <h3 className="font-bold text-sm text-slate-100 truncate group-hover:text-white mb-1">
                  {artist.name}
                </h3>
                <p className="text-xs text-slate-400 truncate">
                  Artist Profile
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
