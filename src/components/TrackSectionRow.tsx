import React from "react";
import { Play } from "lucide-react";
import { Track } from "../types";

interface TrackSectionRowProps {
  title: string;
  tracks: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  playTrack: (track: Track) => void;
  openBrowseTarget?: (track: Track) => void;
}

export const TrackSectionRow: React.FC<TrackSectionRowProps> = ({
  title,
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
        {title}
      </h2>
      <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {tracks.map((track, trackIdx) => {
          const isCurrentTrack = currentTrack?.videoId === track.videoId;

          return (
            <div
              key={`${track.videoId}-${trackIdx}`}
              className="flex-none w-40 group cursor-pointer"
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
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />

                <div
                  className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-300 ${isCurrentTrack ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                >
                  <button className="w-12 h-12 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow-lg transform transition-transform group-hover:scale-110">
                    {isCurrentTrack && isPlaying ? (
                      <div className="flex gap-1 h-4 items-end">
                        <div className="w-1 bg-white h-full animate-bounce"></div>
                        <div
                          className="w-1 bg-white h-2/3 animate-bounce"
                          style={{ animationDelay: "0.1s" }}
                        ></div>
                        <div
                          className="w-1 bg-white h-4/5 animate-bounce"
                          style={{ animationDelay: "0.2s" }}
                        ></div>
                      </div>
                    ) : (
                      <Play className="w-5 h-5 ml-1 fill-white" />
                    )}
                  </button>
                </div>
              </div>

              <h3 className="truncate text-sm font-medium text-white transition-colors group-hover:text-indigo-400">
                {track.title}
              </h3>
              <p className="text-xs text-slate-400 truncate mt-1">
                {track.uploaderName}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
};
