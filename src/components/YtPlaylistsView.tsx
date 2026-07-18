import React from "react";
import { ListMusic, Play } from "lucide-react";
import { YtPlaylist } from "../types";

interface YtPlaylistsViewProps {
  ytPlaylists: YtPlaylist[];
  onSelectPlaylist: (playlistId: string) => void;
}

export const YtPlaylistsView: React.FC<YtPlaylistsViewProps> = ({
  ytPlaylists,
  onSelectPlaylist,
}) => {
  return (
    <div className="flex-1 p-6 lg:p-8 overflow-y-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">
          YouTube Playlists
        </h1>
        <p className="text-sm text-slate-400">
          Your synced YouTube Music library playlists and custom mixes.
        </p>
      </div>

      {ytPlaylists.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white/[0.02] border border-white/5 rounded-2xl p-8 text-center">
          <ListMusic className="w-12 h-12 text-violet-400/40 mb-4" />
          <h3 className="text-lg font-semibold text-slate-200 mb-1">No playlists synced</h3>
          <p className="text-sm text-slate-400 max-w-sm mb-6">
            Make sure your YouTube cookie is set in Settings, then click "Sync Playlists".
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
          {ytPlaylists.map((playlist) => (
            <div
              key={playlist.id}
              onClick={() => onSelectPlaylist(playlist.id)}
              className="group relative transition-all duration-300 cursor-pointer hover:-translate-y-0.5"
            >
              {/* Thumbnail Container */}
              <div className="relative aspect-square w-full rounded-xl overflow-hidden mb-4 bg-slate-900 shadow-inner">
                {playlist.thumbnail ? (
                  <img
                    src={playlist.thumbnail}
                    alt={playlist.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-violet-950/20">
                    <ListMusic className="w-10 h-10 text-violet-400/50" />
                  </div>
                )}
                
                {/* Play Hover Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                    <Play className="w-5 h-5 fill-white translate-x-0.5" />
                  </div>
                </div>
              </div>

              {/* Title & Tracks count */}
              <h3 className="font-bold text-sm text-slate-100 truncate group-hover:text-white mb-1">
                {playlist.title}
              </h3>
              <p className="text-xs text-slate-400 truncate">
                {playlist.subtitle || "YouTube Playlist"}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
