import React, { useState, useEffect, useRef } from "react";
import { Loader2, Heart, Shuffle, SkipBack, Play, Pause, SkipForward, Repeat, VolumeX, Volume2, Plus } from "lucide-react";
import { Track, Playlist } from "../types";
import { formatTime } from "../lib/utils";

interface PlayerProps {
  currentTrack: Track;
  isPlaying: boolean;
  isShuffled: boolean;
  isLooping: boolean;
  isMuted: boolean;
  progress: number;
  duration: number;
  volume: number;
  playbackError: string;
  togglePlay: () => void;
  toggleMute: () => void;
  toggleFavorite: (track: Track) => void;
  isFavorite: (track: Track) => boolean;
  setIsShuffled: (shuffled: boolean) => void;
  setIsLooping: (looping: boolean) => void;
  handleSeek: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleVolumeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleNext: () => void;
  handlePrev: () => void;
  playlists: Playlist[];
  addTrackToPlaylist: (playlistId: string, track: Track) => void;
  setShowCreatePlaylistModal: (show: boolean) => void;
}

export const Player: React.FC<PlayerProps> = ({
  currentTrack,
  isPlaying,
  isShuffled,
  isLooping,
  isMuted,
  progress,
  duration,
  volume,
  playbackError,
  togglePlay,
  toggleMute,
  toggleFavorite,
  isFavorite,
  setIsShuffled,
  setIsLooping,
  handleSeek,
  handleVolumeChange,
  handleNext,
  handlePrev,
  playlists,
  addTrackToPlaylist,
  setShowCreatePlaylistModal,
}) => {
  const [playlistMenuOpen, setPlaylistMenuOpen] = useState(false);
  const playlistMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (playlistMenuRef.current && !playlistMenuRef.current.contains(e.target as Node)) {
        setPlaylistMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  return (
    <footer className="fixed bottom-6 left-6 right-6 h-24 bg-[#0e1015] border border-white/5 rounded-2xl px-4 lg:px-6 flex items-center justify-between z-30 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] animate-player-slide-up">
      {/* Left: Track Info */}
      <div className="flex items-center gap-3 lg:gap-4 lg:w-1/4 lg:min-w-[200px] shrink-0">
        <div className="w-14 h-14 rounded-xl overflow-hidden relative shadow-lg border border-white/5 bg-slate-800 shrink-0 group/thumb">
          <img src={currentTrack.thumbnail} alt={currentTrack.title} className="w-full h-full object-cover" />
          {currentTrack.isResolving ? (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-[1px]">
              <Loader2 className="w-5 h-5 animate-spin text-white" />
            </div>
          ) : (
            <div className={`absolute inset-0 bg-black/45 flex items-end justify-center pb-3 gap-[3px] transition-opacity duration-300 ${
              isPlaying ? "opacity-100" : "opacity-0 group-hover/thumb:opacity-100"
            } ${isPlaying ? "animate-equalizer-running" : "animate-equalizer-paused"}`}>
              <div className="w-0.75 bg-indigo-400 rounded-full equalizer-bar equalizer-bar-1" />
              <div className="w-0.75 bg-indigo-400 rounded-full equalizer-bar equalizer-bar-2" />
              <div className="w-0.75 bg-indigo-400 rounded-full equalizer-bar equalizer-bar-3" />
              <div className="w-0.75 bg-indigo-400 rounded-full equalizer-bar equalizer-bar-4" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="font-bold text-sm truncate text-white">{currentTrack.title}</h4>
          <p className="text-xs text-slate-400 truncate mt-0.5">{currentTrack.uploaderName}</p>
        </div>
        <button
          onClick={() => toggleFavorite(currentTrack)}
          className={`p-2 rounded-lg transition-all shrink-0 cursor-pointer ${
            isFavorite(currentTrack) 
              ? "text-pink-500 hover:text-pink-400" 
              : "text-slate-500 hover:text-slate-300"
          }`}
        >
          <Heart className={`w-4.5 h-4.5 ${isFavorite(currentTrack) ? "fill-pink-500" : ""}`} />
        </button>

        {/* Add to Playlist button */}
        <div ref={playlistMenuRef} className="relative shrink-0 flex items-center">
          <button
            onClick={() => setPlaylistMenuOpen(!playlistMenuOpen)}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-300 transition-all cursor-pointer"
            title="Add to Playlist"
          >
            <Plus className="w-4.5 h-4.5" />
          </button>
          
          {playlistMenuOpen && (
            <div className="absolute left-0 bottom-full mb-2 w-48 overflow-hidden rounded-2xl border border-white/10 bg-[#12151b] shadow-2xl z-40">
              <div className="px-4 py-2 text-xs font-bold text-slate-500 border-b border-white/5 uppercase tracking-wider select-none">
                Add to Playlist
              </div>
              <div className="max-h-40 overflow-y-auto">
                {playlists.map((playlist) => (
                  <button
                    key={playlist.id}
                    onClick={() => {
                      addTrackToPlaylist(playlist.id, currentTrack);
                      setPlaylistMenuOpen(false);
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-all cursor-pointer truncate"
                  >
                    {playlist.name}
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  setShowCreatePlaylistModal(true);
                  setPlaylistMenuOpen(false);
                }}
                className="w-full px-4 py-2.5 text-left text-sm text-indigo-400 hover:bg-white/5 font-semibold border-t border-white/5 transition-all cursor-pointer"
              >
                + Create Playlist
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Center: Playback Progress & Controls */}
      <div className="flex flex-col items-center gap-2 flex-1 max-w-xl px-2 lg:px-4">
        <div className="flex items-center gap-6">
          <button
            onClick={() => setIsShuffled(!isShuffled)}
            className={`p-2 rounded-lg transition-all cursor-pointer ${
              isShuffled ? "text-indigo-400" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <Shuffle className="w-4 h-4" />
          </button>

          <button
            onClick={handlePrev}
            className="p-2 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <SkipBack className="w-5 h-5 fill-slate-400" />
          </button>

          <button
            onClick={togglePlay}
            className="w-12 h-12 rounded-full bg-white hover:bg-slate-200 text-slate-900 flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-95"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-slate-900" />
            ) : (
              <Play className="w-5 h-5 fill-slate-900 translate-x-0.5" />
            )}
          </button>

          <button
            onClick={handleNext}
            className="p-2 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <SkipForward className="w-5 h-5 fill-slate-400" />
          </button>

          <button
            onClick={() => setIsLooping(!isLooping)}
            className={`p-2 rounded-lg transition-all cursor-pointer ${
              isLooping ? "text-indigo-400" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <Repeat className="w-4 h-4" />
          </button>
        </div>

        {/* Seek Bar */}
        <div className="w-full flex items-center gap-3 group">
          <span className="text-2xs font-medium text-slate-400 w-10 text-right font-mono">
            {formatTime(progress)}
          </span>
          <div className="relative flex-1 h-3 flex items-center">
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={progress}
              onChange={handleSeek}
              style={{
                background: `linear-gradient(to right, #6366f1 ${(progress / (duration || 1)) * 100}%, rgba(255,255,255,0.05) ${(progress / (duration || 1)) * 100}%)`
              }}
              className="absolute w-full h-1.5 rounded-full appearance-none cursor-pointer outline-none transition-all group-hover:h-2
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#818cf8] [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(99,102,241,0.8)] [&::-webkit-slider-thumb]:opacity-0 group-hover:[&::-webkit-slider-thumb]:opacity-100 [&::-webkit-slider-thumb]:transition-opacity"
            />
          </div>
          <span className="text-2xs font-medium text-slate-500 w-10 text-left font-mono">
            {formatTime(duration)}
          </span>
        </div>

        {/* Playback Error Alert */}
        {playbackError && (
          <span className="absolute bottom-full mb-3 bg-red-950/80 border border-red-500/20 text-red-400 text-xs px-4 py-2 rounded-xl shadow-2xl backdrop-blur-md animate-fade-in">
            {playbackError}
          </span>
        )}
      </div>

      {/* Right: Volume & Extra Controls */}
      <div className="flex items-center gap-2 lg:gap-4 lg:w-1/4 justify-end lg:min-w-[200px] shrink-0">
        <button
          onClick={toggleMute}
          className="p-2 text-slate-400 hover:text-white transition-all cursor-pointer"
        >
          {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
        <div className="relative w-24 h-3 hidden lg:flex items-center group">
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            style={{
              background: `linear-gradient(to right, #6366f1 ${(isMuted ? 0 : volume) * 100}%, rgba(255,255,255,0.05) ${(isMuted ? 0 : volume) * 100}%)`
            }}
            className="absolute w-full h-1.5 rounded-full appearance-none cursor-pointer outline-none transition-all group-hover:h-2
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#818cf8] [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(99,102,241,0.8)] [&::-webkit-slider-thumb]:opacity-0 group-hover:[&::-webkit-slider-thumb]:opacity-100 [&::-webkit-slider-thumb]:transition-opacity"
          />
        </div>
      </div>
    </footer>
  );
};
