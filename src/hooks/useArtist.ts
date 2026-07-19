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
    async (idOrName: string) => {
      setArtistLoading(true);
      setArtistError("");
      setSelectedArtist(null);
      try {
        let browseId = idOrName;
        // If it doesn't look like a standard YouTube browse ID, search for the artist's ID first
        if (!idOrName.startsWith("UC") && !idOrName.startsWith("FE") && !idOrName.startsWith("MDB")) {
          // Split collaboration names (e.g. "Myles Smith & Alex Warren" -> "Myles Smith") and take the first one
          const firstPart = idOrName.split(/\s*(?:&|,|feat\.?|featuring)\s*/i)[0].trim();
          const queryName = firstPart || idOrName;

          const results = await invoke<any[]>("search_yt_direct", { 
            query: queryName,
            params: "EgWKAQIgAWoKEAkQChAFEAMQBA=="
          });
          let resolvedArtist = results?.find((r) => r.type === "artist" && r.title.toLowerCase() === queryName.toLowerCase());

          // If no exact artist card is found, look for tracks where the uploader matches exactly and has an artistId
          if (!resolvedArtist) {
            const matchingTrack = results?.find((r) => r.type === "track" && r.uploaderName && r.uploaderName.toLowerCase() === queryName.toLowerCase() && r.artistId);
            if (matchingTrack) {
              resolvedArtist = { browseId: matchingTrack.artistId };
            }
          }

          // Fallback to the first artist card if still not resolved
          if (!resolvedArtist) {
            resolvedArtist = results?.find((r) => r.type === "artist");
          }

          if (resolvedArtist && resolvedArtist.browseId) {
            browseId = resolvedArtist.browseId;
          } else {
            throw new Error("Artist not found");
          }
        }

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
