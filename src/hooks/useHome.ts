import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { HomeSection } from "../types";

export function useHome() {
  const [sections, setSections] = useState<HomeSection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchHome = useCallback(async (force = false) => {
    if (hasLoaded && !force) return;
    setLoading(true);
    setError(null);
    try {
      let results = await invoke<HomeSection[]>("get_yt_home");
      
      // If results are empty (e.g. anonymous/logged-out session returning no playable carousels),
      // we run a quick query for popular songs as fallback recommendations to populate Quick Picks.
      if (results.length === 0) {
        console.log("Home feed returned no playable tracks. Fetching popular tracks as fallback...");
        const fallbackTracks = await invoke<any[]>("search_yt_direct", { query: "Top Hits" });
        const songsOnly = fallbackTracks.filter((item) => item.type === "track");
        if (songsOnly.length > 0) {
          results = [{
            title: "Quick Picks",
            items: songsOnly
          }];
        }
      }
      
      setSections(results);
      setHasLoaded(true);
    } catch (err) {
      console.error("Failed to load home:", err);
      if (navigator.onLine) {
        setError("Unable to load home feed. Please check your internet connection.");
      } else {
        setError(null);
      }
    } finally {
      setLoading(false);
    }
  }, [hasLoaded]);

  return {
    sections,
    loading,
    error,
    fetchHome,
    hasLoaded,
  };
}
