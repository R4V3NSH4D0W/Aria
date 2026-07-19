import { useState, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { HomeSection } from "../types";

export function useHome() {
  const [sections, setSections] = useState<HomeSection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [subscriptionMix, setSubscriptionMix] = useState<any[]>([]);
  const loadingRef = useRef(false);

  const fetchHome = useCallback(async (force = false) => {
    if (loadingRef.current) return;
    if (hasLoaded && !force) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    setSubscriptionMix([]);
    try {
      let results = await invoke<HomeSection[]>("get_yt_home");
      
      // Generate a custom "Subscription Mix" if the user has subscribed artists
      try {
        const favArtistsJson = localStorage.getItem("aria_favorite_artists");
        const favoriteArtists = favArtistsJson ? JSON.parse(favArtistsJson) : [];
        if (favoriteArtists && favoriteArtists.length > 0) {
          // Randomly select 6 subscribed artists to pool tracks (keeps network requests low and fresh)
          const shuffledArtists = [...favoriteArtists].sort(() => Math.random() - 0.5);
          const selectedArtists = shuffledArtists.slice(0, 6);
          const poolPromises = selectedArtists.map(async (art: any) => {
            try {
              const browseId = art.browseId || art.id || art.artistId;
              if (!browseId) return [];
              const details = await invoke<any>("get_yt_artist", { browseId });
              return details?.songs || [];
            } catch {
              return [];
            }
          });
          const pools = await Promise.all(poolPromises);
          const allTracks = pools.flat();

          if (allTracks.length > 0) {
            // Shuffle the pooled tracks randomly
            const shuffled = [...allTracks].sort(() => Math.random() - 0.5);
            // Deduplicate tracks by videoId
            const uniqueTracksMap = new Map();
            for (const track of shuffled) {
              if (track.videoId && !uniqueTracksMap.has(track.videoId)) {
                uniqueTracksMap.set(track.videoId, track);
              }
              if (uniqueTracksMap.size >= 25) break;
            }
            const mixTracks = Array.from(uniqueTracksMap.values());

            if (mixTracks.length > 0) {
              setSubscriptionMix(mixTracks);
            }
          }
        }
      } catch (mixErr) {
        console.error("Failed to generate Subscription Mix:", mixErr);
      }

      // If results are empty (e.g. anonymous/logged-out session returning no playable carousels),
      // we run a quick query for popular songs as fallback recommendations to populate Quick Picks.
      if (results.length === 0) {
        console.log("Home feed returned no playable tracks. Fetching popular tracks as fallback...");
        const fallbackTracks = await invoke<any[]>("search_yt_direct", { query: "Top Hits", params: null });
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
      loadingRef.current = false;
      setLoading(false);
    }
  }, [hasLoaded]);

  return {
    sections,
    loading,
    error,
    fetchHome,
    hasLoaded,
    subscriptionMix,
  };
}
