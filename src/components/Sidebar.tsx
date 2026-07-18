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
  CloudLightning,
} from "lucide-react";
import { Playlist } from "../types";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  playlists: Playlist[];
  deletePlaylist: (id: string, e: React.MouseEvent) => void;
  setShowCreatePlaylistModal: (show: boolean) => void;
  hasPlayer?: boolean;
  isOpen?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  playlists,
  deletePlaylist,
  setShowCreatePlaylistModal,
  hasPlayer = false,
  isOpen = true,
}) => {
  const hasYtCookie = !!localStorage.getItem("aria_yt_cookie");

  return (
    <aside className={`${isOpen ? "w-64" : "w-16"} bg-[#0e1015] border-r border-white/5 flex flex-col shrink-0 shadow-2xl overflow-hidden transition-all duration-300`}>
      {/* ── Top: Logo + Nav (fixed height, never scrolls) ── */}
      <div className={`p-3 ${isOpen ? "lg:p-6" : "lg:p-3"} flex flex-col gap-5 shrink-0`}>
        {/* Logo */}
        <div className={`flex items-center ${isOpen ? "justify-start gap-2.5" : "justify-center"}`}>
          <Disc className="size-8 text-white shrink-0" />
          {isOpen && (
            <div>
              <span className="font-bold text-lg tracking-wide text-white">Aria</span>
              <p className="text-[9px] text-slate-500 font-semibold tracking-wider uppercase">Music Player</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-1">
          <button
            onClick={() => setActiveTab("home")}
            className={`flex items-center gap-3 ${isOpen ? "justify-start px-4" : "justify-center px-0"} py-2.5 rounded-xl transition-all duration-200 font-semibold text-sm border cursor-pointer ${
              activeTab === "home"
                ? "bg-white/5 text-white border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                : "bg-transparent text-slate-400 border-transparent hover:text-slate-200 hover:bg-white/5"
            }`}
            title={!isOpen ? "Home" : undefined}
          >
            <Home className="w-4 h-4 text-emerald-400 shrink-0" />
            {isOpen && <span>Home</span>}
          </button>

          <button
            onClick={() => setActiveTab("search")}
            className={`flex items-center gap-3 ${isOpen ? "justify-start px-4" : "justify-center px-0"} py-2.5 rounded-xl transition-all duration-200 font-semibold text-sm border cursor-pointer ${
              activeTab === "search"
                ? "bg-white/5 text-white border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                : "bg-transparent text-slate-400 border-transparent hover:text-slate-200 hover:bg-white/5"
            }`}
            title={!isOpen ? "Search" : undefined}
          >
            <Search className="w-4 h-4 text-indigo-300 shrink-0" />
            {isOpen && <span>Search</span>}
          </button>

          <button
            onClick={() => setActiveTab("favorites")}
            className={`flex items-center gap-3 ${isOpen ? "justify-start px-4" : "justify-center px-0"} py-2.5 rounded-xl transition-all duration-200 font-semibold text-sm border cursor-pointer ${
              activeTab === "favorites"
                ? "bg-white/5 text-white border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                : "bg-transparent text-slate-400 border-transparent hover:text-slate-200 hover:bg-white/5"
            }`}
            title={!isOpen ? "Favorites" : undefined}
          >
            <Heart className="w-4 h-4 text-pink-300 fill-pink-300/15 shrink-0" />
            {isOpen && <span>Favorites</span>}
          </button>

          <button
            onClick={() => setActiveTab("recently-played")}
            className={`flex items-center gap-3 ${isOpen ? "justify-start px-4" : "justify-center px-0"} py-2.5 rounded-xl transition-all duration-200 font-semibold text-sm border cursor-pointer ${
              activeTab === "recently-played"
                ? "bg-white/5 text-white border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                : "bg-transparent text-slate-400 border-transparent hover:text-slate-200 hover:bg-white/5"
            }`}
            title={!isOpen ? "Recently Played" : undefined}
          >
            <History className="w-4 h-4 text-sky-300 shrink-0" />
            {isOpen && <span>Recently Played</span>}
          </button>

          {hasYtCookie && (
            <button
              onClick={() => setActiveTab("yt-playlists")}
              className={`flex items-center gap-3 ${isOpen ? "justify-start px-4" : "justify-center px-0"} py-2.5 rounded-xl transition-all duration-200 font-semibold text-sm border cursor-pointer ${
                activeTab === "yt-playlists" || activeTab.startsWith("yt:")
                  ? "bg-white/5 text-white border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                  : "bg-transparent text-slate-400 border-transparent hover:text-slate-200 hover:bg-white/5"
              }`}
              title={!isOpen ? "YouTube Playlists" : undefined}
            >
              <CloudLightning className="w-4 h-4 text-violet-400 shrink-0" />
              {isOpen && <span>YouTube Playlists</span>}
            </button>
          )}
        </nav>
      </div>

      <div className="h-px bg-white/5 shrink-0 mx-3 lg:mx-6" />

      {/* ── Scrollable playlists area ── */}
      <div className={`flex-1 overflow-y-auto ${isOpen ? "px-3 lg:px-6" : "px-2"} py-4 flex flex-col gap-5 min-h-0 ${hasPlayer ? "pb-36" : "pb-4"}`}>

        {/* Local Playlists */}
        <div className="flex flex-col gap-1">
          <div className={`flex items-center ${isOpen ? "justify-between px-1" : "justify-center"} mb-1`}>
            {isOpen && (
              <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase">
                Playlists
              </span>
            )}
            <button
              onClick={() => setShowCreatePlaylistModal(true)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/5 border border-transparent transition-all cursor-pointer"
              title="Create Playlist"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {playlists.length === 0 ? (
            isOpen && (
              <p className="text-xs text-slate-600 italic px-2 py-1">
                No playlists yet.
              </p>
            )
          ) : (
            playlists.map((pl) => (
              <button
                key={pl.id}
                onClick={() => setActiveTab(pl.id)}
                className={`group flex items-center ${isOpen ? "justify-between px-3" : "justify-center px-0"} py-2 rounded-xl text-left transition-all duration-200 text-sm cursor-pointer ${
                  activeTab === pl.id
                    ? "bg-white/10 text-white font-medium border border-white/5"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                }`}
                title={!isOpen ? pl.name : undefined}
              >
                <div className="flex items-center gap-3 overflow-hidden min-w-0">
                  <ListMusic className="w-4 h-4 text-emerald-400 shrink-0" />
                  {isOpen && <span className="truncate">{pl.name}</span>}
                </div>
                {isOpen && (
                  <button
                    onClick={(e) => deletePlaylist(pl.id, e)}
                    className="opacity-0 group-hover:opacity-100 hover:text-red-300 p-1 rounded-md hover:bg-white/5 transition-all cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </button>
            ))
          )}
        </div>

        {/* Bottom padding so last item isn't flush against edge */}
        <div className="h-4 shrink-0" />
      </div>
    </aside>
  );
};
