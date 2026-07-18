import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { CommunityPlaylist } from "../components/home/CommunityPlaylists";

export function useExplore() {
  const [playlists, setPlaylists] = useState<CommunityPlaylist[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchExplore = useCallback(async (force = false) => {
    if (hasLoaded && !force) return;
    setLoading(true);
    try {
      const results = await invoke<CommunityPlaylist[]>("get_yt_explore");
      setPlaylists(results);
      setHasLoaded(true);
    } catch (err) {
      console.error("Failed to load explore feed:", err);
      // Silently fail — community section simply won't show
    } finally {
      setLoading(false);
    }
  }, [hasLoaded]);

  return { playlists, loading, fetchExplore, hasLoaded };
}
