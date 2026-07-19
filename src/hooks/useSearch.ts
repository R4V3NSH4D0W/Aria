import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Track, SearchResultItem } from "../types";

interface UseSearchProps {
  setActiveTab: (tab: string) => void;
}

export function useSearch({ setActiveTab }: UseSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [searchError, setSearchError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  const resolveTrackDuration = useCallback(async (track: Track): Promise<Track> => {
    try {
      const rawJson = await invoke<string>("get_yt_stream_direct", {
        videoId: track.videoId,
      });
      const streamData = JSON.parse(rawJson) as {
        url: string;
        duration: number;
      };
      if (streamData.url) {
        return {
          ...track,
          duration: streamData.duration,
        };
      }
    } catch (err) {
      console.error("Failed to resolve track duration:", err);
    }
    return track;
  }, []);

  const handleSearch = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      const query = searchQuery.trim();
      if (!query) return;

      setLoading(true);
      setSearchError("");
      setHasSearched(true);
      setActiveTab("search");

      try {
        const results = await invoke<SearchResultItem[]>("search_yt_direct", {
          query,
          params: null,
        });
        if (results && results.length > 0) {
          const resolved = await Promise.all(
            results.map(async (item) => {
              if ("type" in item && item.type === "artist") return item;
              return resolveTrackDuration(item);
            })
          );
          setSearchResults(resolved);
        } else {
          setSearchResults([]);
          setSearchError("No music tracks found on YouTube Music.");
        }
      } catch (err) {
        console.error("Search failed:", err);
        setSearchError("Search failed. Please verify your connection.");
      }
      setLoading(false);
    },
    [searchQuery, setActiveTab, resolveTrackDuration]
  );

  const handleExploreGenre = useCallback(
    async (genre: string) => {
      setLoading(true);
      setSearchError("");
      setHasSearched(true);
      setActiveTab("search");
      setSearchQuery(genre);

      try {
        const results = await invoke<SearchResultItem[]>("search_yt_direct", {
          query: `${genre} Music`,
          params: null,
        });
        if (results && results.length > 0) {
          const resolved = await Promise.all(
            results.map(async (item) => {
              if ("type" in item && item.type === "artist") return item;
              return resolveTrackDuration(item);
            })
          );
          setSearchResults(resolved);
        } else {
          setSearchResults([]);
          setSearchError("No music tracks found on YouTube Music.");
        }
      } catch (err) {
        console.error("Explore genre search failed:", err);
        setSearchError("Explore failed. Please verify your connection.");
      }
      setLoading(false);
    },
    [setActiveTab, resolveTrackDuration]
  );

  return {
    searchQuery,
    loading,
    searchResults,
    searchError,
    hasSearched,
    setSearchQuery,
    setSearchResults,
    setSearchError,
    setHasSearched,
    resolveTrackDuration,
    handleSearch,
    handleExploreGenre,
  };
}
