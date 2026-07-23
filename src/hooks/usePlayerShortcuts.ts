import { useEffect } from "react";
import { Track } from "../types";

interface UsePlayerShortcutsArgs {
  enabled: boolean;
  currentTrack: Track | null;
  isShuffled: boolean;
  repeatMode: "none" | "all" | "one";
  togglePlay: () => void;
  handleNext: () => void;
  handlePrev: () => void;
  seekBy: (deltaSeconds: number) => void;
  adjustVolume: (delta: number) => void;
  toggleMute: () => void;
  setIsShuffled: (shuffled: boolean) => void;
  setRepeatMode: (mode: "none" | "all" | "one") => void;
  toggleFavorite: (track: Track) => void;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return Boolean(target.closest("[contenteditable='true']"));
}

export function usePlayerShortcuts({
  enabled,
  currentTrack,
  isShuffled,
  repeatMode,
  togglePlay,
  handleNext,
  handlePrev,
  seekBy,
  adjustVolume,
  toggleMute,
  setIsShuffled,
  setRepeatMode,
  toggleFavorite,
}: UsePlayerShortcutsArgs) {
  useEffect(() => {
    if (!enabled || !currentTrack) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;

      const mod = e.metaKey || e.ctrlKey;
      const key = e.key;

      if (key === " " || key === "Spacebar") {
        e.preventDefault();
        togglePlay();
        return;
      }

      if (key === "ArrowLeft") {
        e.preventDefault();
        if (mod) handlePrev();
        else seekBy(-5);
        return;
      }

      if (key === "ArrowRight") {
        e.preventDefault();
        if (mod) handleNext();
        else seekBy(5);
        return;
      }

      if (key === "ArrowUp") {
        e.preventDefault();
        adjustVolume(0.05);
        return;
      }

      if (key === "ArrowDown") {
        e.preventDefault();
        adjustVolume(-0.05);
        return;
      }

      // Letter shortcuts should not fire with modifiers
      if (mod || e.shiftKey) return;

      if (key === "m" || key === "M") {
        e.preventDefault();
        toggleMute();
        return;
      }

      if (key === "l" || key === "L") {
        e.preventDefault();
        toggleFavorite(currentTrack);
        return;
      }

      if (key === "s" || key === "S") {
        e.preventDefault();
        setIsShuffled(!isShuffled);
        return;
      }

      if (key === "r" || key === "R") {
        e.preventDefault();
        const modes: ("none" | "all" | "one")[] = ["none", "all", "one"];
        const nextMode = modes[(modes.indexOf(repeatMode) + 1) % modes.length];
        setRepeatMode(nextMode);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    enabled,
    currentTrack,
    isShuffled,
    repeatMode,
    togglePlay,
    handleNext,
    handlePrev,
    seekBy,
    adjustVolume,
    toggleMute,
    setIsShuffled,
    setRepeatMode,
    toggleFavorite,
  ]);
}
