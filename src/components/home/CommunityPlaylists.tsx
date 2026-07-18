import React from "react";
import { Users, ExternalLink } from "lucide-react";

export interface CommunityPlaylist {
  id: string;
  title: string;
  thumbnail: string;
  subtitle: string;
}

interface CommunityPlaylistsProps {
  playlists: CommunityPlaylist[];
  loading: boolean;
  onExplorePlaylist: (query: string) => void;
}

export const CommunityPlaylists: React.FC<CommunityPlaylistsProps> = ({
  playlists,
  loading,
  onExplorePlaylist,
}) => {
  if (!loading && playlists.length === 0) return null;

  return (
    <section>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="rounded-2xl p-2.5 bg-emerald-500/20 text-emerald-400">
          <Users className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white">From the Community</h2>
          <p className="text-sm text-slate-400">
            Trending playlists and new releases.
          </p>
        </div>
      </div>

      {/* Loading skeletons */}
      {loading ? (
        <div className="flex gap-5 overflow-x-hidden pb-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex-none w-44 animate-pulse">
              <div className="w-44 h-44 rounded-2xl bg-white/5 mb-3" />
              <div className="h-3 bg-white/5 rounded-lg w-4/5 mb-2" />
              <div className="h-2.5 bg-white/5 rounded-lg w-3/5" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-hide">
          {playlists.map((playlist, idx) => (
            <button
              key={`${playlist.id}-${idx}`}
              onClick={() => onExplorePlaylist(playlist.title)}
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
                  <div className="w-full h-full bg-emerald-900/20 flex items-center justify-center">
                    <Users className="w-10 h-10 text-emerald-400/40" />
                  </div>
                )}

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="w-11 h-11 rounded-full bg-emerald-600 flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                    <ExternalLink className="w-4 h-4 text-white" />
                  </div>
                </div>
              </div>

              {/* Title + subtitle */}
              <h3 className="font-semibold text-sm text-white truncate group-hover:text-emerald-400 transition-colors">
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
      )}
    </section>
  );
};
