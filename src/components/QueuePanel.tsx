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
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";

interface QueuePanelProps {
  queue: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  onPlayTrack: (track: Track) => void;
  onMoveTrack: (fromIndex: number, toIndex: number) => void;
  onRemoveTrack: (videoId: string) => void;
  onClearQueue: () => void;
}

interface SortableTrackItemProps {
  track: Track;
  stableId: string;
  current: boolean;
  isPlaying: boolean;
  onPlayTrack: (track: Track) => void;
  onRemoveTrack: (videoId: string) => void;
}

// WeakMap to cache stable IDs for Track object references.
// This survives reordering, preventing key changes and DOM recreation.
const trackIdMap = new WeakMap<object, string>();
let idCounter = 0;

function getStableTrackId(track: Track): string {
  let id = trackIdMap.get(track);
  if (!id) {
    id = `track-${track.videoId}-${idCounter++}`;
    trackIdMap.set(track, id);
  }
  return id;
}

const SortableTrackItem: React.FC<SortableTrackItemProps> = ({
  track,
  stableId,
  current,
  isPlaying,
  onPlayTrack,
  onRemoveTrack,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stableId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all duration-200 relative select-none ${
        isDragging
          ? "bg-indigo-500/10 border-indigo-500/30 opacity-30 shadow-lg"
          : current
          ? "bg-white/8 border-indigo-500/25 text-white"
          : "bg-[#12151b]/40 border-white/5 text-slate-300 hover:bg-white/5 hover:border-white/10 backdrop-blur-sm"
      }`}
    >
      <span
        {...attributes}
        {...listeners}
        className="text-slate-500 hover:text-slate-300 shrink-0 cursor-grab active:cursor-grabbing p-1 -m-1"
      >
        <GripVertical className="w-4 h-4" />
      </span>

      <img
        src={track.thumbnail}
        alt={track.title}
        draggable={false}
        className="w-10 h-10 rounded-lg object-cover shrink-0 border border-white/5 select-none"
      />

      <div className="min-w-0 flex-1 cursor-pointer" onClick={() => onPlayTrack(track)}>
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
          className="p-1.5 rounded-lg hover:bg-white/5 hover:text-red-300 transition-all relative z-10"
          title="Remove from queue"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export const QueuePanel: React.FC<QueuePanelProps> = ({
  queue,
  currentTrack,
  isPlaying,
  onPlayTrack,
  onMoveTrack,
  onRemoveTrack,
  onClearQueue,
}) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const isCurrent = (track: Track) => currentTrack?.videoId === track.videoId;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4, // 4px movement required to start dragging, preventing accidental clicks
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = queue.findIndex((track) => getStableTrackId(track) === active.id);
      const newIndex = queue.findIndex((track) => getStableTrackId(track) === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        onMoveTrack(oldIndex, newIndex);
      }
    }
    setActiveId(null);
  };

  const sortableItemsIds = queue.map((track) => getStableTrackId(track));
  const activeTrack = queue.find((track) => getStableTrackId(track) === activeId);

  return (
    <aside className="hidden lg:flex lg:flex-col gap-4 bg-[#0e1015]/40 backdrop-blur-sm border border-white/5 rounded-2xl p-4 shadow-[0_8px_32px_0_rgba(0,0,0,0.28)] sticky top-6 self-start max-h-[calc(100vh-11.5rem)] w-[320px] shrink-0">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Music className="w-4 h-4 text-indigo-300" />
            Queue
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Drag handle to reorder list.
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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToVerticalAxis]}
          >
            <SortableContext
              items={sortableItemsIds}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {queue.map((track) => {
                  const stableId = getStableTrackId(track);
                  return (
                    <SortableTrackItem
                      key={stableId}
                      stableId={stableId}
                      track={track}
                      current={isCurrent(track)}
                      isPlaying={isPlaying}
                      onPlayTrack={onPlayTrack}
                      onRemoveTrack={onRemoveTrack}
                    />
                  );
                })}
              </div>
            </SortableContext>

            {/* Custom Drag Overlay for absolute smooth, flicker-free rendering of the dragged card */}
            <DragOverlay adjustScale={false}>
              {activeTrack ? (
                <div className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-indigo-500 bg-[#12151b] text-white shadow-[0_0_20px_rgba(99,102,241,0.25)] scale-[1.03] opacity-95 select-none transition-transform duration-75">
                  <span className="text-slate-300 shrink-0 cursor-grabbing p-1 -m-1">
                    <GripVertical className="w-4 h-4" />
                  </span>

                  <img
                    src={activeTrack.thumbnail}
                    alt={activeTrack.title}
                    draggable={false}
                    className="w-10 h-10 rounded-lg object-cover shrink-0 border border-white/5 select-none"
                  />

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate text-white">
                      {activeTrack.title}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {activeTrack.uploaderName}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 text-slate-400 pr-2">
                    {activeTrack.duration > 0 && (
                      <span className="text-[11px] font-mono">
                        {Math.floor(activeTrack.duration / 60)}:{String(
                          Math.floor(activeTrack.duration % 60),
                        ).padStart(2, "0")}
                      </span>
                    )}
                  </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </aside>
  );
};
