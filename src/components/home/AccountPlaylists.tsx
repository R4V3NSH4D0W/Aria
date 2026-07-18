import React from "react";
import { ListMusic, Play } from "lucide-react";
import { YtPlaylist } from "../../types";

interface AccountPlaylistsProps {
  playlists: YtPlaylist[];
  onOpenPlaylist: (id: string) => void;
}

export const AccountPlaylists: React.FC<AccountPlaylistsProps> = ({
  playlists,
  onOpenPlaylist,
}) => {
  if (playlists.length === 0) return null;

  return (
    <section>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl p-2.5 bg-violet-500/20 text-violet-400">
            <ListMusic className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Your Playlists</h2>
            <p className="text-sm text-slate-400">
              Your YouTube Music playlists, ready to play.
            </p>
          </div>
        </div>
      </div>

      {/* Horizontal playlist cards */}
      <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-hide">
        {playlists.map((playlist) => (
          <button
            key={playlist.id}
            onClick={() => onOpenPlaylist(playlist.id)}
            className="group flex-none w-44 text-left focus:outline-none"
          >
            {/* Thumbnail */}
            <div className="relative w-44 h-44 rounded-2xl overflow-hidden mb-3 shadow-lg border border-white/5 transition-all duration-300 group-hover:shadow-2xl group-hover:border-white/10">
              {playlist.thumbnail ? (
                <img
                  src={playlist.thumbnail}
                  alt={playlist.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full bg-violet-900/30 flex items-center justify-center">
                  <ListMusic className="w-10 h-10 text-violet-400/60" />
                </div>
              )}

              {/* Play overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="w-11 h-11 rounded-full bg-violet-500 flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                  <Play className="w-5 h-5 fill-white text-white ml-0.5" />
                </div>
              </div>
            </div>

            {/* Title + subtitle */}
            <h3 className="font-semibold text-sm text-white truncate group-hover:text-violet-400 transition-colors">
              {playlist.title}
            </h3>
            {playlist.subtitle && (
              <p className="text-xs text-slate-400 truncate mt-0.5">
                {playlist.subtitle}
              </p>
            )}
          </button>
        ))}
      </div>
    </section>
  );
};
