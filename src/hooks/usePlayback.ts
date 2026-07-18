import { useState, useEffect, useRef, useCallback } from "react";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { Track } from "../types";

interface UsePlaybackProps {
  getActiveTracks: () => Track[];
  onTrackPlayed?: (track: Track) => void;
  onResolveStateChange?: (videoId: string, isResolving: boolean) => void;
}

export function usePlayback({
  getActiveTracks,
  onTrackPlayed,
  onResolveStateChange,
}: UsePlaybackProps) {
  // Playback state
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [playbackError, setPlaybackError] = useState("");
  const [resolvedAudioUrl, setResolvedAudioUrl] = useState<string | null>(null);
  const [lyrics, setLyrics] = useState<string | null>(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);

  // Audio & Playback Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const autoAdvancedRef = useRef(false);

  // Tracking for recently played threshold (30 seconds)
  const recentlyPlayedAddedRef = useRef<string | null>(null);
  const playDurationRef = useRef(0);
  const lastTimeRef = useRef<number | null>(null);
  const lastSeekTimeRef = useRef<number>(0);

  // Reset recently played tracking helper
  const resetThresholdTracking = useCallback(() => {
    recentlyPlayedAddedRef.current = null;
    playDurationRef.current = 0;
    lastTimeRef.current = null;
  }, []);

  // Play track (Resolves unencrypted stream directly from YouTube client in Rust)
  const playTrack = useCallback(
    async (track: Track) => {
      setPlaybackError("");
      setIsPlaying(false);
      setResolvedAudioUrl(null);
      setDuration(0);
      setProgress(0);
      autoAdvancedRef.current = false; // reset guard for new track
      resetThresholdTracking();

      // Set loading indicator via callback
      if (onResolveStateChange) {
        onResolveStateChange(track.videoId, true);
      }
      setCurrentTrack({ ...track, isResolving: true });

      try {
        const localPath = await invoke<string | null>("check_download_exists", {
          videoId: track.videoId,
        });

        let targetAudioUrl = "";
        let targetDuration = track.duration || 0;

        if (localPath) {
          targetAudioUrl = convertFileSrc(localPath);
          console.log("Playing downloaded local track:", targetAudioUrl);
        } else {
          const rawJson = await invoke<string>("get_yt_stream_direct", {
            videoId: track.videoId,
          });
          const streamData = JSON.parse(rawJson) as {
            url: string;
            duration: number;
          };
          targetAudioUrl = streamData.url;
          if (streamData.duration > 0) {
            targetDuration = streamData.duration;
          }
        }

        if (targetAudioUrl) {
          setResolvedAudioUrl(targetAudioUrl);
          setCurrentTrack({ ...track, isResolving: false });
          if (targetDuration > 0) {
            setDuration(targetDuration);
          }

          // Fetch lyrics asynchronously
          setLyrics(null);
          setLyricsLoading(true);
          invoke<string | null>("get_yt_lyrics", {
            videoId: track.videoId,
            title: track.title,
            artist: track.uploaderName,
            duration: Math.round(targetDuration || 0),
          })
            .then((lyricText) => {
              setLyrics(lyricText);
            })
            .catch((e) => {
              console.error("Failed to load lyrics:", e);
              setLyrics(null);
            })
            .finally(() => {
              setLyricsLoading(false);
            });
        } else {
          throw new Error("No stream URL");
        }
      } catch (err) {
        console.error("Playback stream error:", err);
        setPlaybackError("Unable to load full track. YouTube server busy.");
        setCurrentTrack(null);
      } finally {
        if (onResolveStateChange) {
          onResolveStateChange(track.videoId, false);
        }
      }
    },
    [onResolveStateChange, resetThresholdTracking]
  );

  const handleNext = useCallback(() => {
    if (!currentTrack) return;

    const playbackList = queue.length > 0 ? queue : getActiveTracks();
    if (playbackList.length === 0) return;

    const currentIndex = playbackList.findIndex(
      (t) => t.videoId === currentTrack.videoId
    );

    let nextIndex = currentIndex + 1;
    if (isShuffled) {
      nextIndex = Math.floor(Math.random() * playbackList.length);
    } else if (currentIndex === -1 || nextIndex >= playbackList.length) {
      nextIndex = 0; // Loop back to start
    }

    playTrack(playbackList[nextIndex]);
  }, [currentTrack, queue, getActiveTracks, isShuffled, playTrack]);

  const handlePrev = useCallback(() => {
    if (!currentTrack) return;

    const playbackList = queue.length > 0 ? queue : getActiveTracks();
    if (playbackList.length === 0) return;

    const currentIndex = playbackList.findIndex(
      (t) => t.videoId === currentTrack.videoId
    );
    let prevIndex =
      currentIndex === -1 ? playbackList.length - 1 : currentIndex - 1;

    if (prevIndex < 0) {
      prevIndex = playbackList.length - 1;
    }

    playTrack(playbackList[prevIndex]);
  }, [currentTrack, queue, getActiveTracks, playTrack]);

  // Audio event handlers
  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current && currentTrack) {
      const curTime = audioRef.current.currentTime;
      setProgress(curTime);

      // Accumulate play duration to check against 30s threshold
      if (lastTimeRef.current !== null) {
        const delta = curTime - lastTimeRef.current;
        // Only accumulate if the time increment is normal (not a seek)
        if (delta > 0 && delta < 2) {
          playDurationRef.current += delta;
        }
      }
      lastTimeRef.current = curTime;

      // Add to recently played if threshold is reached (30s, or 90% for short tracks)
      const targetThreshold = Math.min(30, duration > 0 ? duration * 0.9 : 30);
      if (
        playDurationRef.current >= targetThreshold &&
        recentlyPlayedAddedRef.current !== currentTrack.videoId
      ) {
        recentlyPlayedAddedRef.current = currentTrack.videoId;
        if (onTrackPlayed) {
          onTrackPlayed(currentTrack);
        }
      }

      // Auto-advance when we reach the song's actual duration from YouTube metadata.
      // Ignore if a manual seek occurred within the last 1 second to allow seeking near the end
      const isRecentlySeeking = Date.now() - lastSeekTimeRef.current < 1000;
      if (duration > 0 && curTime >= duration && !isRecentlySeeking && !autoAdvancedRef.current) {
        autoAdvancedRef.current = true;
        audioRef.current.pause();
        handleNext();
      }
    }
  }, [currentTrack, duration, handleNext, onTrackPlayed]);

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      const audioDur = audioRef.current.duration;
      // Only use audio element duration as fallback
      setDuration((prev) =>
        prev > 0 ? prev : isFinite(audioDur) ? audioDur : 0
      );
    }
  }, []);

  const handleAudioEnded = useCallback(() => {
    handleNext();
  }, [handleNext]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !audio.src) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      lastTimeRef.current = null; // Reset lastTime so pausing doesn't affect duration calculations on resume
    } else {
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          if (err?.name === "AbortError") return; // benign
          setPlaybackError("Playback resume failed.");
        });
    }
  }, [isPlaying]);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (!audioRef.current) return;
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    audioRef.current.muted = nextMuted;
  }, [isMuted]);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const seekTime = parseFloat(e.target.value);
    if (audioRef.current) {
      lastSeekTimeRef.current = Date.now();
      audioRef.current.currentTime = seekTime;
      setProgress(seekTime);
      lastTimeRef.current = null; // Clear last time so seek jump is not counted
    }
  }, []);

  const addTrackToQueue = useCallback(
    async (track: Track) => {
      if (queue.some((item) => item.videoId === track.videoId)) return;

      setQueue((prev) => [...prev, { ...track, isResolving: true }]);

      try {
        const rawJson = await invoke<string>("get_yt_stream_direct", {
          videoId: track.videoId,
        });
        const streamData = JSON.parse(rawJson) as {
          url: string;
          duration: number;
        };

        if (streamData.duration > 0) {
          setQueue((prev) =>
            prev.map((item) =>
              item.videoId === track.videoId
                ? { ...item, duration: streamData.duration, isResolving: false }
                : item
            )
          );
        } else {
          setQueue((prev) =>
            prev.map((item) =>
              item.videoId === track.videoId
                ? { ...item, isResolving: false }
                : item
            )
          );
        }
      } catch (err) {
        console.error("Queue metadata error:", err);
        setQueue((prev) =>
          prev.map((item) =>
            item.videoId === track.videoId ? { ...item, isResolving: false } : item
          )
        );
      }
    },
    [queue]
  );

  const reorderQueue = useCallback((fromIndex: number, toIndex: number) => {
    setQueue((prev) => {
      if (
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= prev.length ||
        toIndex >= prev.length ||
        fromIndex === toIndex
      ) {
        return prev;
      }

      const nextQueue = [...prev];
      const [movedTrack] = nextQueue.splice(fromIndex, 1);
      nextQueue.splice(toIndex, 0, movedTrack);
      return nextQueue;
    });
  }, []);

  const removeFromQueue = useCallback((videoId: string) => {
    setQueue((prev) => prev.filter((track) => track.videoId !== videoId));
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
  }, []);

  const playSongs = useCallback(
    (songs: Track[], shuffle: boolean, startFromTrackId?: string) => {
      if (songs.length === 0) return;

      let playbackList = [...songs];
      if (shuffle) {
        playbackList.sort(() => Math.random() - 0.5);
      } else if (startFromTrackId) {
        const idx = playbackList.findIndex((t) => t.videoId === startFromTrackId);
        if (idx !== -1) {
          const targetTrack = playbackList[idx];
          setQueue(playbackList);
          playTrack(targetTrack);
          return;
        }
      }

      setQueue(playbackList);
      playTrack(playbackList[0]);
    },
    [playTrack]
  );

  // Play audio when stream URL resolves
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !resolvedAudioUrl) return;

    // Wait for canplay before calling .play() — prevents AbortError
    const onCanPlay = () => {
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          if (err?.name === "AbortError") return; // benign: interrupted by a new load
          console.error("Playback error:", err);
          setPlaybackError("Audio playback failed. Try again.");
        });
    };

    audio.load();
    audio.addEventListener("canplay", onCanPlay, { once: true });

    return () => {
      audio.removeEventListener("canplay", onCanPlay);
    };
  }, [resolvedAudioUrl]);

  // Media Session API for macOS/Windows/Android lockscreen and control center
  useEffect(() => {
    if ("mediaSession" in navigator && currentTrack) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.uploaderName,
        artwork: [
          {
            src: currentTrack.thumbnail,
            sizes: "512x512",
            type: "image/jpeg",
          },
        ],
      });
      navigator.mediaSession.setActionHandler("previoustrack", handlePrev);
      navigator.mediaSession.setActionHandler("nexttrack", handleNext);
    }
  }, [currentTrack, handlePrev, handleNext]);

  return {
    currentTrack,
    queue,
    isPlaying,
    progress,
    duration,
    volume,
    isMuted,
    isLooping,
    isShuffled,
    playbackError,
    resolvedAudioUrl,
    lyrics,
    lyricsLoading,
    audioRef,
    setPlaybackError,
    setIsShuffled,
    setIsLooping,
    playTrack,
    togglePlay,
    handleVolumeChange,
    toggleMute,
    handleSeek,
    handleNext,
    handlePrev,
    addTrackToQueue,
    reorderQueue,
    removeFromQueue,
    clearQueue,
    playSongs,
    handleTimeUpdate,
    handleLoadedMetadata,
    handleAudioEnded,
  };
}
