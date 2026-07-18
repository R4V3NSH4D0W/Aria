import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Track, Playlist, YtPlaylist } from "../types";

export function useLibrary() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [ytPlaylists, setYtPlaylists] = useState<YtPlaylist[]>([]);
  const [favorites, setFavorites] = useState<Track[]>([]);
  const [favoriteSort, setFavoriteSort] = useState<"recent" | "oldest" | "title">("recent");
  const [recentlyPlayed, setRecentlyPlayed] = useState<Track[]>(() => {
    const saved = localStorage.getItem("aria_recently_played");
    return saved ? JSON.parse(saved) : [];
  });
  const [activeTab, setActiveTab] = useState<string>("home");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showCreatePlaylistModal, setShowCreatePlaylistModal] = useState(false);
  const [pendingTrackForPlaylist, setPendingTrackForPlaylist] = useState<Track | null>(null);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [activeDropdownTrackId, setActiveDropdownTrackId] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

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

  const isFavorite = useCallback(
    (track: Track) => favorites.some((t) => t.videoId === track.videoId),
    [favorites]
  );

  const toggleFavorite = useCallback(
    (track: Track) => {
      let updated;
      if (isFavorite(track)) {
        updated = favorites.filter((t) => t.videoId !== track.videoId);
      } else {
        updated = [...favorites, { ...track, addedAt: Date.now() }];
      }
      saveFavorites(updated);
    },
    [favorites, isFavorite, saveFavorites]
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
      const updated = playlists.filter((p) => p.id !== id);
      savePlaylists(updated);
      if (activeTab === id) setActiveTab("search");
    },
    [playlists, activeTab, savePlaylists]
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
    setPlaylists,
    setYtPlaylists,
    setFavorites,
    setFavoriteSort,
    setRecentlyPlayed,
    setActiveTab,
    setIsSidebarOpen,
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
  };
}
