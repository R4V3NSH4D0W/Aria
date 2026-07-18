import React from "react";
import {
  Play,
  Pause,
  Loader2,
  ListPlus,
  Plus,
  Heart,
  Trash2,
  Clock,
} from "lucide-react";
import { Track, Playlist } from "../types";
import { formatTime } from "../lib/utils";

interface TrackItemProps {
  track: Track;
  isCurrent: boolean;
  isPlaying: boolean;
  activeDropdownTrackId: string | null;
  setActiveDropdownTrackId: (id: string | null) => void;
  playlists: Playlist[];
  addTrackToPlaylist: (playlistId: string, track: Track) => void;
  addTrackToQueue: (track: Track) => void;
  toggleFavorite: (track: Track) => void;
  isFavorite: (track: Track) => boolean;
  activeTab: string;
  removeTrackFromPlaylist: (playlistId: string, videoId: string) => void;
  playTrack: (track: Track) => void;
  setShowCreatePlaylistModal: (show: any) => void;
}

export const TrackItem: React.FC<TrackItemProps> = ({
  track,
  isCurrent,
  isPlaying,
  activeDropdownTrackId,
  setActiveDropdownTrackId,
  playlists,
  addTrackToPlaylist,
  addTrackToQueue,
  toggleFavorite,
  isFavorite,
  activeTab,
  removeTrackFromPlaylist,
  playTrack,
  setShowCreatePlaylistModal,
}) => {
  return (
    <div
      onClick={() => playTrack(track)}
      className={`group flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-300 cursor-pointer ${
        activeDropdownTrackId === track.videoId ? "relative z-30" : ""
      } ${
        isCurrent
          ? "bg-[#161920]/80 border-indigo-500/30 text-white shadow-lg backdrop-blur-sm"
          : "bg-[#0e1015]/40 border-white/5 hover:bg-[#12151c]/60 backdrop-blur-sm text-slate-300"
      }`}
    >
      <div className="flex items-center gap-4 min-w-0">
        {/* Thumbnail / Hover Play Icon */}
        <div className="w-12 h-12 rounded-xl overflow-hidden relative shrink-0 shadow-lg border border-white/5 bg-slate-800">
          <img
            src={track.thumbnail}
            alt={track.title}
            className="w-full h-full object-cover"
          />
          {/* Equalizer Wave Overlay (visible when current song is active, hidden on hover to reveal play/pause) */}
          {isCurrent && (
            <div className={`absolute inset-0 bg-black/45 flex items-end justify-center pb-2.5 gap-[2px] transition-opacity duration-300 group-hover:opacity-0 ${
              isPlaying ? "opacity-100 animate-equalizer-running" : "opacity-100 animate-equalizer-paused"
            }`}>
              <div className="w-0.75 bg-indigo-400 rounded-full equalizer-bar equalizer-bar-1" />
              <div className="w-0.75 bg-indigo-400 rounded-full equalizer-bar equalizer-bar-2" />
              <div className="w-0.75 bg-indigo-400 rounded-full equalizer-bar equalizer-bar-3" />
            </div>
          )}
          {/* Hover Control Overlay */}
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {isCurrent && isPlaying ? (
              <Pause className="w-5 h-5 text-white" />
            ) : (
              <Play className="w-5 h-5 text-white fill-white" />
            )}
          </div>
        </div>

        <div className="min-w-0">
          <h4 className="font-semibold text-sm truncate pr-2">{track.title}</h4>
          <p className="text-xs text-slate-400 truncate mt-0.5">
            {track.uploaderName}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {/* Add Track Spinner */}
        {track.isResolving && (
          <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            addTrackToQueue(track);
          }}
          className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-indigo-300 transition-all cursor-pointer"
          title="Add to queue"
        >
          <ListPlus className="w-4 h-4" />
        </button>

        {/* Click-to-open Playlist Add Selector */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setActiveDropdownTrackId(
                activeDropdownTrackId === track.videoId ? null : track.videoId,
              );
            }}
            className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
          </button>
          {activeDropdownTrackId === track.videoId && (
            <div
              className="absolute right-0 top-full mt-1 w-48 bg-[#161920] border border-white/10 rounded-xl shadow-2xl py-1 z-20"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="block px-4 py-1.5 text-[9px] font-bold text-slate-500 tracking-wider uppercase">
                Add to Playlist
              </span>
              {playlists.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    addTrackToPlaylist(p.id, track);
                    setActiveDropdownTrackId(null);
                  }}
                  className="w-full text-left px-4 py-2 text-xs text-slate-300 hover:bg-white/5 hover:text-white transition-all truncate cursor-pointer"
                >
                  {p.name}
                </button>
              ))}
              <button
                onClick={() => {
                  setShowCreatePlaylistModal(track);
                  setActiveDropdownTrackId(null);
                }}
                className="w-full text-left px-4 py-2 text-xs text-indigo-400 hover:bg-white/5 hover:text-indigo-300 font-semibold border-t border-white/5 transition-all cursor-pointer"
              >
                + Create playlist...
              </button>
            </div>
          )}
        </div>

        {/* Favorite Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(track);
          }}
          className={`p-2 rounded-lg transition-all ${
            isFavorite(track)
              ? "text-pink-500 hover:text-pink-400"
              : "text-slate-500 hover:text-slate-300"
          }`}
        >
          <Heart
            className={`w-4.5 h-4.5 ${isFavorite(track) ? "fill-pink-500" : ""}`}
          />
        </button>

        {/* Delete from current playlist button */}
        {activeTab !== "search" && activeTab !== "favorites" && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              removeTrackFromPlaylist(activeTab, track.videoId);
            }}
            className="p-2 rounded-lg hover:bg-white/10 text-slate-500 hover:text-red-400 transition-all cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}

        <div className="flex items-center gap-1 text-xs text-slate-400 font-medium">
          <Clock className="w-3.5 h-3.5" />
          <span>{formatTime(track.duration)}</span>
        </div>
      </div>
    </div>
  );
};
