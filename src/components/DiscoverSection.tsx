import React from "react";
import { Play } from "lucide-react";
import { Track } from "../types";

interface DiscoverSectionProps {
  tracks: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  playTrack: (track: Track) => void;
  openBrowseTarget?: (track: Track) => void;
}

export const DiscoverSection: React.FC<DiscoverSectionProps> = ({
  tracks,
  currentTrack,
  isPlaying,
  playTrack,
  openBrowseTarget,
}) => {
  if (tracks.length === 0) return null;

  return (
    <section>
      <h2 className="mb-3 text-base font-semibold tracking-tight text-white">
        Your Daily Discover
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {tracks.map((track, trackIdx) => {
          const isCurrentTrack = currentTrack?.videoId === track.videoId;

          return (
            <div
              key={`${track.videoId}-${trackIdx}`}
              className="flex-none w-40 cursor-pointer group"
              onClick={() => {
                if (track.browseId && openBrowseTarget) {
                  openBrowseTarget(track);
                  return;
                }
                playTrack(track);
              }}
            >
              <div className="relative mb-2 h-40 w-40 overflow-hidden rounded-lg border border-white/10 bg-[#161a22] transition-all group-hover:border-indigo-400/40">
                <img
                  src={track.thumbnail}
                  alt={track.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div
                  className={`absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity duration-300 ${isCurrentTrack ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                >
                  <button className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500 text-white shadow-lg transition-transform group-hover:scale-110">
                    {isCurrentTrack && isPlaying ? (
                      <div className="flex h-4 items-end gap-1">
                        <div className="h-full w-1 animate-bounce bg-white" />
                        <div
                          className="h-2/3 w-1 animate-bounce bg-white"
                          style={{ animationDelay: "0.1s" }}
                        />
                        <div
                          className="h-4/5 w-1 animate-bounce bg-white"
                          style={{ animationDelay: "0.2s" }}
                        />
                      </div>
                    ) : (
                      <Play className="ml-1 h-5 w-5 fill-white" />
                    )}
                  </button>
                </div>
              </div>

              <h3 className="truncate text-sm font-medium text-white transition-colors group-hover:text-indigo-400">
                {track.title}
              </h3>
              <p className="mt-1 truncate text-xs text-slate-400">
                {track.uploaderName}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
};
