import React from "react";
import { Play, Shuffle } from "lucide-react";
import { Track } from "../../types";

interface ShelfCarouselProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  iconBg: string;
  tracks: Track[];
  playSongs: (
    songs: Track[],
    shuffle: boolean,
    startFromTrackId?: string,
  ) => void;
  currentTrack: Track | null;
  isPlaying: boolean;
  scrollbarHide?: boolean;
  maxVisible?: number;
}

export const ShelfCarousel: React.FC<ShelfCarouselProps> = ({
  title,
  subtitle,
  icon,
  iconBg,
  tracks,
  playSongs,
  currentTrack,
  isPlaying,
  scrollbarHide = false,
  maxVisible,
}) => {
  const visibleTracks = maxVisible ? tracks.slice(0, maxVisible) : tracks;
  const remaining = maxVisible ? Math.max(0, tracks.length - maxVisible) : 0;
  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`rounded-2xl p-2.5 ${iconBg}`}>
            {icon}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">{title}</h2>
            <p className="text-sm text-slate-400">{subtitle}</p>
          </div>
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

      <div className={`flex gap-6 overflow-x-auto pb-6 ${scrollbarHide ? "scrollbar-hide" : "scrollbar-none"}`}>
        {visibleTracks.map((track, trackIdx) => {
          const isCurrentTrack = currentTrack?.videoId === track.videoId;

          return (
            <div
              key={`${track.videoId}-${trackIdx}`}
              className="flex-none w-48 group cursor-pointer"
              onClick={() => playSongs(tracks, false, track.videoId)}
            >
              <div className="relative w-48 h-48 rounded-2xl overflow-hidden mb-4 shadow-lg border border-white/5 transition-all group-hover:shadow-2xl group-hover:border-white/10">
                <img
                  src={track.thumbnail}
                  alt={track.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />

                {/* Play overlay */}
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

              <h3 className="font-semibold text-sm text-white truncate group-hover:text-indigo-400 transition-colors">
                {track.title}
              </h3>
              <p className="text-xs text-slate-400 truncate mt-1">
                {track.uploaderName}
              </p>
            </div>
          );
        })}
        {remaining > 0 && (
          <div className="flex-none w-48">
            <div className="w-48 h-48 rounded-2xl mb-4 shadow-lg border border-dashed border-white/10 bg-white/5 flex flex-col items-center justify-center gap-2">
              <span className="text-3xl font-bold text-indigo-400">
                +{remaining}
              </span>
              <span className="text-sm text-slate-400">
                more
              </span>
            </div>
            <h3 className="font-semibold text-sm text-slate-400/60 truncate text-center">
              {tracks.length} total tracks
            </h3>
          </div>
        )}
      </div>
    </section>
  );
};
