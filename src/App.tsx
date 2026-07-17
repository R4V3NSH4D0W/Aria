import React, { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Music, AlertCircle } from "lucide-react";
import { Track, Playlist } from "./types";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { TrackItem } from "./components/TrackItem";
import { Player } from "./components/Player";
import { CreatePlaylistModal } from "./components/CreatePlaylistModal";
import { QueuePanel } from "./components/QueuePanel.tsx";

export default function App() {
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [searchError, setSearchError] = useState("");

  // Playback state
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [playbackError, setPlaybackError] = useState("");
  const [resolvedAudioUrl, setResolvedAudioUrl] = useState<string | null>(null);

  // Playlists & Favorites (Stored in localStorage)
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [favorites, setFavorites] = useState<Track[]>([]);
  const [favoriteSort, setFavoriteSort] = useState<
    "recent" | "oldest" | "title"
  >("recent");
  const [activeTab, setActiveTab] = useState<string>("search");
  const [showCreatePlaylistModal, setShowCreatePlaylistModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [activeDropdownTrackId, setActiveDropdownTrackId] = useState<
    string | null
  >(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Audio Ref
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Guard: prevent auto-advance from firing multiple times on the same track end
  const autoAdvancedRef = useRef(false);

  // Load playlists & favorites on start
  useEffect(() => {
    try {
      let savedPlaylists = localStorage.getItem("aria_playlists");
      if (!savedPlaylists) {
        savedPlaylists = localStorage.getItem("metrolist_playlists");
      }
      if (savedPlaylists) setPlaylists(JSON.parse(savedPlaylists));

      let savedFavorites = localStorage.getItem("aria_favorites");
      if (!savedFavorites) {
        savedFavorites = localStorage.getItem("metrolist_favorites");
      }
      if (savedFavorites) setFavorites(JSON.parse(savedFavorites));
    } catch (e) {
      console.error("Failed to load local storage data", e);
    }
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = () => {
      setActiveDropdownTrackId(null);
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, []);

  const savePlaylists = (updated: Playlist[]) => {
    setPlaylists(updated);
    localStorage.setItem("aria_playlists", JSON.stringify(updated));
  };

  const saveFavorites = (updated: Track[]) => {
    setFavorites(updated);
    localStorage.setItem("aria_favorites", JSON.stringify(updated));
  };

  const resolveTrackDuration = async (track: Track): Promise<Track> => {
    try {
      const rawJson = await invoke<string>("get_yt_stream_direct", {
        videoId: track.videoId,
      });
      const streamData = JSON.parse(rawJson) as {
        url: string;
        duration: number;
      };

      if (streamData.duration > 0) {
        return { ...track, duration: streamData.duration };
      }
    } catch (err) {
      console.error("Track metadata error:", err);
    }

    return track;
  };

  // Perform search (Directly queries YouTube Music InnerTube API from local Rust backend)
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setHasSearched(true);
    setLoading(true);
    setSearchError("");
    setSearchResults([]);

    try {
      const tracks = await invoke<Track[]>("search_yt_direct", {
        query: searchQuery,
      });
      if (tracks && tracks.length > 0) {
        const tracksWithDurations = await Promise.all(
          tracks.map((track) => resolveTrackDuration(track)),
        );
        setSearchResults(tracksWithDurations);
      } else {
        setSearchError("No music tracks found on YouTube Music.");
      }
    } catch (err) {
      console.error("Search error:", err);
      setSearchError("Direct search failed. Please verify your connection.");
    }
    setLoading(false);
  };

  // Play track (Resolves unencrypted stream directly from YouTube client in Rust)
  const playTrack = async (track: Track) => {
    setPlaybackError("");
    setIsPlaying(false);
    setResolvedAudioUrl(null);
    setDuration(0);
    setProgress(0);
    autoAdvancedRef.current = false; // reset guard for new track

    // Set loading indicator
    setSearchResults((prev) =>
      prev.map((t) =>
        t.videoId === track.videoId ? { ...t, isResolving: true } : t,
      ),
    );
    setCurrentTrack({ ...track, isResolving: true });

    try {
      const rawJson = await invoke<string>("get_yt_stream_direct", {
        videoId: track.videoId,
      });
      const streamData = JSON.parse(rawJson) as {
        url: string;
        duration: number;
      };
      if (streamData.url) {
        setResolvedAudioUrl(streamData.url);
        setCurrentTrack({ ...track, isResolving: false });
        // Use YouTube's authoritative duration (from approxDurationMs)
        if (streamData.duration > 0) {
          setDuration(streamData.duration);
        }
      } else {
        throw new Error("No stream URL");
      }
    } catch (err) {
      console.error("Playback stream error:", err);
      setPlaybackError("Unable to load full track. YouTube server busy.");
      setCurrentTrack(null);
    }

    // Remove loading indicators
    setSearchResults((prev) =>
      prev.map((t) =>
        t.videoId === track.videoId ? { ...t, isResolving: false } : t,
      ),
    );
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !resolvedAudioUrl) return;

    // Wait for canplay before calling .play() — prevents AbortError
    const onCanPlay = () => {
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          if (err?.name === "AbortError") return; // benign: interrupted by a new load
          console.error("Playback error:", err);
          setPlaybackError("Audio playback failed. Try again.");
        });
    };

    audio.load();
    audio.addEventListener("canplay", onCanPlay, { once: true });

    return () => {
      audio.removeEventListener("canplay", onCanPlay);
    };
  }, [resolvedAudioUrl]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const curTime = audioRef.current.currentTime;
      setProgress(curTime);

      // Auto-advance when we reach the song's actual duration from YouTube metadata.
      if (duration > 0 && curTime >= duration && !autoAdvancedRef.current) {
        autoAdvancedRef.current = true;
        audioRef.current.pause();
        handleNext();
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      const audioDur = audioRef.current.duration;
      // Only use audio element duration as fallback
      setDuration((prev) =>
        prev > 0 ? prev : isFinite(audioDur) ? audioDur : 0,
      );
    }
  };

  const handleAudioEnded = () => {
    handleNext();
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !audio.src) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          if (err?.name === "AbortError") return; // benign
          setPlaybackError("Playback resume failed.");
        });
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    audioRef.current.muted = nextMuted;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = seekTime;
      setProgress(seekTime);
    }
  };

  const handleNext = () => {
    if (queue.length === 0 || !currentTrack) return;
    const currentIndex = queue.findIndex(
      (t) => t.videoId === currentTrack.videoId,
    );
    let nextIndex = currentIndex + 1;
    if (isShuffled) {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else if (nextIndex >= queue.length) {
      nextIndex = 0; // Loop back to start
    }
    playTrack(queue[nextIndex]);
  };

  const handlePrev = () => {
    if (queue.length === 0 || !currentTrack) return;
    const currentIndex = queue.findIndex(
      (t) => t.videoId === currentTrack.videoId,
    );
    let prevIndex = currentIndex === -1 ? queue.length - 1 : currentIndex - 1;
    if (prevIndex < 0) {
      prevIndex = queue.length - 1;
    }
    playTrack(queue[prevIndex]);
  };

  const addTrackToQueue = async (track: Track) => {
    if (queue.some((item) => item.videoId === track.videoId)) return;

    setQueue((prev) => [...prev, { ...track, isResolving: true }]);

    try {
      const rawJson = await invoke<string>("get_yt_stream_direct", {
        videoId: track.videoId,
      });
      const streamData = JSON.parse(rawJson) as {
        url: string;
        duration: number;
      };

      if (streamData.duration > 0) {
        setQueue((prev) =>
          prev.map((item) =>
            item.videoId === track.videoId
              ? { ...item, duration: streamData.duration, isResolving: false }
              : item,
          ),
        );
      } else {
        setQueue((prev) =>
          prev.map((item) =>
            item.videoId === track.videoId
              ? { ...item, isResolving: false }
              : item,
          ),
        );
      }
    } catch (err) {
      console.error("Queue metadata error:", err);
      setQueue((prev) =>
        prev.map((item) =>
          item.videoId === track.videoId
            ? { ...item, isResolving: false }
            : item,
        ),
      );
    }
  };

  const reorderQueue = (fromIndex: number, toIndex: number) => {
    setQueue((prev) => {
      if (
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= prev.length ||
        toIndex >= prev.length ||
        fromIndex === toIndex
      ) {
        return prev;
      }

      const nextQueue = [...prev];
      const [movedTrack] = nextQueue.splice(fromIndex, 1);
      nextQueue.splice(toIndex, 0, movedTrack);
      return nextQueue;
    });
  };

  const removeFromQueue = (videoId: string) => {
    setQueue((prev) => prev.filter((track) => track.videoId !== videoId));
  };

  const clearQueue = () => {
    setQueue([]);
  };

  const isFavorite = (track: Track) =>
    favorites.some((t) => t.videoId === track.videoId);
  const toggleFavorite = (track: Track) => {
    let updated;
    if (isFavorite(track)) {
      updated = favorites.filter((t) => t.videoId !== track.videoId);
    } else {
      updated = [...favorites, { ...track, addedAt: Date.now() }];
    }
    saveFavorites(updated);
  };

  const createPlaylist = () => {
    if (!newPlaylistName.trim()) return;
    const newPlaylist: Playlist = {
      id: Date.now().toString(),
      name: newPlaylistName,
      tracks: [],
    };
    savePlaylists([...playlists, newPlaylist]);
    setNewPlaylistName("");
    setShowCreatePlaylistModal(false);
  };

  const deletePlaylist = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = playlists.filter((p) => p.id !== id);
    savePlaylists(updated);
    if (activeTab === id) setActiveTab("search");
  };

  const addTrackToPlaylist = (playlistId: string, track: Track) => {
    const updated = playlists.map((p) => {
      if (p.id === playlistId) {
        if (p.tracks.some((t) => t.videoId === track.videoId)) return p;
        return { ...p, tracks: [...p.tracks, track] };
      }
      return p;
    });
    savePlaylists(updated);
  };

  const removeTrackFromPlaylist = (playlistId: string, videoId: string) => {
    const updated = playlists.map((p) => {
      if (p.id === playlistId) {
        return { ...p, tracks: p.tracks.filter((t) => t.videoId !== videoId) };
      }
      return p;
    });
    savePlaylists(updated);
    // If the active view is this playlist, update state to trigger refresh
    if (activeTab === playlistId) {
      // No extra state needs manual resetting since getActiveTracks() reads directly from playlists state
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs <= 0) return "--:--";
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  const getActiveTracks = () => {
    if (activeTab === "search") return searchResults;
    if (activeTab === "favorites") {
      const sortedFavorites = [...favorites].sort((a, b) => {
        if (favoriteSort === "title") {
          return a.title.localeCompare(b.title);
        }

        const left = a.addedAt ?? 0;
        const right = b.addedAt ?? 0;
        return favoriteSort === "recent" ? right - left : left - right;
      });
      return sortedFavorites;
    }
    const pl = playlists.find((p) => p.id === activeTab);
    return pl ? pl.tracks : [];
  };

  const hasQueue = queue.length > 0;

  return (
    <main className="h-screen w-screen bg-[#08090a] text-slate-100 flex flex-col font-sans relative overflow-hidden select-none">
      {/* Hidden HTML5 Audio Element */}
      <audio
        ref={audioRef}
        src={resolvedAudioUrl || undefined}
        preload="auto"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleAudioEnded}
        loop={isLooping}
      />

      <div className="flex flex-1 overflow-hidden z-10">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          playlists={playlists}
          deletePlaylist={deletePlaylist}
          setShowCreatePlaylistModal={setShowCreatePlaylistModal}
        />

        {/* Main Content Area */}
        <section className={`flex-1 flex flex-col overflow-y-auto transition-[padding] duration-500 ease-out ${currentTrack ? 'pb-36' : ''}`}>
          <Header
            activeTab={activeTab}
            playlists={playlists}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            handleSearch={handleSearch}
            favoriteSort={favoriteSort}
            setFavoriteSort={setFavoriteSort}
          />

          <div
            className={`p-6 flex-1 grid grid-cols-1 gap-6 items-stretch ${
              hasQueue ? "lg:grid-cols-[minmax(0,1fr)_320px]" : "lg:grid-cols-1"
            }`}
          >
            {/* Connection mode / alert toast */}
            <div className="lg:col-span-1 min-w-0 flex flex-col gap-6 h-full">
              {searchError && (
                <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm flex items-center gap-3 shadow-inner">
                  <AlertCircle className="w-5 h-5 shrink-0 text-indigo-400" />
                  <span>{searchError}</span>
                </div>
              )}

              {/* Loading Spinner */}
              {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center py-24 gap-4">
                  <div className="relative w-14 h-14 -translate-y-5">
                    <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                    <div className="absolute inset-2 rounded-full border-4 border-purple-500/10 border-t-purple-500 animate-spin shimmer-reverse" />
                  </div>
                  <p className="text-slate-400 text-sm animate-pulse font-medium -translate-y-5">
                    Searching YouTube Music...
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex-1 flex flex-col">
                    {activeTab === "search" && !hasSearched ? (
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
                              Type a song, artist, or album above to start
                              browsing.
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      getActiveTracks().map((track, idx) => {
                        const isCurrent =
                          currentTrack?.videoId === track.videoId;
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
                            playTrack={(t) => playTrack(t)}
                            formatTime={formatTime}
                            setShowCreatePlaylistModal={
                              setShowCreatePlaylistModal
                            }
                          />
                        );
                      })
                    )}
                    {activeTab === "search" &&
                      hasSearched &&
                      getActiveTracks().length === 0 && (
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
                                Try searching for your favorite artist, album,
                                or song.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    {activeTab !== "search" &&
                      getActiveTracks().length === 0 && (
                        <div className="flex flex-col items-center justify-center py-28 gap-4 text-center">
                          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-lg">
                            <Music className="w-8 h-8 text-indigo-400/50" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg text-slate-200">
                              No tracks found
                            </h3>
                            <p className="text-sm text-slate-500 max-w-xs mt-1">
                              {activeTab === "search"
                                ? "Try searching for your favorite artist, album, or song."
                                : activeTab === "favorites"
                                  ? "Tap the heart icon on any song to add it to your favorites."
                                  : "This playlist is empty. Search and add tracks to populate it!"}
                            </p>
                          </div>
                        </div>
                      )}
                  </div>
                </>
              )}
            </div>

            {hasQueue && (
              <QueuePanel
                queue={queue}
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                onPlayTrack={(track: Track) => playTrack(track)}
                onMoveTrack={reorderQueue}
                onRemoveTrack={removeFromQueue}
                onClearQueue={clearQueue}
              />
            )}
          </div>
        </section>
      </div>

      {/* Footer Player Card */}
      {currentTrack && (
        <Player
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          isShuffled={isShuffled}
          isLooping={isLooping}
          isMuted={isMuted}
          progress={progress}
          duration={duration}
          volume={volume}
          playbackError={playbackError}
          togglePlay={togglePlay}
          toggleMute={toggleMute}
          toggleFavorite={toggleFavorite}
          isFavorite={isFavorite}
          setIsShuffled={setIsShuffled}
          setIsLooping={setIsLooping}
          handleSeek={handleSeek}
          handleVolumeChange={handleVolumeChange}
          handleNext={handleNext}
          handlePrev={handlePrev}
          formatTime={formatTime}
        />
      )}

      {/* Create Playlist Modal */}
      {showCreatePlaylistModal && (
        <CreatePlaylistModal
          newPlaylistName={newPlaylistName}
          setNewPlaylistName={setNewPlaylistName}
          createPlaylist={createPlaylist}
          setShowCreatePlaylistModal={setShowCreatePlaylistModal}
        />
      )}
    </main>
  );
}
