import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Track, SearchResultItem } from "../types";

interface UseSearchProps {
  setActiveTab: (tab: string) => void;
}

function parseYoutubeUrl(url: string): { videoId?: string; playlistId?: string } | null {
  try {
    const cleanUrl = url.trim();
    if (!cleanUrl.includes("youtube.com") && !cleanUrl.includes("youtu.be")) {
      return null;
    }

    let videoId: string | undefined;
    let playlistId: string | undefined;

    if (cleanUrl.includes("youtube.com")) {
      const urlObj = new URL(cleanUrl);
      videoId = urlObj.searchParams.get("v") || undefined;
      playlistId = urlObj.searchParams.get("list") || undefined;
    } else if (cleanUrl.includes("youtu.be")) {
      const urlObj = new URL(cleanUrl);
      const pathParts = urlObj.pathname.split("/").filter(Boolean);
      if (pathParts.length > 0) {
        videoId = pathParts[0];
      }
      playlistId = urlObj.searchParams.get("list") || undefined;
    }

    if (videoId || playlistId) {
      return { videoId, playlistId };
    }
  } catch (err) {
    console.error("Failed to parse YouTube URL:", err);
  }
  return null;
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

      const parsed = parseYoutubeUrl(query);
      if (parsed) {
        setSearchQuery("");
        if (parsed.playlistId) {
          setActiveTab(`yt:${parsed.playlistId}`);
        } else if (parsed.videoId) {
          setActiveTab(`yt:RD${parsed.videoId}`);
        }
        return;
      }

      setLoading(true);
      setSearchError("");
      setHasSearched(true);
      setActiveTab("search");

      try {
        const results = await invoke<SearchResultItem[]>("search_yt_direct", {
          query,
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
