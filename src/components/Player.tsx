import React, { useState, useEffect, useRef } from "react";
import { Loader2, Heart, Shuffle, SkipBack, Play, Pause, SkipForward, Repeat, Repeat1, VolumeX, Volume2, Plus, MessageSquareText, Moon, Minimize2, LayoutGrid } from "lucide-react";
import { Track, Playlist } from "../types";
import { formatTime } from "../lib/utils";

interface PlayerProps {
  currentTrack: Track;
  isPlaying: boolean;
  isShuffled: boolean;
  repeatMode: "none" | "all" | "one";
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
  setRepeatMode: (mode: "none" | "all" | "one") => void;
  handleSeek: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleVolumeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleNext: () => void;
  handlePrev: () => void;
  playlists: Playlist[];
  addTrackToPlaylist: (playlistId: string, track: Track) => void;
  setShowCreatePlaylistModal: (show: boolean) => void;
  showLyricsMode: boolean;
  setShowLyricsMode: (show: boolean) => void;
  loadArtist?: (browseId: string) => void;
  sleepTimerTimeLeft: number | null;
  setSleepTimerTimeLeft: (time: number | null) => void;
  sleepAtTrackEnd: boolean;
  setSleepAtTrackEnd: (enabled: boolean) => void;
  isMiniMode: boolean;
  toggleMiniMode: () => void;
}

