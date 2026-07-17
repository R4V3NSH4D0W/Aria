import React from "react";
import { Track } from "../types";

interface KeepListeningSectionProps {
  track: Track | null;
  playTrack: (track: Track) => void;
  onOpenTab: (tab: string) => void;
}

export const KeepListeningSection: React.FC<KeepListeningSectionProps> = ({
  track,
  playTrack,
  onOpenTab,
}) => {
  if (!track) return null;

  return (
    <section className="rounded-2xl border border-white/10 bg-[#10141b] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-indigo-300">
            Keep Listening
          </p>
          <h2 className="mt-1 text-xl font-semibold text-white">
            Pick up where you left off
          </h2>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="flex-none overflow-hidden rounded-lg border border-white/10 bg-[#161a22]">
          <img
            src={track.thumbnail}
            alt={track.title}
            className="h-28 w-28 object-cover"
          />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-semibold text-white">{track.title}</h3>
          <p className="mt-1 text-sm text-slate-400">{track.uploaderName}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => playTrack(track)}
              className="rounded-full bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-indigo-400"
            >
              Play now
            </button>
            <button
              onClick={() => onOpenTab("favorites")}
              className="rounded-full border border-white/10 px-3 py-1.5 text-sm font-medium text-slate-200 transition hover:border-indigo-400/40 hover:text-indigo-300"
            >
              Open favorites
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
