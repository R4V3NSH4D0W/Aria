import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Track, Playlist, YtPlaylist } from "../types";
import { useMediaQuery } from "./useMediaQuery";

export function useLibrary() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [ytPlaylists, setYtPlaylists] = useState<YtPlaylist[]>([]);
  const [favorites, setFavorites] = useState<Track[]>([]);
  const [favoriteSort, setFavoriteSort] = useState<"recent" | "oldest" | "title">("recent");
  const [recentlyPlayed, setRecentlyPlayed] = useState<Track[]>(() => {
    const saved = localStorage.getItem("aria_recently_played");
    return saved ? JSON.parse(saved) : [];
  });
  const [activeTab, setActiveTab] = useState<string>(() => navigator.onLine ? "home" : "favorites");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const isWide = useMediaQuery("(min-width: 1024px)");
  const sidebarClosedByUser = useRef(false);

  // Auto-close on narrow; auto-open on wide only if user never manually closed
  useEffect(() => {
    if (!isWide) {
      setIsSidebarOpen(false);
    } else if (!sidebarClosedByUser.current) {
      setIsSidebarOpen(true);
    }
  }, [isWide]);

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen((open) => {
      const next = !open;
      if (!next) {
        sidebarClosedByUser.current = true;
      } else {
        sidebarClosedByUser.current = false;
      }
      return next;
    });
  }, []);

  const [showCreatePlaylistModal, setShowCreatePlaylistModal] = useState(false);
  const [pendingTrackForPlaylist, setPendingTrackForPlaylist] = useState<Track | null>(null);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [activeDropdownTrackId, setActiveDropdownTrackId] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [downloads, setDownloads] = useState<Track[]>([]);
  const [downloadingTrackIds, setDownloadingTrackIds] = useState<Set<string>>(new Set());

  const customSetShowCreatePlaylistModal = useCallback((show: boolean | Track) => {
    if (typeof show === "boolean") {
      setShowCreatePlaylistModal(show);
      if (!show) {
        setPendingTrackForPlaylist(null);
      }
    } else {
      setPendingTrackForPlaylist(show);
      setShowCreatePlaylistModal(true);
    }
  }, []);

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

      // Restore downloads
      const savedDownloads = localStorage.getItem("aria_downloads");
      if (savedDownloads) setDownloads(JSON.parse(savedDownloads));

      // Push saved cookie back into Rust backend on every app start
      const savedCookie = localStorage.getItem("aria_yt_cookie");
      if (savedCookie) {
        invoke("set_auth_token", { cookie: savedCookie }).catch(console.error);
      }
    } catch (e) {
      console.error("Failed to load local storage data", e);
    }
  }, []);

  // Close track dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = () => {
      setActiveDropdownTrackId(null);
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, []);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const savePlaylists = useCallback((updated: Playlist[]) => {
    setPlaylists(updated);
    localStorage.setItem("aria_playlists", JSON.stringify(updated));
  }, []);

  const saveFavorites = useCallback((updated: Track[]) => {
    setFavorites(updated);
    localStorage.setItem("aria_favorites", JSON.stringify(updated));
  }, []);

  const deleteDownload = useCallback(async (videoId: string) => {
    try {
      await invoke("delete_downloaded_track", { videoId });
      setDownloads((prev) => {
        const next = prev.filter((t) => t.videoId !== videoId);
        localStorage.setItem("aria_downloads", JSON.stringify(next));
        return next;
      });
    } catch (e) {
      console.error("Failed to delete downloaded track", e);
    }
  }, []);

  const checkAndCleanupDownload = useCallback((videoId: string, nextFavorites: Track[], nextPlaylists: Playlist[]) => {
    const isInFavs = nextFavorites.some((t) => t.videoId === videoId);
    const isInLocalPlaylists = nextPlaylists.some((p) => p.tracks.some((t) => t.videoId === videoId));
    if (!isInFavs && !isInLocalPlaylists) {
      deleteDownload(videoId);
    }
  }, [deleteDownload]);

  const isFavorite = useCallback(
    (track: Track) => favorites.some((t) => t.videoId === track.videoId),
    [favorites]
  );

  const toggleFavorite = useCallback(
    (track: Track) => {
      let updated;
      if (isFavorite(track)) {
        updated = favorites.filter((t) => t.videoId !== track.videoId);
        saveFavorites(updated);
        checkAndCleanupDownload(track.videoId, updated, playlists);
      } else {
        updated = [...favorites, { ...track, addedAt: Date.now() }];
        saveFavorites(updated);
      }
    },
    [favorites, isFavorite, saveFavorites, checkAndCleanupDownload, playlists]
  );

  const createPlaylist = useCallback(() => {
    if (!newPlaylistName.trim()) return;
    const newPlaylist: Playlist = {
      id: Date.now().toString(),
      name: newPlaylistName,
      tracks: pendingTrackForPlaylist ? [pendingTrackForPlaylist] : [],
    };
    savePlaylists([...playlists, newPlaylist]);
    setNewPlaylistName("");
    setPendingTrackForPlaylist(null);
    setShowCreatePlaylistModal(false);
  }, [newPlaylistName, playlists, savePlaylists, pendingTrackForPlaylist]);

  const deletePlaylist = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const targetPlaylist = playlists.find((p) => p.id === id);
      const updated = playlists.filter((p) => p.id !== id);
      savePlaylists(updated);
      
      if (targetPlaylist) {
        for (const track of targetPlaylist.tracks) {
          checkAndCleanupDownload(track.videoId, favorites, updated);
        }
      }
      
      if (activeTab === id) setActiveTab("search");
    },
    [playlists, activeTab, savePlaylists, favorites, checkAndCleanupDownload]
  );

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

  const addTrackToPlaylist = useCallback(
    (playlistId: string, track: Track) => {
      const updated = playlists.map((p) => {
        if (p.id === playlistId) {
          if (p.tracks.some((t) => t.videoId === track.videoId)) return p;
          return { ...p, tracks: [...p.tracks, track] };
        }
        return p;
      });
      savePlaylists(updated);
    },
    [playlists, savePlaylists]
  );

  const removeTrackFromPlaylist = useCallback(
    (playlistId: string, videoId: string) => {
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
      checkAndCleanupDownload(videoId, favorites, updated);
    },
    [playlists, savePlaylists]
  );

  const addToRecentlyPlayed = useCallback((track: Track) => {
    setRecentlyPlayed((prev) => {
      const exists = prev.some((t) => t.videoId === track.videoId);
      if (exists && activeTab === "recently-played") {
        return prev;
      }
      const filtered = prev.filter((t) => t.videoId !== track.videoId);
      const updated = [track, ...filtered];
      if (updated.length > 100) {
        updated.splice(100);
      }
      localStorage.setItem("aria_recently_played", JSON.stringify(updated));
      return updated;
    });
  }, [activeTab]);

  const downloadTrack = useCallback(async (track: Track) => {
    if (downloadingTrackIds.has(track.videoId)) return;
    
    setDownloadingTrackIds((prev) => {
      const next = new Set(prev);
      next.add(track.videoId);
      return next;
    });

    try {
      const rawJson = await invoke<string>("get_yt_stream_direct", {
        videoId: track.videoId,
      });
      const streamData = JSON.parse(rawJson);
      const streamUrl = streamData.url;

      if (!streamUrl) {
        throw new Error("Could not extract stream URL");
      }

      const localPath = await invoke<string>("download_track", {
        videoId: track.videoId,
        streamUrl,
      });

      const downloadedTrack: Track = {
        ...track,
        localPath,
        downloadedAt: Date.now(),
      };

      setDownloads((prev) => {
        const filtered = prev.filter((t) => t.videoId !== track.videoId);
        const next = [...filtered, downloadedTrack];
        localStorage.setItem("aria_downloads", JSON.stringify(next));
        return next;
      });
    } catch (e) {
      console.error("Failed to download track", e);
    } finally {
      setDownloadingTrackIds((prev) => {
        const next = new Set(prev);
        next.delete(track.videoId);
        return next;
      });
    }
  }, [favorites, playlists, downloadingTrackIds]);


  return {
    playlists,
    ytPlaylists,
    favorites,
    favoriteSort,
    recentlyPlayed,
    activeTab,
    isSidebarOpen,
    isOnline,
    showCreatePlaylistModal,
    newPlaylistName,
    activeDropdownTrackId,
    downloads,
    downloadingTrackIds,
    setPlaylists,
    setYtPlaylists,
    setFavorites,
    setFavoriteSort,
    setRecentlyPlayed,
    setActiveTab,
    toggleSidebar,
    setShowCreatePlaylistModal: customSetShowCreatePlaylistModal,
    setNewPlaylistName,
    setActiveDropdownTrackId,
    savePlaylists,
    saveFavorites,
    isFavorite,
    toggleFavorite,
    createPlaylist,
    deletePlaylist,
    handleTabChange,
    addTrackToPlaylist,
    removeTrackFromPlaylist,
    addToRecentlyPlayed,
    downloadTrack,
    deleteDownload,
  };
}
