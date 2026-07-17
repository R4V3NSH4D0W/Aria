import React, { useState } from "react";
import { ArrowLeft, Play, Shuffle, Users, Music, Disc } from "lucide-react";
import { ArtistDetails, Track, Playlist } from "../types";
import { TrackItem } from "./TrackItem";

interface ArtistDetailsViewProps {
  artist: ArtistDetails;
  onBack: () => void;
  playSongs: (songs: Track[], shuffle: boolean) => void;
  playTrack: (track: Track) => void;
  // Props to pass to TrackItem
  isPlaying: boolean;
  currentTrack: Track | null;
  activeDropdownTrackId: string | null;
  setActiveDropdownTrackId: (id: string | null) => void;
  playlists: Playlist[];
  addTrackToPlaylist: (playlistId: string, track: Track) => void;
  addTrackToQueue: (track: Track) => void;
  toggleFavorite: (track: Track) => void;
  isFavorite: (track: Track) => boolean;
  setShowCreatePlaylistModal: (show: boolean) => void;
}

export const ArtistDetailsView: React.FC<ArtistDetailsViewProps> = ({
  artist,
  onBack,
  playSongs,
  playTrack,
  isPlaying,
  currentTrack,
  activeDropdownTrackId,
  setActiveDropdownTrackId,
  playlists,
  addTrackToPlaylist,
  addTrackToQueue,
  toggleFavorite,
  isFavorite,
  setShowCreatePlaylistModal,
}) => {
  const [showFullBio, setShowFullBio] = useState(false);
  const [imgError, setImgError] = useState(false);

  return (
    <div className="flex-1 flex flex-col gap-6 select-none animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header Back Navigation */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2.5 rounded-xl border border-white/5 bg-[#12151b] text-slate-300 hover:text-white hover:bg-white/5 transition-all cursor-pointer flex items-center justify-center shadow-md"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Back to search
          </span>
          <h3 className="text-lg font-bold text-white leading-none mt-0.5">
            Artist Profile
          </h3>
        </div>
      </div>

      {/* Immersive Artist Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-b from-[#161920]/80 to-[#0e1015]/95 p-6 md:p-8 flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-start shadow-2xl">
        {/* Large Avatar */}
        <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden shrink-0 shadow-2xl border-2 border-indigo-500/20 bg-slate-800 flex items-center justify-center">
          {!imgError && artist.thumbnail ? (
            <img
              src={artist.thumbnail}
              alt={artist.name}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <Disc className="w-16 h-16 md:w-20 md:h-20 text-indigo-400/40 animate-[spin_8s_linear_infinite]" />
          )}
        </div>

        {/* Artist Profile Details */}
        <div className="flex-1 min-w-0 flex flex-col items-center md:items-start text-center md:text-left h-full justify-center">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
            {artist.name}
          </h2>

          {artist.subscribers && (
            <div className="flex items-center gap-2 mt-2 text-indigo-300 font-semibold text-sm">
              <Users className="w-4 h-4 shrink-0 text-indigo-400" />
              <span>{artist.subscribers}</span>
            </div>
          )}

          {artist.description && (
            <div className="mt-4 max-w-2xl text-xs md:text-sm text-slate-400 font-medium leading-relaxed">
              <p className={showFullBio ? "" : "line-clamp-3"}>
                {artist.description}
              </p>
              {artist.description.length > 150 && (
                <button
                  onClick={() => setShowFullBio(!showFullBio)}
                  className="text-indigo-400 hover:text-indigo-300 font-bold mt-1 text-xs cursor-pointer focus:outline-none"
                >
                  {showFullBio ? "Show less" : "Read more"}
                </button>
              )}
            </div>
          )}

          {/* Quick Play Controls */}
          {artist.songs.length > 0 && (
            <div className="flex items-center gap-4 mt-6">
              <button
                onClick={() => playSongs(artist.songs, false)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all duration-300 shadow-lg shadow-indigo-600/25 cursor-pointer hover:-translate-y-0.5"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Play All</span>
              </button>
              <button
                onClick={() => playSongs(artist.songs, true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 hover:border-white/20 font-bold text-sm transition-all duration-300 cursor-pointer hover:-translate-y-0.5"
              >
                <Shuffle className="w-4 h-4 text-indigo-400" />
                <span>Shuffle</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Top Tracks List */}
      <div className="flex flex-col gap-4 mt-2">
        <div className="flex items-center gap-2 px-1">
          <Music className="w-5 h-5 text-indigo-400" />
          <h3 className="font-extrabold text-lg tracking-wide text-white">
            Top Songs
          </h3>
          <span className="text-xs font-semibold text-slate-500 bg-white/5 px-2 py-0.5 rounded-md">
            {artist.songs.length} tracks
          </span>
        </div>

        <div className="flex flex-col gap-3">
          {artist.songs.map((track, idx) => {
            const isCurrent = currentTrack?.videoId === track.videoId;
            return (
              <TrackItem
                key={track.videoId + idx}
                track={track}
                isCurrent={isCurrent}
                isPlaying={isPlaying}
                activeDropdownTrackId={activeDropdownTrackId}
                setActiveDropdownTrackId={setActiveDropdownTrackId}
                playlists={playlists}
                addTrackToPlaylist={addTrackToPlaylist}
                addTrackToQueue={addTrackToQueue}
                toggleFavorite={toggleFavorite}
                isFavorite={isFavorite}
                activeTab="artist-page" // passing a custom activeTab
                removeTrackFromPlaylist={() => {}}
                playTrack={playTrack}
                setShowCreatePlaylistModal={setShowCreatePlaylistModal}
              />
            );
          })}

          {artist.songs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-white/5 rounded-2xl bg-white/5">
              <Music className="w-8 h-8 text-slate-500 animate-pulse" />
              <p className="text-slate-400 text-sm font-medium mt-3">
                No songs listed for this artist page.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
