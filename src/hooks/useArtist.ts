import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Track, ArtistDetails } from "../types";

interface UseArtistProps {
  resolveTrackDuration: (track: Track) => Promise<Track>;
}

export function useArtist({ resolveTrackDuration }: UseArtistProps) {
  const [selectedArtist, setSelectedArtist] = useState<ArtistDetails | null>(null);
  const [artistLoading, setArtistLoading] = useState(false);
  const [artistError, setArtistError] = useState("");

  const loadArtist = useCallback(
    async (browseId: string) => {
      setArtistLoading(true);
      setArtistError("");
      setSelectedArtist(null);
      try {
        const details = await invoke<ArtistDetails>("get_yt_artist", { browseId });
        if (details && details.songs && details.songs.length > 0) {
          const resolvedSongs = await Promise.all(
            details.songs.map((track) => resolveTrackDuration(track))
          );
          details.songs = resolvedSongs;
        }
        setSelectedArtist(details);
      } catch (err) {
        console.error("Failed to load artist:", err);
        setArtistError("Failed to load artist details.");
      }
      setArtistLoading(false);
    },
    [resolveTrackDuration]
  );

  return {
    selectedArtist,
    artistLoading,
    artistError,
    setSelectedArtist,
    setArtistError,
    loadArtist,
  };
}
