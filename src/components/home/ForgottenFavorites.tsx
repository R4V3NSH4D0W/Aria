import React, { useMemo } from "react";
import { Heart, Shuffle, Play } from "lucide-react";
import { Track } from "../../types";

interface ForgottenFavoritesProps {
  favorites: Track[];
  recentlyPlayed: Track[];
  playSongs: (songs: Track[], shuffle: boolean, startFromTrackId?: string) => void;
  currentTrack: Track | null;
  isPlaying: boolean;
}

export const ForgottenFavorites: React.FC<ForgottenFavoritesProps> = ({
  favorites,
  recentlyPlayed,
  playSongs,
  currentTrack,
  isPlaying,
}) => {
  // Compute forgotten favorites: liked tracks not in recently played (last 20)
  const forgottenFavorites = useMemo(() => {
    const recentIds = new Set(recentlyPlayed.map((t) => t.videoId));
    const forgotten = favorites.filter((t) => !recentIds.has(t.videoId));
    // Shuffle deterministically for freshness but cap at 20
    return forgotten.slice(0, 20);
  }, [favorites, recentlyPlayed]);

  if (forgottenFavorites.length === 0) return null;

  return (
    <section>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl p-2.5 bg-rose-500/20 text-rose-400">
            <Heart className="w-5 h-5 fill-rose-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Forgotten Favorites</h2>
            <p className="text-sm text-slate-400">
              Songs you loved — but haven't played in a while.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => playSongs(forgottenFavorites, false)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-white/5 border border-white/5 rounded-lg hover:bg-white/10 cursor-pointer transition-colors"
          >
            <Play className="w-3.5 h-3.5 fill-white text-white" />
            <span>Play All</span>
          </button>
          <button
            onClick={() => playSongs(forgottenFavorites, true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-white/5 border border-white/5 rounded-lg hover:bg-white/10 cursor-pointer transition-colors"
          >
            <Shuffle className="w-3.5 h-3.5 text-white" />
            <span>Shuffle</span>
          </button>
        </div>
      </div>

      {/* Horizontal list layout (like QuickPicks but smaller rows) */}
      <div className="overflow-x-auto scrollbar-hide pb-2">
        <div
          className="grid gap-0"
          style={{
            display: "grid",
            gridTemplateRows: "repeat(4, auto)",
            gridAutoFlow: "column",
            gridAutoColumns: "minmax(240px, 260px)",
          }}
        >
          {forgottenFavorites.map((track, idx) => {
            const isCurrentTrack = currentTrack?.videoId === track.videoId;
            return (
              <button
                key={`${track.videoId}-${idx}`}
                onClick={() => playSongs(forgottenFavorites, false, track.videoId)}
                className={`group flex items-center gap-3 p-3 rounded-xl transition-all duration-200 text-left
                  ${isCurrentTrack
                    ? "bg-rose-500/15 border border-rose-500/30"
                    : "hover:bg-white/5 border border-transparent"
                  }`}
              >
                {/* Thumbnail */}
                <div className="relative flex-none w-12 h-12 rounded-lg overflow-hidden shadow-md">
                  <img
                    src={track.thumbnail}
                    alt={track.title}
                    className="w-full h-full object-cover"
                  />
                  {/* Playing indicator overlay */}
                  {isCurrentTrack && isPlaying && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="flex gap-0.5 h-3 items-end">
                        <div className="w-0.5 bg-rose-400 h-full animate-bounce" />
                        <div
                          className="w-0.5 bg-rose-400 h-2/3 animate-bounce"
                          style={{ animationDelay: "0.1s" }}
                        />
                        <div
                          className="w-0.5 bg-rose-400 h-4/5 animate-bounce"
                          style={{ animationDelay: "0.2s" }}
                        />
                      </div>
                    </div>
                  )}
                  {/* Hover play icon */}
                  {(!isCurrentTrack || !isPlaying) && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Play className="w-4 h-4 fill-white text-white ml-0.5" />
                    </div>
                  )}
                </div>

                {/* Track info */}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium truncate transition-colors ${
                      isCurrentTrack ? "text-rose-300" : "text-white group-hover:text-rose-300"
                    }`}
                  >
                    {track.title}
                  </p>
                  <p className="text-xs text-slate-400 truncate mt-0.5">
                    {track.uploaderName}
                  </p>
                </div>

                {/* Heart badge */}
                <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500 flex-none opacity-60 group-hover:opacity-100 transition-opacity" />
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
