import React from "react";
import {
  Disc,
  Search,
  Heart,
  Plus,
  ListMusic,
  Trash2,
  History,
  Home,
} from "lucide-react";
import { Playlist, YtPlaylist } from "../types";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  playlists: Playlist[];
  ytPlaylists: YtPlaylist[];
  deletePlaylist: (id: string, e: React.MouseEvent) => void;
  setShowCreatePlaylistModal: (show: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  playlists,
  ytPlaylists,
  deletePlaylist,
  setShowCreatePlaylistModal,
}) => {
  return (
    <aside className="w-64 bg-[#0e1015] border-r border-white/5 flex flex-col shrink-0 shadow-2xl overflow-y-auto">
      <div className="p-6 flex flex-col gap-6 flex-1">
        {/* Header / Logo */}
        <div className="flex items-center gap-2.5">
          <Disc className="size-8 text-white" />
          <div>
            <span className="font-bold text-lg tracking-wide text-white">
              Aria
            </span>
            <p className="text-[9px] text-slate-500 font-semibold tracking-wider uppercase">
              Music Player
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex flex-col gap-1.5">
          <button
            onClick={() => setActiveTab("home")}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 font-semibold text-sm border cursor-pointer ${
              activeTab === "home"
                ? "bg-white/5 text-white border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                : "bg-transparent text-slate-400 border-transparent hover:text-slate-200 hover:bg-white/5"
            }`}
          >
            <Home className="w-4 h-4 text-emerald-400" />
            <span>Home</span>
          </button>

          <button
            onClick={() => setActiveTab("search")}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 font-semibold text-sm border cursor-pointer ${
              activeTab === "search"
                ? "bg-white/5 text-white border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                : "bg-transparent text-slate-400 border-transparent hover:text-slate-200 hover:bg-white/5"
            }`}
          >
            <Search className="w-4 h-4 text-indigo-300" />
            <span>Search</span>
          </button>

          <button
            onClick={() => setActiveTab("favorites")}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 font-semibold text-sm border cursor-pointer ${
              activeTab === "favorites"
                ? "bg-white/5 text-white border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                : "bg-transparent text-slate-400 border-transparent hover:text-slate-200 hover:bg-white/5"
            }`}
          >
            <Heart className="w-4 h-4 text-pink-300 fill-pink-300/15" />
            <span>Favorites</span>
          </button>

          <button
            onClick={() => setActiveTab("recently-played")}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 font-semibold text-sm border cursor-pointer ${
              activeTab === "recently-played"
                ? "bg-white/5 text-white border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                : "bg-transparent text-slate-400 border-transparent hover:text-slate-200 hover:bg-white/5"
            }`}
          >
            <History className="w-4 h-4 text-sky-300" />
            <span>Recently Played</span>
          </button>
        </nav>

        <div className="h-px bg-white/5" />

        {/* Playlists Header */}
        <div className="flex items-center justify-between px-2">
          <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase">
            Playlists
          </span>
          <button
            onClick={() => setShowCreatePlaylistModal(true)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/5 border border-transparent transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Playlists List */}
        <div className="flex flex-col gap-1 max-h-60 overflow-y-auto pr-1">
          {playlists.map((pl) => (
            <button
              key={pl.id}
              onClick={() => setActiveTab(pl.id)}
              className={`group flex items-center justify-between px-4 py-2.5 rounded-xl text-left transition-all duration-200 text-sm cursor-pointer ${
                activeTab === pl.id
                  ? "bg-white/10 text-white font-medium border border-white/5"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }`}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <ListMusic className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="truncate">{pl.name}</span>
              </div>
              <button
                onClick={(e) => deletePlaylist(pl.id, e)}
                className="opacity-0 group-hover:opacity-100 hover:text-red-300 p-1 rounded-md hover:bg-white/5 transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </button>
          ))}
          {playlists.length === 0 && (
            <p className="text-xs text-slate-600 italic px-4 py-2">
              No playlists created.
            </p>
          )}
        </div>

        {/* YouTube Playlists */}
        {ytPlaylists.length > 0 && (
          <>
            <div className="h-px bg-white/5" />
            <div className="flex items-center gap-2 px-2">
              <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase">
                YouTube Playlists
              </span>
            </div>
            <div className="flex flex-col gap-1 max-h-60 overflow-y-auto pr-1">
              {ytPlaylists.map((pl) => (
                <button
                  key={pl.id}
                  onClick={() => setActiveTab(`yt:${pl.id}`)}
                  className={`group flex items-center gap-3 px-4 py-2.5 rounded-xl text-left transition-all duration-200 text-sm cursor-pointer ${
                    activeTab === `yt:${pl.id}`
                      ? "bg-white/10 text-white font-medium border border-white/5"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                  }`}
                >
                  {pl.thumbnail ? (
                    <img
                      src={pl.thumbnail}
                      alt=""
                      className="w-5 h-5 rounded object-cover shrink-0"
                    />
                  ) : (
                    <ListMusic className="w-4 h-4 text-violet-400 shrink-0" />
                  )}
                  <span className="truncate">{pl.title}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </aside>
  );
};
