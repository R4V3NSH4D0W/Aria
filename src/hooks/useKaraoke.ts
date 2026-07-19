import { useState, useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

export function useKaraoke() {
  const [showLyricsMode, setShowLyricsMode] = useState(false);
  const [karaokeMode, setKaraokeMode] = useState(false);

  // Sync fullscreen state with karaoke mode
  useEffect(() => {
    const syncFullscreen = async () => {
      try {
        const appWindow = getCurrentWindow();
        if (showLyricsMode && karaokeMode) {
          await appWindow.setFullscreen(true);
        } else {
          await appWindow.setFullscreen(false);
        }
      } catch (err) {
        console.error("Failed to sync fullscreen state:", err);
      }
    };
    syncFullscreen();
  }, [showLyricsMode, karaokeMode]);

  // Turn off karaoke when window exits fullscreen externally (macOS green button etc.)
  useEffect(() => {
    if (!showLyricsMode) return;
    const appWindow = getCurrentWindow();
    let cleanup: (() => void) | null = null;
    appWindow
      .onResized(async () => {
        const isFullscreen = await appWindow.isFullscreen().catch(() => false);
        setKaraokeMode((prev) => (prev && !isFullscreen ? false : prev));
      })
      .then((fn) => {
        cleanup = fn;
      });
    return () => cleanup?.();
  }, [showLyricsMode, karaokeMode]);

  // Turn off karaoke mode when lyrics overlay is closed
  useEffect(() => {
    if (!showLyricsMode) {
      setKaraokeMode(false);
    }
  }, [showLyricsMode]);

  // Exit karaoke mode on Escape
  useEffect(() => {
    if (!showLyricsMode || !karaokeMode) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setKaraokeMode(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showLyricsMode, karaokeMode]);

  return {
    showLyricsMode,
    setShowLyricsMode,
    karaokeMode,
    setKaraokeMode,
  };
}
