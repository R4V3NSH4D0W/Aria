import React, { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Music, AlertCircle, Play, Shuffle } from "lucide-react";
import { Track, Playlist, SearchResultItem, ArtistDetails, YtPlaylist } from "./types";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { TrackItem } from "./components/TrackItem";
import { ArtistItem } from "./components/ArtistItem";
import { ArtistDetailsView } from "./components/ArtistDetailsView";
import { Player } from "./components/Player";
import { CreatePlaylistModal } from "./components/CreatePlaylistModal";
import { QueuePanel } from "./components/QueuePanel.tsx";
import { Home } from "./components/Home";
import { Settings } from "./components/Settings";

export default function App() {
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [searchError, setSearchError] = useState("");

  // Artist browsing state
  const [selectedArtist, setSelectedArtist] = useState<ArtistDetails | null>(null);
  const [artistLoading, setArtistLoading] = useState(false);
  const [artistError, setArtistError] = useState("");

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
  const [ytPlaylists, setYtPlaylists] = useState<YtPlaylist[]>([]);
  const [favorites, setFavorites] = useState<Track[]>([]);
  const [favoriteSort, setFavoriteSort] = useState<
    "recent" | "oldest" | "title"
  >("recent");
  const [recentlyPlayed, setRecentlyPlayed] = useState<Track[]>(() => {
    const saved = localStorage.getItem("aria_recently_played");
    return saved ? JSON.parse(saved) : [];
  });
  const [activeTab, setActiveTab] = useState<string>("home");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
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

  // Load playlists, favorites & YT session on start
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

      // Restore cached YT playlists so Sidebar shows them without visiting Settings
      const cachedYt = localStorage.getItem("aria_yt_playlists");
      if (cachedYt) setYtPlaylists(JSON.parse(cachedYt));

      // Push saved cookie back into Rust backend on every app start
      const savedCookie = localStorage.getItem("aria_yt_cookie");
      if (savedCookie) {
        invoke("set_auth_token", { cookie: savedCookie }).catch(console.error);
      }
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

  const addToRecentlyPlayed = (track: Track) => {
    setRecentlyPlayed((prev) => {
      const filtered = prev.filter((t) => t.videoId !== track.videoId);
      const updated = [track, ...filtered];
      if (updated.length > 100) {
        updated.splice(100);
      }
      localStorage.setItem("aria_recently_played", JSON.stringify(updated));
      return updated;
    });
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
    setSelectedArtist(null);

    try {
      const items = await invoke<SearchResultItem[]>("search_yt_direct", {
        query: searchQuery,
      });
      if (items && items.length > 0) {
        const resolvedItems = await Promise.all(
          items.map(async (item) => {
            if (item.type === "artist") return item;
            return resolveTrackDuration(item);
          }),
        );
        setSearchResults(resolvedItems);
      } else {
        setSearchError("No music tracks found on YouTube Music.");
      }
    } catch (err) {
      console.error("Search error:", err);
      setSearchError("Direct search failed. Please verify your connection.");
    }
    setLoading(false);
  };

  const handleExploreGenre = async (genre: string) => {
    setSearchQuery(genre);
    setActiveTab("search");
    setHasSearched(true);
    setLoading(true);
    setSearchError("");
    setSearchResults([]);
    setSelectedArtist(null);
    try {
      const items = await invoke<SearchResultItem[]>("search_yt_direct", {
        query: genre,
      });
      if (items && items.length > 0) {
        const resolvedItems = await Promise.all(
          items.map(async (item) => {
            if (item.type === "artist") return item;
            return resolveTrackDuration(item);
          }),
        );
        setSearchResults(resolvedItems);
      } else {
        setSearchError("No music tracks found on YouTube Music.");
      }
    } catch (err) {
      console.error("Explore genre search failed:", err);
      setSearchError("Explore failed. Please verify your connection.");
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
        t.type !== "artist" && t.videoId === track.videoId ? { ...t, isResolving: true } : t,
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
        addToRecentlyPlayed(track);
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
        t.type !== "artist" && t.videoId === track.videoId ? { ...t, isResolving: false } : t,
      ),
    );
  };

  const handleNext = () => {
    if (!currentTrack) return;

    const playbackList = queue.length > 0 ? queue : getActiveTracks();
    if (playbackList.length === 0) return;

    const currentIndex = playbackList.findIndex(
      (t) => t.videoId === currentTrack.videoId,
    );

    let nextIndex = currentIndex + 1;
    if (isShuffled) {
      nextIndex = Math.floor(Math.random() * playbackList.length);
    } else if (currentIndex === -1 || nextIndex >= playbackList.length) {
      nextIndex = 0; // Loop back to start
    }

    playTrack(playbackList[nextIndex]);
  };

  const handlePrev = () => {
    if (!currentTrack) return;

    const playbackList = queue.length > 0 ? queue : getActiveTracks();
    if (playbackList.length === 0) return;

    const currentIndex = playbackList.findIndex(
      (t) => t.videoId === currentTrack.videoId,
    );
    let prevIndex =
      currentIndex === -1 ? playbackList.length - 1 : currentIndex - 1;

    if (prevIndex < 0) {
      prevIndex = playbackList.length - 1;
    }

    playTrack(playbackList[prevIndex]);
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

  // Media Session API for macOS/Windows/Android lockscreen and control center
  useEffect(() => {
    if ("mediaSession" in navigator && currentTrack) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.uploaderName,
        artwork: [
          {
            src: currentTrack.thumbnail,
            sizes: "512x512",
            type: "image/jpeg",
          },
        ],
      });

      navigator.mediaSession.setActionHandler("play", () => {
        if (audioRef.current) {
          audioRef.current
            .play()
            .then(() => setIsPlaying(true))
            .catch(() => {});
        }
      });
      navigator.mediaSession.setActionHandler("pause", () => {
        if (audioRef.current) {
          audioRef.current.pause();
          setIsPlaying(false);
        }
      });
      navigator.mediaSession.setActionHandler("previoustrack", handlePrev);
      navigator.mediaSession.setActionHandler("nexttrack", handleNext);
    }
  }, [currentTrack, handlePrev, handleNext]);

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

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSelectedArtist(null);
  };

  const loadArtist = async (browseId: string) => {
    setArtistLoading(true);
    setArtistError("");
    setSelectedArtist(null);
    try {
      const details = await invoke<ArtistDetails>("get_yt_artist", { browseId });
      if (details && details.songs && details.songs.length > 0) {
        const resolvedSongs = await Promise.all(
          details.songs.map((track) => resolveTrackDuration(track)),
        );
        details.songs = resolvedSongs;
      }
      setSelectedArtist(details);
    } catch (err) {
      console.error("Failed to load artist:", err);
      setArtistError("Failed to load artist details.");
    }
    setArtistLoading(false);
  };

  const playSongs = (songs: Track[], shuffle: boolean, startFromTrackId?: string) => {
    if (songs.length === 0) return;

    let playbackList = [...songs];
    if (shuffle) {
      playbackList.sort(() => Math.random() - 0.5);
    } else if (startFromTrackId) {
      const idx = playbackList.findIndex(t => t.videoId === startFromTrackId);
      if (idx !== -1) {
        const targetTrack = playbackList[idx];
        setQueue(playbackList);
        playTrack(targetTrack);
        return;
      }
    }

    setQueue(playbackList);
    playTrack(playbackList[0]);
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
    if (playlistId === "recently-played") {
      setRecentlyPlayed((prev) => {
        const updated = prev.filter((t) => t.videoId !== videoId);
        localStorage.setItem("aria_recently_played", JSON.stringify(updated));
        return updated;
      });
      return;
    }

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



  const getActiveTracks = (): Track[] => {
    if (selectedArtist) {
      return selectedArtist.songs;
    }
    if (activeTab === "recently-played") {
      return recentlyPlayed;
    }
    if (activeTab === "search") {
      return searchResults.filter((item): item is Track => !("type" in item && item.type === "artist"));
    }
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
        {isSidebarOpen && (
          <Sidebar
            activeTab={activeTab}
            setActiveTab={handleTabChange}
            playlists={playlists}
            ytPlaylists={ytPlaylists}
            deletePlaylist={(id, e) => {
              deletePlaylist(id, e);
              setSelectedArtist(null);
            }}
            setShowCreatePlaylistModal={setShowCreatePlaylistModal}
          />
        )}

        {/* Main Content Area */}
        <section
          className={`flex-1 flex flex-col overflow-y-auto transition-[padding] duration-500 ease-out ${currentTrack ? "pb-36" : ""}`}
        >
          <Header
            activeTab={activeTab}
            playlists={playlists}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            handleSearch={handleSearch}
            favoriteSort={favoriteSort}
            setFavoriteSort={setFavoriteSort}
            isSidebarOpen={isSidebarOpen}
            toggleSidebar={() => setIsSidebarOpen((open) => !open)}
            onOpenSettings={() => setActiveTab("settings")}
          />

          <div
            className={`p-6 flex-1 grid grid-cols-1 gap-6 items-stretch ${
              hasQueue ? "lg:grid-cols-[minmax(0,1fr)_320px]" : "lg:grid-cols-1"
            }`}
          >
            {/* Connection mode / alert toast */}
            <div className="lg:col-span-1 min-w-0 flex flex-col gap-6 h-full">
              {artistLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center py-24 gap-4">
                  <div className="relative w-14 h-14 -translate-y-5">
                    <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                    <div className="absolute inset-2 rounded-full border-4 border-purple-500/10 border-t-purple-500 animate-spin shimmer-reverse" />
                  </div>
                  <p className="text-slate-400 text-sm animate-pulse font-medium -translate-y-5">
                    Loading Artist Profile...
                  </p>
                </div>
              ) : selectedArtist ? (
                <ArtistDetailsView
                  artist={selectedArtist}
                  onBack={() => setSelectedArtist(null)}
                  playSongs={playSongs}
                  playTrack={playTrack}
                  isPlaying={isPlaying}
                  currentTrack={currentTrack}
                  activeDropdownTrackId={activeDropdownTrackId}
                  setActiveDropdownTrackId={setActiveDropdownTrackId}
                  playlists={playlists}
                  addTrackToPlaylist={addTrackToPlaylist}
                  addTrackToQueue={addTrackToQueue}
                  toggleFavorite={toggleFavorite}
                  isFavorite={isFavorite}
                  setShowCreatePlaylistModal={setShowCreatePlaylistModal}
                />
              ) : activeTab === "home" ? (
                <Home
                  playTrack={playTrack}
                  playSongs={playSongs}
                  currentTrack={currentTrack}
                  isPlaying={isPlaying}
                  favorites={favorites}
                  playlists={playlists}
                  recentlyPlayed={recentlyPlayed}
                  onOpenTab={setActiveTab}
                  onExploreGenre={handleExploreGenre}
                />
              ) : activeTab === "settings" ? (
                <Settings onPlaylistsSync={setYtPlaylists} />
              ) : (
                <>
                  {artistError && (
                    <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm flex items-center gap-3 shadow-inner">
                      <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
                      <span>{artistError}</span>
                    </div>
                  )}

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
                        <>
                          {activeTab !== "search" && activeTab !== "home" && getActiveTracks().length > 0 && (
                            <div className="flex items-center gap-4 mb-6 px-1 shrink-0">
                              <button
                                onClick={() => playSongs(getActiveTracks(), false)}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all duration-300 shadow-lg shadow-indigo-600/25 cursor-pointer hover:-translate-y-0.5"
                              >
                                <Play className="w-4 h-4 fill-white" />
                                <span>Play All</span>
                              </button>
                              <button
                                onClick={() => playSongs(getActiveTracks(), true)}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 hover:border-white/20 font-bold text-sm transition-all duration-300 cursor-pointer hover:-translate-y-0.5"
                              >
                                <Shuffle className="w-4 h-4 text-indigo-400" />
                                <span>Shuffle</span>
                              </button>
                            </div>
                          )}
                          {(activeTab === "search" ? searchResults : getActiveTracks()).map((item, idx) => {
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
                              setShowCreatePlaylistModal={
                                setShowCreatePlaylistModal
                              }
                            />
                          );
                        })}
                        </>
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
                )}
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
          playlists={playlists}
          addTrackToPlaylist={addTrackToPlaylist}
          setShowCreatePlaylistModal={setShowCreatePlaylistModal}
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
