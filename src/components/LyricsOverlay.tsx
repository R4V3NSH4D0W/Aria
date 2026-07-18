import React, { useEffect, useState, useMemo } from "react";
import { X, Loader2, FileText } from "lucide-react";
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
}

export const LyricsOverlay: React.FC<LyricsOverlayProps> = ({
  show,
  onClose,
  currentTrack,
  lyrics,
  lyricsLoading,
  audioRef,
}) => {
  const [preciseProgress, setPreciseProgress] = useState(0);

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

  // RequestAnimationFrame loop for millisecond-precise audio tracking
  useEffect(() => {
    if (!show || parsedLyrics.type !== "synced") return;

    let animationFrameId: number;

    const updateProgress = () => {
      const audio = audioRef.current;
      if (audio) {
        setPreciseProgress(audio.currentTime);
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

    // Compensate for reading/vocal latency by leading by 450ms
    const LYRIC_OFFSET = 0.45;
    const adjustedProgress = preciseProgress + LYRIC_OFFSET;

    let activeIdx = -1;
    for (let i = 0; i < parsedLyrics.lines.length; i++) {
      const line = parsedLyrics.lines[i];
      const nextLine = parsedLyrics.lines[i + 1];

      if (adjustedProgress >= line.time) {
        const lineGap = nextLine ? nextLine.time - line.time : 8.0;
        const wordCount = line.text.split(/\s+/).filter(Boolean).length;
        const estimatedDuration = Math.max(wordCount * 0.45 + 1.2, 3.2);
        const activeDuration = Math.min(lineGap, estimatedDuration);

        if (adjustedProgress < line.time + activeDuration) {
          activeIdx = i;
        } else {
          activeIdx = -1;
        }
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

  const LYRIC_OFFSET = 0.45;
  const adjustedProgress = preciseProgress + LYRIC_OFFSET;

  return (
    <div className="fixed inset-0 z-40 bg-[#07080a]/85 backdrop-blur-3xl flex flex-col animate-fade-in pb-28">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-6 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-4">
          <img
            src={currentTrack.thumbnail}
            alt={currentTrack.title}
            className="w-12 h-12 rounded-xl object-cover border border-white/10 shadow-lg"
          />
          <div>
            <h2 className="text-base font-bold text-white leading-tight truncate max-w-md">
              {currentTrack.title}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 truncate max-w-md">
              {currentTrack.uploaderName}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2.5 rounded-full bg-white/5 border border-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Lyrics Content */}
      <div className="flex-1 overflow-y-auto px-6 py-20 flex flex-col items-center justify-start min-h-0 scrollbar-thin select-text scroll-py-40">
        {lyricsLoading ? (
          <div className="my-auto flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
            <p className="text-sm text-slate-500 font-medium animate-pulse">
              Fetching lyrics...
            </p>
          </div>
        ) : lyrics ? (
          parsedLyrics.type === "synced" ? (
            <div className="max-w-7xl w-full flex flex-col gap-8 py-24 px-4 select-text">
              {parsedLyrics.lines.map((line, idx) => {
                const isActive = idx === activeLyricIndex;
                if (isActive) {
                  if (line.words) {
                    // 1. Fluid Syllable Water-Flow Highlighting (eLRC)
                    return (
                      <p
                        key={idx}
                        id={`lyric-line-${idx}`}
                        className="text-center text-3xl sm:text-4xl lg:text-5xl font-black scale-[1.02] transition-all duration-300 origin-center flex flex-wrap justify-center gap-x-2 gap-y-1 drop-shadow-[0_0_18px_rgba(255,255,255,0.4)]"
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
                                background: `linear-gradient(to right, #ffffff ${fillPercent}%, rgba(255,255,255,0.3) ${fillPercent}%)`,
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
                    // 2. Fluid Word Water-Flow Highlighting Fallback (LRC)
                    const words = line.text.split(/\s+/);
                    const nextLine = parsedLyrics.lines[idx + 1];
                    const lineDuration = Math.max((nextLine?.time ?? (audioRef.current?.duration || line.time + 5)) - line.time, 0.5);
                    const wordDuration = lineDuration / Math.max(words.length, 1);

                    return (
                      <p
                        key={idx}
                        id={`lyric-line-${idx}`}
                        className="text-center text-3xl sm:text-4xl lg:text-5xl font-black scale-[1.02] transition-all duration-300 origin-center flex flex-wrap justify-center gap-x-2 gap-y-1 drop-shadow-[0_0_18px_rgba(255,255,255,0.4)]"
                      >
                        {words.map((word, wIdx) => {
                          const wordStartTime = line.time + wIdx * wordDuration;
                          const wordProgress = Math.max(0, Math.min(1, (adjustedProgress - wordStartTime) / wordDuration));
                          const fillPercent = wordProgress * 100;

                          return (
                            <span
                              key={wIdx}
                              style={{
                                background: `linear-gradient(to right, #ffffff ${fillPercent}%, rgba(255,255,255,0.3) ${fillPercent}%)`,
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
                      className="text-center text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-500 opacity-25 hover:opacity-50 transition-all duration-300 origin-center leading-normal"
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
    </div>
  );
};
