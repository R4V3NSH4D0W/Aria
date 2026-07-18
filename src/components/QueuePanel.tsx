import {
  GripVertical,
  Loader2,
  Music,
  Pause,
  Play,
  Trash2,
  X,
} from "lucide-react";
import React, { useState } from "react";
import { Track } from "../types";

interface QueuePanelProps {
  queue: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  onPlayTrack: (track: Track) => void;
  onMoveTrack: (fromIndex: number, toIndex: number) => void;
  onRemoveTrack: (videoId: string) => void;
  onClearQueue: () => void;
}

export const QueuePanel: React.FC<QueuePanelProps> = ({
  queue,
  currentTrack,
  isPlaying,
  onPlayTrack,
  onMoveTrack,
  onRemoveTrack,
  onClearQueue,
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (
    e: React.DragEvent<HTMLDivElement>,
    index: number,
  ) => {
    e.preventDefault();
    setHoveredIndex(index);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null) {
      onMoveTrack(draggedIndex, index);
    }
    setDraggedIndex(null);
    setHoveredIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setHoveredIndex(null);
  };

  const isCurrent = (track: Track) => currentTrack?.videoId === track.videoId;

  return (
    <aside className="hidden lg:flex lg:flex-col gap-4 bg-[#0e1015]/40 backdrop-blur-sm border border-white/5 rounded-2xl p-4 shadow-[0_8px_32px_0_rgba(0,0,0,0.28)] sticky top-6 self-start max-h-[calc(100vh-11.5rem)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Music className="w-4 h-4 text-indigo-300" />
            Queue
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Drag tracks to reorder them.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold tracking-wider uppercase text-slate-500">
            {queue.length}
          </span>
          {queue.length > 0 && (
            <button
              onClick={onClearQueue}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/5 transition-all"
              title="Clear queue"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 space-y-2 min-h-0">
        {queue.length === 0 ? (
          <div className="h-full min-h-72 flex items-center justify-center text-center px-4">
            <div className="max-w-56">
              <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
                <Music className="w-7 h-7 text-indigo-400/40" />
              </div>
              <p className="text-sm text-slate-400 font-medium">
                Your queue is empty.
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Use the track menu to add songs here.
              </p>
            </div>
          </div>
        ) : (
          queue.map((track, index) => {
            const current = isCurrent(track);

            return (
              <div
                key={`${track.videoId}-${index}`}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                onClick={() => onPlayTrack(track)}
                className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                  current
                    ? "bg-white/8 border-indigo-500/25 text-white"
                    : "bg-[#12151b]/40 border-white/5 text-slate-300 hover:bg-white/5 hover:border-white/10 backdrop-blur-sm"
                } ${draggedIndex === index ? "opacity-40" : ""} ${hoveredIndex === index && draggedIndex !== null ? "ring-1 ring-indigo-400/40" : ""}`}
              >
                <span className="text-slate-500 hover:text-slate-300 shrink-0 cursor-grab">
                  <GripVertical className="w-4 h-4" />
                </span>

                <img
                  src={track.thumbnail}
                  alt={track.title}
                  className="w-10 h-10 rounded-lg object-cover shrink-0 border border-white/5"
                />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {track.title}
                    </p>
                    {current && (
                      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/20 shrink-0">
                        {isPlaying ? (
                          <span className="flex items-center gap-1">
                            <Pause className="w-2.5 h-2.5" /> Playing
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Play className="w-2.5 h-2.5" /> Current
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                    {track.uploaderName}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0 text-slate-500">
                  <span className="text-[11px] font-mono hidden xl:inline">
                    {track.isResolving ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                    ) : track.duration > 0 ? (
                      `${Math.floor(track.duration / 60)}:${String(
                        Math.floor(track.duration % 60),
                      ).padStart(2, "0")}`
                    ) : null}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveTrack(track.videoId);
                    }}
                    className="p-1.5 rounded-lg hover:bg-white/5 hover:text-red-300 transition-all"
                    title="Remove from queue"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
