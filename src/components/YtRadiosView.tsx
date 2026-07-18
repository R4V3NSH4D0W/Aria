import React, { useState } from "react";
import { Radio, Play, Trash2, PlusCircle, Edit2 } from "lucide-react";
import { SavedRadio } from "../types";

interface YtRadiosViewProps {
  savedRadios: SavedRadio[];
  onSelectRadio: (radioId: string, videoId?: string) => void;
  onDeleteRadio: (radioId: string, e: React.MouseEvent) => void;
  onRenameRadio: (radioId: string, newTitle: string) => void;
}

function parseYoutubeUrl(url: string): { videoId?: string; playlistId?: string } | null {
  try {
    const cleanUrl = url.trim();
    if (!cleanUrl.includes("youtube.com") && !cleanUrl.includes("youtu.be")) {
      return null;
    }

    let videoId: string | undefined;
    let playlistId: string | undefined;

    if (cleanUrl.includes("youtube.com")) {
      const urlObj = new URL(cleanUrl);
      videoId = urlObj.searchParams.get("v") || undefined;
      playlistId = urlObj.searchParams.get("list") || undefined;
    } else if (cleanUrl.includes("youtu.be")) {
      const urlObj = new URL(cleanUrl);
      const pathParts = urlObj.pathname.split("/").filter(Boolean);
      if (pathParts.length > 0) {
        videoId = pathParts[0];
      }
      playlistId = urlObj.searchParams.get("list") || undefined;
    }

    if (videoId || playlistId) {
      return { videoId, playlistId };
    }
  } catch (err) {
    console.error("Failed to parse YouTube URL:", err);
  }
  return null;
}

export const YtRadiosView: React.FC<YtRadiosViewProps> = ({
  savedRadios,
  onSelectRadio,
  onDeleteRadio,
  onRenameRadio,
}) => {
  const [urlInput, setUrlInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [editingRadioId, setEditingRadioId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState("");

  const handleAddRadio = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = urlInput.trim();
    if (!cleanUrl) return;

    const parsed = parseYoutubeUrl(cleanUrl);
    if (parsed) {
      setErrorMsg("");
      setUrlInput("");
      if (parsed.playlistId) {
        onSelectRadio(parsed.playlistId, parsed.videoId);
      } else if (parsed.videoId) {
        onSelectRadio(`RD${parsed.videoId}`, parsed.videoId);
      }
    } else {
      setErrorMsg("Invalid YouTube link. Please paste a valid track or mix URL.");
    }
  };

  const handleSaveRename = (radioId: string) => {
    if (renameText.trim()) {
      onRenameRadio(radioId, renameText.trim());
    }
    setEditingRadioId(null);
  };

  return (
    <div className="flex-1 p-6 lg:p-8 pb-36 lg:pb-36 overflow-y-auto">
      {/* Header & Link Input */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 pb-6 border-b border-white/5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">
            YouTube Radios
          </h1>
          <p className="text-sm text-slate-400">
            Paste a track or mix link to load dynamic, infinite queues.
          </p>
        </div>

        <form onSubmit={handleAddRadio} className="w-full md:max-w-md flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Paste YouTube Music URL..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.05] focus:bg-white/[0.07] border border-white/10 focus:border-white/20 text-slate-200 text-sm focus:outline-none transition-all duration-300 placeholder:text-slate-500"
            />
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 hover:border-white/20 font-semibold text-sm transition-all duration-300 cursor-pointer flex items-center gap-2 shrink-0"
            >
              <PlusCircle className="w-4 h-4 text-slate-400" />
              <span>Load</span>
            </button>
          </div>
          {errorMsg && (
            <p className="text-xs text-red-400 font-medium px-1 animate-pulse">
              {errorMsg}
            </p>
          )}
        </form>
      </div>

      {savedRadios.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white/[0.02] border border-white/5 rounded-2xl p-8 text-center">
          <Radio className="w-12 h-12 text-violet-400/40 mb-4 animate-pulse" />
          <h3 className="text-lg font-semibold text-slate-200 mb-1">No saved radios</h3>
          <p className="text-sm text-slate-400 max-w-sm">
            Paste a YouTube video link or mix link in the input box above to load and automatically save your radio mix.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
          {savedRadios.map((radio) => (
            <div
              key={radio.id}
              onClick={() => onSelectRadio(radio.id, radio.videoId)}
              className="group relative transition-all duration-300 cursor-pointer hover:-translate-y-0.5"
            >
              {/* Thumbnail Container */}
              <div className="relative aspect-square w-full rounded-xl overflow-hidden mb-4 bg-slate-900 shadow-inner">
                {radio.thumbnails && radio.thumbnails.length >= 4 ? (
                  <div className="w-full h-full grid grid-cols-2 grid-rows-2 transition-transform duration-500 group-hover:scale-105">
                    {radio.thumbnails.map((imgUrl, i) => (
                      <img
                        key={i}
                        src={imgUrl}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ))}
                  </div>
                ) : radio.thumbnail ? (
                  <img
                    src={radio.thumbnail}
                    alt={radio.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-violet-950/20">
                    <Radio className="w-10 h-10 text-violet-400/50" />
                  </div>
                )}
                
                {/* Play Hover Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                    <Play className="w-5 h-5 fill-white translate-x-0.5" />
                  </div>
                </div>

                {/* Actions Overlay (Upper Right) */}
                <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingRadioId(radio.id);
                      setRenameText(radio.title);
                    }}
                    className="p-2 rounded-lg bg-black/60 hover:bg-violet-600/80 text-slate-300 hover:text-white border border-white/5 transition-all duration-300"
                    title="Rename Radio"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => onDeleteRadio(radio.id, e)}
                    className="p-2 rounded-lg bg-black/60 hover:bg-red-500/80 text-slate-300 hover:text-white border border-white/5 transition-all duration-300"
                    title="Remove Radio"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Title & Tracks count */}
              <div className="min-h-[38px] flex flex-col justify-start">
                {editingRadioId === radio.id ? (
                  <input
                    type="text"
                    value={renameText}
                    onChange={(e) => setRenameText(e.target.value)}
                    onBlur={() => handleSaveRename(radio.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveRename(radio.id);
                      if (e.key === "Escape") setEditingRadioId(null);
                    }}
                    autoFocus
                    onClick={(e) => e.stopPropagation()} // Prevent card navigation click
                    className="w-full px-2 py-1 text-xs rounded bg-white/10 border border-white/20 text-white font-semibold focus:outline-none focus:border-violet-500"
                  />
                ) : (
                  <h3 className="font-bold text-sm text-slate-100 truncate group-hover:text-white mb-1">
                    {radio.title}
                  </h3>
                )}
                <p className="text-xs text-slate-400 truncate">
                  YouTube Music Radio
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
