import React from "react";
import { Maximize2, SkipBack, Play, Pause, SkipForward } from "lucide-react";
import { Track } from "../types";

interface MiniPlayerProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  togglePlay: () => void;
  handlePrev: () => void;
  handleNext: () => void;
  toggleMiniMode: () => void;
  startWindowDrag: (e: React.MouseEvent) => void;
}

export const MiniPlayer: React.FC<MiniPlayerProps> = ({
  currentTrack,
  isPlaying,
  togglePlay,
  handlePrev,
  handleNext,
  toggleMiniMode,
  startWindowDrag,
}) => {
  return (
    <>
      {/* Title bar / custom drag region */}
      <div
        data-tauri-drag-region
        onMouseDown={startWindowDrag}
        className="h-10 w-full flex items-center justify-between px-3 shrink-0 z-20 cursor-default"
      >
        <span className="text-[9px] uppercase tracking-widest text-slate-500 font-bold font-mono">
          Aria Mini
        </span>
        <button
          onClick={toggleMiniMode}
          className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
          title="Exit Mini Mode"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Mini Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-4 z-10 min-h-0 text-center gap-3">
        {currentTrack ? (
          <>
            {/* Gramophone Player Style Container */}
            <div className="relative w-40 h-40 flex items-center justify-center shrink-0 select-none">
              
              {/* Vinyl Disk (concentric rings + spin animation) */}
              <div
                className={`w-32 h-32 rounded-full bg-[#0c0d11] shadow-[0_10px_25px_rgba(0,0,0,0.8)] border border-white/5 relative flex items-center justify-center transition-all duration-300 z-10 overflow-hidden ${
                  isPlaying ? "animate-vinyl-spin" : "animate-vinyl-spin animate-vinyl-paused"
                }`}
              >
                {/* Vinyl Grooves concentric overlays */}
                <div className="absolute inset-0 rounded-full border border-black/80 z-[2]" />
                <div className="absolute inset-1 rounded-full border border-white/[0.03] z-[2]" />
                <div className="absolute inset-3 rounded-full border border-white/[0.03] z-[2]" />
                <div className="absolute inset-5 rounded-full border border-white/[0.03] z-[2]" />
                <div className="absolute inset-7 rounded-full border border-white/[0.03] z-[2]" />
                <div className="absolute inset-9 rounded-full border border-white/[0.03] z-[2]" />
                
                {/* Center Artwork Label */}
                <div className="w-14 h-14 rounded-full overflow-hidden relative border border-slate-800/80 shadow-md z-[3]">
                  <img
                    src={currentTrack.thumbnail}
                    alt={currentTrack.title}
                    className="w-full h-full object-cover"
                  />
                  {currentTrack.isResolving && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-[1px]">
                      <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    </div>
                  )}
                </div>

                {/* Center spindle hole */}
                <div className="absolute w-2 h-2 bg-slate-950 rounded-full border border-slate-800 shadow-inner z-[4]" />
              </div>

              {/* Pivoting Tonearm Needle */}
              <div
                className="absolute top-1.5 right-2.5 w-18 h-22 pointer-events-none z-20 origin-top-right transition-transform duration-700 ease-in-out"
                style={{
                  transform: isPlaying ? "rotate(24deg)" : "rotate(0deg)"
                }}
              >
                <svg className="w-full h-full drop-shadow-[0_4px_6px_rgba(0,0,0,0.5)]" viewBox="0 0 60 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Pivot Base */}
                  <circle cx="50" cy="10" r="7" fill="#334155" />
                  <circle cx="50" cy="10" r="3.5" fill="#64748b" />
                  
                  {/* Metallic Arm Rod */}
                  <path d="M50 10 L26 53 L22 62" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
                  <path d="M50 10 L26 53 L22 62" stroke="#94a3b8" strokeWidth="1" strokeLinecap="round" />
                  
                  {/* Counterweight */}
                  <rect x="44" y="2" width="12" height="6" rx="1.5" fill="#1e293b" />
                  
                  {/* Cartridge/Headshell */}
                  <rect x="17" y="59" width="7" height="10" rx="1" transform="rotate(-15 20 64)" fill="#0f172a" stroke="#475569" strokeWidth="1" />
                  
                  {/* Stylus Needle tip */}
                  <circle cx="18" cy="68" r="0.75" fill="#ef4444" />
                </svg>
              </div>
            </div>

            {/* Title & Artist */}
            <div className="w-full overflow-hidden px-2">
              <h3 className="font-semibold text-xs text-slate-200 truncate select-text">
                {currentTrack.title}
              </h3>
              <p className="text-[10px] text-slate-500 truncate mt-0.5 select-text">
                {currentTrack.uploaderName}
              </p>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4 mt-0.5">
              <button
                onClick={handlePrev}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
                title="Previous"
              >
                <SkipBack className="w-4 h-4 fill-slate-400 hover:fill-white" />
              </button>

              <button
                onClick={togglePlay}
                className="w-9 h-9 rounded-full bg-white hover:bg-slate-200 text-slate-900 flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-95 shrink-0"
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <Pause className="w-3.5 h-3.5 fill-slate-900" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-slate-900 translate-x-0.5" />
                )}
              </button>

              <button
                onClick={handleNext}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
                title="Next"
              >
                <SkipForward className="w-4 h-4 fill-slate-400 hover:fill-white" />
              </button>
            </div>
          </>
        ) : (
          <div className="text-slate-500 text-xs py-8">No track playing</div>
        )}
      </div>
    </>
  );
};
