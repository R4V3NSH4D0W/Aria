import React, { useEffect, useState, useMemo } from "react";
import { X, Loader2, FileText, Coffee, Moon, Mic } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { Track } from "../types";

interface Word {
  text: string;
  time: number;
}

interface SyncedLine {
  time: number;
  text: string;
  words?: Word[];
}

interface LyricsOverlayProps {
  show: boolean;
  onClose: () => void;
  currentTrack: Track;
  lyrics: string | null;
  lyricsLoading: boolean;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  karaokeMode: boolean;
  setKaraokeMode: (value: boolean) => void;
}

const KEEP_AWAKE_KEY = "aria_lyrics_keep_awake";

function readKeepAwakePreference(): boolean {
  const saved = localStorage.getItem(KEEP_AWAKE_KEY);
  if (saved === null) return true; // default on
  return saved === "true";
}

export const LyricsOverlay: React.FC<LyricsOverlayProps> = ({
  show,
  onClose,
  currentTrack,
  lyrics,
  lyricsLoading,
  audioRef,
  karaokeMode,
  setKaraokeMode,
}) => {
  const [preciseProgress, setPreciseProgress] = useState(0);
  const [keepAwake, setKeepAwake] = useState(readKeepAwakePreference);

  // Time-synced lyrics parser helper
  const parsedLyrics = useMemo(() => {
    if (!lyrics) return { type: "plain" as const, lines: "" };

    const lines = lyrics.split("\n");
    const parsedLines: SyncedLine[] = [];
    const timeRegex = /^\[(\d+):(\d+)(?:\.(\d+))?\](.*)/;
    let isSynced = false;

    for (const line of lines) {
      const match = timeRegex.exec(line.trim());
      if (match) {
        isSynced = true;
        const minutes = parseInt(match[1], 10);
        const seconds = parseInt(match[2], 10);
        const msStr = match[3] || "0";
        const milliseconds = parseInt(msStr.padEnd(3, "0").slice(0, 3), 10);

        const time = minutes * 60 + seconds + milliseconds / 1000;
        const text = match[4].trim();

        // Parse Enhanced LRC word timestamps like <00:12.30> word
        const wordRegex = /<(\d+):(\d+)(?:\.(\d+))?>([^<]*)/g;
        const words: Word[] = [];
        let wordMatch;
        let cleanText = "";

        while ((wordMatch = wordRegex.exec(text)) !== null) {
          const wMin = parseInt(wordMatch[1], 10);
          const wSec = parseInt(wordMatch[2], 10);
          const wMsStr = wordMatch[3] || "0";
          const wMs = parseInt(wMsStr.padEnd(3, "0").slice(0, 3), 10);
          const wTime = wMin * 60 + wSec + wMs / 1000;
          const wText = wordMatch[4].trim();

          if (wText) {
            words.push({ text: wText, time: wTime });
            cleanText += (cleanText ? " " : "") + wText;
          }
        }

        // If no word tags are found, use the plain text
        if (words.length === 0) {
          cleanText = text;
        }

        parsedLines.push({
          time,
          text: cleanText,
          words: words.length > 0 ? words : undefined,
        });
      } else {
        const text = line.trim();
        if (text) {
          parsedLines.push({
            time: parsedLines.length > 0 ? parsedLines[parsedLines.length - 1].time : 0,
            text,
          });
        }
      }
    }

    if (isSynced && parsedLines.length > 0) {
      parsedLines.sort((a, b) => a.time - b.time);
      return { type: "synced" as const, lines: parsedLines };
    }

    return { type: "plain" as const, lines: lyrics };
  }, [lyrics]);

  // Keep display awake while lyrics mode is open (when enabled)
  useEffect(() => {
    const shouldKeepAwake = show && keepAwake;
    invoke("set_keep_awake", { enabled: shouldKeepAwake }).catch((err) => {
      console.error("Keep awake failed:", err);
    });

    return () => {
      invoke("set_keep_awake", { enabled: false }).catch(() => {});
    };
  }, [show, keepAwake]);

  const toggleKeepAwake = () => {
    setKeepAwake((prev) => {
      const next = !prev;
      localStorage.setItem(KEEP_AWAKE_KEY, String(next));
      return next;
    });
  };

  const toggleKaraokeMode = () => {
    setKaraokeMode(!karaokeMode);
  };

  // RequestAnimationFrame loop with sub-millisecond system clock interpolation
  useEffect(() => {
    if (!show || parsedLyrics.type !== "synced") return;

    let animationFrameId: number;
    let lastAudioTime = 0;
    let lastSystemTime = performance.now();
    let isPlaying = false;

    const updateProgress = () => {
      const audio = audioRef.current;
      if (audio) {
        const now = performance.now();
        const playing = !audio.paused && !audio.seeking;
        
        // Sync with browser audio state when it actually steps/changes
        if (audio.currentTime !== lastAudioTime || playing !== isPlaying) {
          lastAudioTime = audio.currentTime;
          lastSystemTime = now;
          isPlaying = playing;
        }

        let computedProgress = lastAudioTime;
        if (isPlaying) {
          // Interpolate exact elapsed time between stepped browser ticks
          const elapsed = (now - lastSystemTime) / 1000;
          computedProgress = lastAudioTime + elapsed * audio.playbackRate;
        }

        setPreciseProgress(computedProgress);
      }
      animationFrameId = requestAnimationFrame(updateProgress);
    };

    animationFrameId = requestAnimationFrame(updateProgress);
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [show, parsedLyrics, audioRef]);

  // Find active line index based on precise progress
  const activeLyricIndex = useMemo(() => {
    if (parsedLyrics.type !== "synced") return -1;

    // Snappy lead time offset (approx. 400ms) to ensure highlighted words align with vocal start
    const LYRIC_OFFSET = 0.4;
    const adjustedProgress = preciseProgress + LYRIC_OFFSET;

    let activeIdx = -1;
    for (let i = 0; i < parsedLyrics.lines.length; i++) {
      const line = parsedLyrics.lines[i];
      if (adjustedProgress >= line.time) {
        activeIdx = i;
      } else {
        break;
      }
    }
    return activeIdx;
  }, [parsedLyrics, preciseProgress]);

  // Smooth scroll active line into view
  useEffect(() => {
    if (show && activeLyricIndex !== -1) {
      const activeEl = document.getElementById(`lyric-line-${activeLyricIndex}`);
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [activeLyricIndex, show]);

  if (!show) return null;

  const LYRIC_OFFSET = 0.4;
  const adjustedProgress = preciseProgress + LYRIC_OFFSET;

  return (
    <div className="fixed inset-0 z-[70] bg-[#07080a]/92 backdrop-blur-3xl flex flex-col animate-fade-in">
      {/* Header */}
      <div
        className={`flex items-center justify-between gap-3 pl-20 pr-6 shrink-0 transition-all duration-300 ${
          karaokeMode
            ? "py-3 border-b border-transparent"
            : "py-5 border-b border-white/5"
        }`}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <img
            src={currentTrack.thumbnail}
            alt={currentTrack.title}
            className={`rounded-xl object-cover border border-white/10 shadow-lg shrink-0 transition-all ${
              karaokeMode ? "w-9 h-9" : "w-12 h-12"
            }`}
          />
          <div className="min-w-0">
            <h2
              className={`font-bold text-white leading-tight truncate ${
                karaokeMode ? "text-sm" : "text-base"
              }`}
            >
              {currentTrack.title}
            </h2>
            {!karaokeMode && (
              <p className="text-xs text-slate-400 mt-0.5 truncate">
                {currentTrack.uploaderName}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={toggleKaraokeMode}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full border text-xs font-semibold transition-all cursor-pointer ${
              karaokeMode
                ? "bg-indigo-500/20 border-indigo-400/40 text-indigo-300"
                : "bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10"
            }`}
            title={karaokeMode ? "Exit karaoke mode" : "Enter karaoke mode"}
          >
            <Mic className="w-4 h-4" />
            <span>{karaokeMode ? "Karaoke On" : "Karaoke"}</span>
          </button>
          <button
            onClick={toggleKeepAwake}
            className={`p-2.5 rounded-full border transition-all cursor-pointer ${
              keepAwake
                ? "bg-indigo-500/15 border-indigo-400/30 text-indigo-300 hover:bg-indigo-500/25"
                : "bg-white/5 border-white/5 text-slate-400 hover:text-white hover:bg-white/10"
            }`}
            title={keepAwake ? "Keep screen awake (on)" : "Keep screen awake (off)"}
          >
            {keepAwake ? <Coffee className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button
            onClick={onClose}
            className="p-2.5 rounded-full bg-white/5 border border-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            title="Close lyrics"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Lyrics Content — pad bottom in normal mode so lines clear the floating player */}
      <div
        className={`flex-1 overflow-y-auto px-6 flex flex-col items-center justify-start min-h-0 scrollbar-thin select-text ${
          karaokeMode ? "pt-10 pb-24" : "pt-12 pb-40"
        }`}
      >
        {lyricsLoading ? (
          <div className="my-auto flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
            <p className="text-sm text-slate-500 font-medium animate-pulse">
              Fetching lyrics...
            </p>
          </div>
        ) : lyrics ? (
          parsedLyrics.type === "synced" ? (
            <div
              className={`max-w-7xl w-full flex flex-col select-text text-center ${
                karaokeMode ? "gap-10 py-8 px-4" : "gap-8 py-12 px-4"
              }`}
            >
              {parsedLyrics.lines.map((line, idx) => {
                const isActive = idx === activeLyricIndex;
                if (isActive) {
                  if (line.words) {
                    // 1. High-precision syllable/word timing if available (eLRC)
                    return (
                      <p
                        key={idx}
                        id={`lyric-line-${idx}`}
                        className={`text-center font-black scale-[1.02] transition-all duration-300 origin-center flex flex-wrap justify-center gap-x-2 gap-y-1 ${
                          karaokeMode
                            ? "text-4xl sm:text-5xl lg:text-6xl"
                            : "text-3xl sm:text-4xl lg:text-5xl"
                        }`}
                      >
                        {line.words.map((word, wIdx) => {
                          const nextWord = line.words![wIdx + 1];
                          const wordEndTime = nextWord ? nextWord.time : (parsedLyrics.lines[idx + 1]?.time ?? (audioRef.current?.duration || word.time + 3));
                          const wordDuration = Math.max(wordEndTime - word.time, 0.1);
                          const wordProgress = Math.max(0, Math.min(1, (adjustedProgress - word.time) / wordDuration));
                          const fillPercent = wordProgress * 100;

                          return (
                            <span
                              key={wIdx}
                              style={{
                                background: `linear-gradient(to right, #6366f1 ${fillPercent}%, rgba(255,255,255,0.25) ${fillPercent}%)`,
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                                display: "inline-block",
                              }}
                            >
                              {word.text}
                            </span>
                          );
                        })}
                      </p>
                    );
                  } else {
                    // 2. Continuous Word Water-Flow Highlighting Fallback (LRC)
                    const words = line.text.split(/\s+/);
                    const nextLine = parsedLyrics.lines[idx + 1];
                    const lineGap = nextLine ? nextLine.time - line.time : 8.0;
                    
                    // Distribute words over an estimated singing duration to avoid slow sweeps in silent gaps
                    const wordDuration = 0.35; // 350ms average singing duration per word
                    const estimatedVocalDuration = words.length * wordDuration + 0.3;
                    const activeDuration = Math.min(lineGap, estimatedVocalDuration);
                    const adjustedWordDuration = activeDuration / Math.max(words.length, 1);

                    return (
                      <p
                        key={idx}
                        id={`lyric-line-${idx}`}
                        className={`text-center font-black scale-[1.02] transition-all duration-300 origin-center flex flex-wrap justify-center gap-x-2 gap-y-1 ${
                          karaokeMode
                            ? "text-4xl sm:text-5xl lg:text-6xl"
                            : "text-3xl sm:text-4xl lg:text-5xl"
                        }`}
                      >
                        {words.map((word, wIdx) => {
                          const wordStartTime = line.time + wIdx * adjustedWordDuration;
                          const wordProgress = Math.max(0, Math.min(1, (adjustedProgress - wordStartTime) / adjustedWordDuration));
                          const fillPercent = wordProgress * 100;

                          return (
                            <span
                              key={wIdx}
                              style={{
                                background: `linear-gradient(to right, #6366f1 ${fillPercent}%, rgba(255,255,255,0.25) ${fillPercent}%)`,
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                                display: "inline-block",
                              }}
                            >
                              {word}
                            </span>
                          );
                        })}
                      </p>
                    );
                  }
                } else {
                  return (
                    <p
                      key={idx}
                      id={`lyric-line-${idx}`}
                      className={`text-center font-extrabold text-slate-500 opacity-25 hover:opacity-50 transition-all duration-300 origin-center leading-normal ${
                        karaokeMode
                          ? "text-3xl sm:text-4xl lg:text-5xl"
                          : "text-2xl sm:text-3xl lg:text-4xl"
                      }`}
                    >
                      {line.text}
                    </p>
                  );
                }
              })}
            </div>
          ) : (
            <div className="max-w-2xl text-center font-bold text-xl sm:text-2xl lg:text-3xl text-slate-200 leading-relaxed whitespace-pre-wrap tracking-tight py-4 drop-shadow-md select-text hover:text-white transition-colors">
              {parsedLyrics.lines}
            </div>
          )
        ) : (
          <div className="my-auto text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-6 h-6 text-indigo-400/40" />
            </div>
            <p className="text-base text-slate-400 font-semibold">
              No lyrics found
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Lyrics aren't available for this track right now.
            </p>
          </div>
        )}
      </div>
      {/* karaoke toggle lives in header only */}
    </div>
  );
};
