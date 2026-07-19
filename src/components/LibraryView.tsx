import React from "react";
import { Music, Play, Shuffle, ArrowLeft, Download } from "lucide-react";
import { Track, Playlist } from "../types";
import { TrackItem } from "./TrackItem";

interface LibraryViewProps {
  activeTab: string;
  tracks: Track[];
  playSongs: (tracks: Track[], shuffle: boolean) => void;
  playTrack: (track: Track) => void;
  currentTrack: Track | null;
  isPlaying: boolean;
  activeDropdownTrackId: string | null;
  setActiveDropdownTrackId: (id: string | null) => void;
  playlists: Playlist[];
  addTrackToPlaylist: (playlistId: string, track: Track) => void;
  addTrackToQueue: (track: Track) => void;
  toggleFavorite: (track: Track) => void;
  isFavorite: (track: Track) => boolean;
  removeTrackFromPlaylist: (playlistId: string, videoId: string) => void;
  setShowCreatePlaylistModal: (show: any) => void;
  onBack?: () => void;
  downloads?: Track[];
  downloadingTrackIds?: Set<string>;
  downloadTrack?: (track: Track) => void;
  deleteDownload?: (videoId: string) => void;
  loadArtist?: (browseId: string) => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  activeTab,
  tracks,
  playSongs,
  playTrack,
  currentTrack,
  isPlaying,
  activeDropdownTrackId,
  setActiveDropdownTrackId,
  playlists,
  addTrackToPlaylist,
  addTrackToQueue,
  toggleFavorite,
  isFavorite,
  removeTrackFromPlaylist,
  setShowCreatePlaylistModal,
  onBack,
  downloads,
  downloadingTrackIds,
  downloadTrack,
  deleteDownload,
  loadArtist,
}) => {
  const isLocalContext = activeTab === "favorites" || activeTab.startsWith("yt:RD") || (activeTab !== "recently-played" && !activeTab.startsWith("yt:"));

  const downloadAll = async () => {
    if (!downloadTrack) return;
    const tracksToDownload = tracks.filter(
      (track) => !downloads?.some((d) => d.videoId === track.videoId) && !track.localPath
    );

    // Limit concurrency to 3 parallel downloads to prevent YouTube IP rate-limiting
    const limit = 3;
    for (let i = 0; i < tracksToDownload.length; i += limit) {
      const chunk = tracksToDownload.slice(i, i + limit);
      await Promise.all(chunk.map((track) => downloadTrack(track)));
    }
  };

  if (tracks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-28 gap-4 text-center flex-1">
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-lg">
          <Music className="w-8 h-8 text-indigo-400/50" />
        </div>
        <div>
          <h3 className="font-semibold text-lg text-slate-200">
            No tracks found
          </h3>
          <p className="text-sm text-slate-500 max-w-xs mt-1">
            {activeTab === "favorites"
              ? "Tap the heart icon on any song to add it to your favorites."
              : activeTab === "downloads"
              ? "No downloaded tracks. Add tracks to your Favorites or internal playlists, then download them for offline listening."
              : "This playlist is empty. Search and add tracks to populate it!"}
          </p>
        </div>
        {onBack && (
          <button
            onClick={onBack}
            className="mt-2 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 hover:border-white/20 font-bold text-sm transition-all duration-300 cursor-pointer hover:-translate-y-0.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go Back</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col pb-36">
      <div className="flex items-center gap-3 mb-6 px-1 shrink-0">
        {onBack && (
          <button
            onClick={onBack}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 hover:border-white/20 transition-all duration-300 cursor-pointer hover:-translate-y-0.5"
            title="Back to Playlists"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <button
          onClick={() => playSongs(tracks, false)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all duration-300 shadow-lg shadow-indigo-600/25 cursor-pointer hover:-translate-y-0.5"
        >
          <Play className="w-4 h-4 fill-white" />
          <span>Play All</span>
        </button>
        <button
          onClick={() => playSongs(tracks, true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 hover:border-white/20 font-bold text-sm transition-all duration-300 cursor-pointer hover:-translate-y-0.5"
        >
          <Shuffle className="w-4 h-4 text-indigo-400" />
          <span>Shuffle</span>
        </button>
        {isLocalContext && downloadTrack && (
          <button
            onClick={downloadAll}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 hover:border-white/20 font-bold text-sm transition-all duration-300 cursor-pointer hover:-translate-y-0.5"
          >
            <Download className="w-4 h-4 text-indigo-400" />
            <span>Download All</span>
          </button>
        )}
      </div>

      {tracks.map((track, idx) => {
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
            activeTab={activeTab}
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
