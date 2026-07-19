import React from "react";
import { Music, AlertCircle } from "lucide-react";
import { Track, Playlist } from "../types";
import { TrackItem } from "./TrackItem";
import { ArtistItem } from "./ArtistItem";

interface SearchViewProps {
  loading: boolean;
  searchError: string | null;
  hasSearched: boolean;
  searchResults: any[];
  loadArtist: (browseId: string) => void;
  currentTrack: Track | null;
  isPlaying: boolean;
  playTrack: (track: Track) => void;
  activeDropdownTrackId: string | null;
  setActiveDropdownTrackId: (id: string | null) => void;
  playlists: Playlist[];
  addTrackToPlaylist: (playlistId: string, track: Track) => void;
  addTrackToQueue: (track: Track) => void;
  toggleFavorite: (track: Track) => void;
  isFavorite: (track: Track) => boolean;
  removeTrackFromPlaylist: (playlistId: string, videoId: string) => void;
  setShowCreatePlaylistModal: (show: any) => void;
  downloads?: Track[];
  downloadingTrackIds?: Set<string>;
  downloadTrack?: (track: Track) => void;
  deleteDownload?: (videoId: string) => void;
}

export const SearchView: React.FC<SearchViewProps> = ({
  loading,
  searchError,
  hasSearched,
  searchResults,
  loadArtist,
  currentTrack,
  isPlaying,
  playTrack,
  activeDropdownTrackId,
  setActiveDropdownTrackId,
  playlists,
  addTrackToPlaylist,
  addTrackToQueue,
  toggleFavorite,
  isFavorite,
  removeTrackFromPlaylist,
  setShowCreatePlaylistModal,
  downloads,
  downloadingTrackIds,
  downloadTrack,
  deleteDownload,
}) => {
  if (searchError) {
    return (
      <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm flex items-center gap-3 shadow-inner">
        <AlertCircle className="w-5 h-5 shrink-0 text-indigo-400" />
        <span>{searchError}</span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-24 gap-4">
        <div className="relative w-14 h-14 -translate-y-5">
          <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
          <div className="absolute inset-2 rounded-full border-4 border-purple-500/10 border-t-purple-500 animate-spin shimmer-reverse" />
        </div>
      </div>
    );
  }

  if (!hasSearched) {
    return (
      <div className="flex-1 flex items-center justify-center px-6 py-12 text-center">
        <div className="flex flex-col items-center gap-4 max-w-sm -translate-y-5">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-lg">
            <Music className="w-8 h-8 text-indigo-400/50" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-slate-200">
              Search for music
            </h3>
            <p className="text-sm text-slate-500 max-w-xs mt-1">
              Type a song, artist, or album above to start browsing.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const tracksOnly = searchResults.filter(
    (item): item is Track => !("type" in item && item.type === "artist")
  );

  if (searchResults.length === 0 || (tracksOnly.length === 0 && searchResults.every(item => "type" in item && item.type === "artist" === false))) {
    return (
      <div className="flex-1 flex items-center justify-center px-6 py-12 text-center">
        <div className="flex flex-col items-center gap-4 max-w-sm -translate-y-5">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-lg">
            <Music className="w-8 h-8 text-indigo-400/50" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-slate-200">
              No tracks found
            </h3>
            <p className="text-sm text-slate-500 max-w-xs mt-1">
              Try searching for your favorite artist, album, or song.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col pb-36">
      {searchResults.map((item, idx) => {
        if ("type" in item && item.type === "artist") {
          return (
            <ArtistItem
              key={item.browseId + idx}
              artist={item}
              onClick={() => loadArtist(item.browseId)}
            />
          );
        }

        const track = item as Track;
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
            activeTab="search"
            removeTrackFromPlaylist={removeTrackFromPlaylist}
            playTrack={playTrack}
            setShowCreatePlaylistModal={setShowCreatePlaylistModal}
            loadArtist={loadArtist}
            downloads={downloads}
            downloadingTrackIds={downloadingTrackIds}
            downloadTrack={downloadTrack}
            deleteDownload={deleteDownload}
          />
        );
      })}
    </div>
  );
};
