import { useState, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Track } from "../types";

// Cache: browseId → Track[]
const cache = new Map<string, Track[]>();

export function useYtPlaylist() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const abortRef = useRef<boolean>(false);

  const loadPlaylist = useCallback(async (browseId: string, force = false) => {
    if (!browseId) return;
    if (loadedId === browseId && !force) return; // already loaded

    // Check cache first
    if (!force && cache.has(browseId)) {
      setTracks(cache.get(browseId)!);
      setLoadedId(browseId);
      return;
    }

    abortRef.current = false;
    setLoading(true);
    setError(null);
    setTracks([]);

    try {
      const result = await invoke<Track[]>("get_yt_playlist_tracks", { browseId });
      if (!abortRef.current) {
        cache.set(browseId, result);
        setTracks(result);
        setLoadedId(browseId);
      }
    } catch (err) {
      if (!abortRef.current) {
        console.error("Failed to load YT playlist tracks:", err);
        setError(String(err));
      }
    } finally {
      if (!abortRef.current) setLoading(false);
    }
  }, [loadedId]);

  const clearPlaylist = useCallback(() => {
    abortRef.current = true;
    setTracks([]);
    setLoadedId(null);
    setError(null);
    setLoading(false);
  }, []);

  return { tracks, loading, error, loadedId, loadPlaylist, clearPlaylist };
}
