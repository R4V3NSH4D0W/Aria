import React from "react";
import { Play } from "lucide-react";
import { Track } from "../types";

interface SpeedDialSectionProps {
  tracks: Track[];
  playTrack: (track: Track) => void;
  openBrowseTarget?: (track: Track) => void;
  title: string;
}

export const SpeedDialSection: React.FC<SpeedDialSectionProps> = ({
  tracks,
  playTrack,
  openBrowseTarget,
  title,
}) => {
  if (tracks.length === 0) return null;

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <h2 className="text-[13px] font-medium uppercase tracking-[0.24em] text-slate-400">
          {title}
        </h2>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {tracks.map((track) => (
          <button
            key={track.videoId}
            onClick={() => {
              if (track.browseId && openBrowseTarget) {
                openBrowseTarget(track);
                return;
              }
              playTrack(track);
            }}
            className="group flex-none w-36 text-left"
          >
            <div className="relative mb-2 h-36 w-36 overflow-hidden rounded-md bg-[#161a22]">
              <img
                src={track.thumbnail}
                alt={track.title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-900">
                  <Play className="ml-0.5 h-4 w-4 fill-current" />
                </div>
              </div>
            </div>
            <h3 className="truncate text-sm font-medium text-white">
              {track.title}
            </h3>
            <p className="mt-1 truncate text-xs text-slate-500">
              {track.uploaderName}
            </p>
          </button>
        ))}
      </div>
    </section>
  );
};
