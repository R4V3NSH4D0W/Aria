import React from "react";
import { Play, Shuffle } from "lucide-react";
import { Track } from "../../types";

interface QuickPicksProps {
  title: string;
  tracks: Track[];
  playSongs: (
    songs: Track[],
    shuffle: boolean,
    startFromTrackId?: string,
  ) => void;
  currentTrack: Track | null;
  isPlaying: boolean;
}

export const QuickPicks: React.FC<QuickPicksProps> = ({
  title,
  tracks,
  playSongs,
  currentTrack,
  isPlaying,
}) => {
  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          <p className="text-sm text-slate-400">
            Recommendations tailored to your taste.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => playSongs(tracks, false)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-white/5 border border-white/5 rounded-lg hover:bg-white/10 cursor-pointer transition-colors"
          >
            <Play className="w-3.5 h-3.5 fill-white text-white" />
            <span>Play All</span>
          </button>
          <button
            onClick={() => playSongs(tracks, true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-white/5 border border-white/5 rounded-lg hover:bg-white/10 cursor-pointer transition-colors"
          >
            <Shuffle className="w-3.5 h-3.5 text-white" />
            <span>Shuffle</span>
          </button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {tracks.map((track) => {
          const isCurrentTrack = currentTrack?.videoId === track.videoId;
          return (
            <div
              key={track.videoId}
              onClick={() => playSongs(tracks, false, track.videoId)}
              className="flex items-center gap-3 p-3 rounded-2xl border border-white/5 bg-[#0e1015]/40 hover:bg-[#12151c]/60 backdrop-blur-sm hover:border-white/10 cursor-pointer group transition-all"
            >
              <div className="w-12 h-12 rounded-lg overflow-hidden relative border border-white/5 bg-slate-800 shrink-0">
                <img
                  src={track.thumbnail}
                  alt=""
                  className="w-full h-full object-cover"
                />
                <div
                  className={`absolute inset-0 bg-black/45 flex items-center justify-center transition-opacity duration-200 ${isCurrentTrack ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                >
                  {isCurrentTrack && isPlaying ? (
                    <div className="flex gap-0.5 h-3 items-end">
                      <div className="w-0.75 bg-white h-full animate-bounce" />
                      <div
                        className="w-0.75 bg-white h-2/3 animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      />
                      <div
                        className="w-0.75 bg-white h-4/5 animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      />
                    </div>
                  ) : (
                    <Play className="w-4 h-4 fill-white text-white" />
                  )}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-semibold text-sm text-white truncate group-hover:text-indigo-400 transition-colors">
                  {track.title}
                </h4>
                <p className="text-xs text-slate-400 truncate mt-0.5">
                  {track.uploaderName}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