export const Player: React.FC<PlayerProps> = ({
  currentTrack,
  isPlaying,
  isShuffled,
  repeatMode,
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
  setRepeatMode,
  handleSeek,
  handleVolumeChange,
  handleNext,
  handlePrev,
  playlists,
  addTrackToPlaylist,
  setShowCreatePlaylistModal,
  showLyricsMode,
  setShowLyricsMode,
  loadArtist,
  sleepTimerTimeLeft,
  setSleepTimerTimeLeft,
  sleepAtTrackEnd,
  setSleepAtTrackEnd,
  isMiniMode,
  toggleMiniMode,
}) => {
  const [playlistMenuOpen, setPlaylistMenuOpen] = useState(false);
  const playlistMenuRef = useRef<HTMLDivElement | null>(null);
  const [sleepMenuOpen, setSleepMenuOpen] = useState(false);
  const sleepMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (playlistMenuRef.current && !playlistMenuRef.current.contains(e.target as Node)) {
        setPlaylistMenuOpen(false);
      }
      if (sleepMenuRef.current && !sleepMenuRef.current.contains(e.target as Node)) {
        setSleepMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  return (
    <footer className="fixed bottom-6 left-6 right-6 h-24 bg-[#0e1015]/60 backdrop-blur-xl border border-white/10 rounded-2xl px-4 lg:px-6 flex items-center justify-between z-30 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] animate-player-slide-up gap-4">
      {/* Left: Track Info */}
      <div className="flex items-center gap-3 lg:gap-4 w-1/3 min-w-[160px] max-w-[280px] shrink-0">
        <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-xl overflow-hidden relative shadow-lg border border-white/5 bg-slate-800 shrink-0 group/thumb">
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
          <h4 className="font-bold text-xs lg:text-sm truncate text-white">{currentTrack.title}</h4>
          <p className="text-[10px] lg:text-xs text-slate-400 truncate mt-0.5">
            {currentTrack.artists && currentTrack.artists.length > 0 && loadArtist ? (
              currentTrack.artists.map((artist, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && " & "}
                  <span
                    onClick={() => loadArtist(artist.id || artist.name)}
                    className="hover:underline hover:text-indigo-400 cursor-pointer transition-colors"
                  >
                    {artist.name}
                  </span>
                </React.Fragment>
              ))
            ) : currentTrack.uploaderName && loadArtist ? (
              <span
                onClick={() => loadArtist(currentTrack.artistId || currentTrack.uploaderName)}
                className="hover:underline hover:text-indigo-400 cursor-pointer transition-colors"
              >
                {currentTrack.uploaderName}
              </span>
            ) : (
              currentTrack.uploaderName
            )}
          </p>
        </div>
        <button
          onClick={() => toggleFavorite(currentTrack)}
          className={`p-1.5 rounded-lg transition-all shrink-0 cursor-pointer ${
            isFavorite(currentTrack) 
              ? "text-pink-500 hover:text-pink-400" 
              : "text-slate-500 hover:text-slate-300"
          }`}
        >
          <Heart className={`w-4 h-4 lg:w-4.5 lg:h-4.5 ${isFavorite(currentTrack) ? "fill-pink-500" : ""}`} />
        </button>

        {/* Add to Playlist button */}
        <div ref={playlistMenuRef} className="relative shrink-0 flex items-center">
          <button
            onClick={() => setPlaylistMenuOpen(!playlistMenuOpen)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 transition-all cursor-pointer"
            title="Add to Playlist"
          >
            <Plus className="w-4 h-4 lg:w-4.5 lg:h-4.5" />
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
      <div className="flex flex-col items-center gap-1.5 flex-1 max-w-lg min-w-0 relative">
        <div className="flex items-center gap-4 lg:gap-6">
          <button
            onClick={() => setIsShuffled(!isShuffled)}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              isShuffled ? "text-indigo-400" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <Shuffle className="w-3.5 h-3.5 lg:w-4 h-4" />
          </button>

          <button
            onClick={handlePrev}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <SkipBack className="w-4.5 h-4.5 lg:w-5 h-5 fill-slate-400" />
          </button>

          <button
            onClick={togglePlay}
            className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-white hover:bg-slate-200 text-slate-900 flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-95 shrink-0"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 lg:w-5 h-5 fill-slate-900" />
            ) : (
              <Play className="w-4 h-4 lg:w-5 h-5 fill-slate-900 translate-x-0.5" />
            )}
          </button>

          <button
            onClick={handleNext}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <SkipForward className="w-4.5 h-4.5 lg:w-5 h-5 fill-slate-400" />
          </button>

          <button
            onClick={() => {
              const modes: ("none" | "all" | "one")[] = ["none", "all", "one"];
              const nextMode = modes[(modes.indexOf(repeatMode) + 1) % modes.length];
              setRepeatMode(nextMode);
            }}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              repeatMode !== "none" ? "text-indigo-400" : "text-slate-500 hover:text-slate-300"
            }`}
            title={
              repeatMode === "none"
                ? "Repeat: Off"
                : repeatMode === "all"
                ? "Repeat: All"
                : "Repeat: One"
            }
          >
            {repeatMode === "one" ? (
              <Repeat1 className="w-3.5 h-3.5 lg:w-4 h-4" />
            ) : (
              <Repeat className="w-3.5 h-3.5 lg:w-4 h-4" />
            )}
          </button>
        </div>

        {/* Seek Bar */}
        <div className="w-full flex items-center gap-2 group">
          <span className="text-[10px] font-medium text-slate-400 w-8 text-right font-mono shrink-0">
            {formatTime(progress)}
          </span>
          <div className="relative flex-1 h-3 flex items-center min-w-0">
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={progress}
              onChange={handleSeek}
              style={{
                background: `linear-gradient(to right, #6366f1 ${(progress / (duration || 1)) * 100}%, rgba(255,255,255,0.05) ${(progress / (duration || 1)) * 100}%)`
              }}
              className="absolute w-full h-1 rounded-full appearance-none cursor-pointer outline-none transition-all group-hover:h-1.5
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#818cf8] [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(99,102,241,0.8)] [&::-webkit-slider-thumb]:opacity-0 group-hover:[&::-webkit-slider-thumb]:opacity-100 [&::-webkit-slider-thumb]:transition-opacity"
            />
          </div>
          <span className="text-[10px] font-medium text-slate-500 w-8 text-left font-mono shrink-0">
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
      <div className="flex items-center gap-2 lg:gap-3 w-1/3 min-w-[80px] max-w-[200px] justify-end shrink-0">
        
        {/* Utility Toolbox: Sleep Timer & Mini Mode (Hover Reveal) */}
        <div className="relative flex items-center group/tools py-2">
          <button className="p-2 text-slate-400 hover:text-white transition-all cursor-pointer">
            <LayoutGrid className="w-4.5 h-4.5 lg:w-5 h-5" />
          </button>
          
          <div className="absolute bottom-full right-0 mb-2 bg-[#0e1015]/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-1.5 flex items-center gap-1 shadow-2xl opacity-0 scale-90 pointer-events-none group-hover/tools:opacity-100 group-hover/tools:scale-100 group-hover/tools:pointer-events-auto transition-all duration-200 z-50">
            {/* Sleep Timer */}
            <div className="relative" ref={sleepMenuRef}>
              <button
                onClick={() => setSleepMenuOpen(!sleepMenuOpen)}
                className={`p-2 rounded-xl transition-all cursor-pointer hover:bg-white/5 flex items-center gap-1 ${
                  sleepTimerTimeLeft !== null || sleepAtTrackEnd
                    ? "text-indigo-400 font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Sleep timer"
              >
                <Moon className={`w-4 h-4 ${sleepTimerTimeLeft !== null || sleepAtTrackEnd ? "fill-current" : ""}`} />
                {(sleepTimerTimeLeft !== null || sleepAtTrackEnd) && (
                  <span className="text-[9px] font-mono select-none">
                    {sleepAtTrackEnd ? "End" : formatTime(sleepTimerTimeLeft || 0)}
                  </span>
                )}
              </button>

              {sleepMenuOpen && (
                <div className="absolute bottom-full right-0 mb-2 w-48 bg-[#0e1015]/95 backdrop-blur-2xl border border-white/10 rounded-2xl py-2 shadow-2xl z-[60] flex flex-col">
                  <span className="px-4 py-1.5 text-[10px] font-bold text-slate-500 tracking-wider uppercase border-b border-white/5 mb-1">
                    Sleep Timer
                  </span>
                  
                  <button
                    onClick={() => {
                      setSleepTimerTimeLeft(null);
                      setSleepAtTrackEnd(false);
                      setSleepMenuOpen(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-xs transition-all hover:bg-white/5 cursor-pointer ${
                      sleepTimerTimeLeft === null && !sleepAtTrackEnd ? "text-indigo-400 font-semibold" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Off
                  </button>

                  <button
                    onClick={() => {
                      setSleepTimerTimeLeft(15 * 60);
                      setSleepAtTrackEnd(false);
                      setSleepMenuOpen(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-xs transition-all hover:bg-white/5 cursor-pointer ${
                      sleepTimerTimeLeft === 15 * 60 ? "text-indigo-400 font-semibold" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    15 minutes
                  </button>

                  <button
                    onClick={() => {
                      setSleepTimerTimeLeft(30 * 60);
                      setSleepAtTrackEnd(false);
                      setSleepMenuOpen(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-xs transition-all hover:bg-white/5 cursor-pointer ${
                      sleepTimerTimeLeft === 30 * 60 ? "text-indigo-400 font-semibold" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    30 minutes
                  </button>

                  <button
                    onClick={() => {
                      setSleepTimerTimeLeft(45 * 60);
                      setSleepAtTrackEnd(false);
                      setSleepMenuOpen(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-xs transition-all hover:bg-white/5 cursor-pointer ${
                      sleepTimerTimeLeft === 45 * 60 ? "text-indigo-400 font-semibold" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    45 minutes
                  </button>

                  <button
                    onClick={() => {
                      setSleepTimerTimeLeft(60 * 60);
                      setSleepAtTrackEnd(false);
                      setSleepMenuOpen(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-xs transition-all hover:bg-white/5 cursor-pointer ${
                      sleepTimerTimeLeft === 60 * 60 ? "text-indigo-400 font-semibold" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    60 minutes
                  </button>

                  <button
                    onClick={() => {
                      setSleepTimerTimeLeft(null);
                      setSleepAtTrackEnd(true);
                      setSleepMenuOpen(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-xs transition-all hover:bg-white/5 cursor-pointer border-t border-white/5 mt-1 ${
                      sleepAtTrackEnd ? "text-indigo-400 font-semibold" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    End of current song
                  </button>
                </div>
              )}
            </div>

            {/* Mini Mode */}
            <button
              onClick={toggleMiniMode}
              className={`p-2 rounded-xl transition-all cursor-pointer hover:bg-white/5 ${
                isMiniMode ? "text-indigo-400" : "text-slate-400 hover:text-white"
              }`}
              title="Mini Player"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Lyrics */}
        <button
          onClick={() => setShowLyricsMode(!showLyricsMode)}
          className={`p-2 transition-all cursor-pointer ${
            showLyricsMode ? "text-indigo-400" : "text-slate-400 hover:text-white"
          }`}
          title="Lyrics mode"
        >
          <MessageSquareText className="w-4.5 h-4.5 lg:w-5 h-5" />
        </button>

        {/* Vertical Volume Controls (Hover Reveal) */}
        <div className="relative flex items-center group/volume py-2">
          <button
            onClick={toggleMute}
            className="p-2 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            {isMuted || volume === 0 ? <VolumeX className="w-4.5 h-4.5 lg:w-5 h-5" /> : <Volume2 className="w-4.5 h-4.5 lg:w-5 h-5" />}
          </button>
          
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-10 h-32 bg-[#0e1015]/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-3 flex flex-col items-center justify-center shadow-2xl opacity-0 scale-90 pointer-events-none group-hover/volume:opacity-100 group-hover/volume:scale-100 group-hover/volume:pointer-events-auto transition-all duration-200 z-50">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              style={{
                writingMode: "bt-lr" as any,
                WebkitAppearance: "slider-vertical" as any,
                background: `linear-gradient(to top, #6366f1 ${(isMuted ? 0 : volume) * 100}%, rgba(255,255,255,0.05) ${(isMuted ? 0 : volume) * 100}%)`
              }}
              className="h-20 w-1.5 rounded-full appearance-none cursor-pointer outline-none"
            />
            <span className="text-[9px] font-mono text-slate-400 mt-2 select-none">
              {Math.round((isMuted ? 0 : volume) * 100)}%
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
