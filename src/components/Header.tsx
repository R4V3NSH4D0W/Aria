import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, Search, Heart, ListMusic, History, Menu, Disc, Settings, ArrowLeft } from "lucide-react";
import { Playlist } from "../types";

interface HeaderProps {
  activeTab: string;
  playlists: Playlist[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  handleSearch: (e?: React.FormEvent) => void;
  favoriteSort: "recent" | "oldest" | "title";
  setFavoriteSort: (value: "recent" | "oldest" | "title") => void;
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  onOpenSettings: () => void;
  ytPlaylists: { id: string; title: string }[];
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  playlists,
  searchQuery,
  setSearchQuery,
  handleSearch,
  favoriteSort,
  setFavoriteSort,
  isSidebarOpen,
  toggleSidebar,
  onOpenSettings,
  ytPlaylists,
}) => {
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement | null>(null);

  const sortLabels: Record<typeof favoriteSort, string> = {
    recent: "Recently added",
    oldest: "Oldest first",
    title: "Title A-Z",
  };

  const selectSort = (value: typeof favoriteSort) => {
    setFavoriteSort(value);
    setSortMenuOpen(false);
  };

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
        setSortMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  return (
    <header className="p-6 sticky top-0 bg-[#08090a] border-b border-white/5 flex items-center justify-between gap-4 z-10">
      <div className="flex items-center gap-4 flex-1">
        {/* Toggle Button */}
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title={isSidebarOpen ? "Hide Sidebar" : "Show Sidebar"}
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Disc Logo when Sidebar is Off */}
        {!isSidebarOpen && (
          <div className="flex items-center gap-2.5 mr-4 select-none">
            <Disc className="w-6 h-6 text-white animate-spin" style={{ animationDuration: "6s" }} />
          </div>
        )}

        {activeTab === "search" ? (
          <form onSubmit={handleSearch} className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search music, artists, albums..."
                className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-[#12151b] border border-white/5 text-slate-100 text-sm focus:outline-none focus:ring-1 focus:ring-slate-700 transition-all"
              />
            </div>
          </form>
        ) : (
          <div className="flex items-center justify-between gap-4 flex-1">
            <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
              {activeTab === "home" ? (
                <span>Home</span>
              ) : activeTab === "favorites" ? (
                <>
                  <Heart className="w-7 h-7 text-pink-500 fill-pink-500/20" />
                  <span>Favorite Songs</span>
                </>
              ) : activeTab === "recently-played" ? (
                <>
                  <History className="w-7 h-7 text-sky-400" />
                  <span>Recently Played</span>
                </>
              ) : activeTab.startsWith("yt:") ? (
                <>
                  <ListMusic className="w-7 h-7 text-violet-400" />
                  <span>{ytPlaylists.find((p) => p.id === activeTab.slice(3))?.title || "YouTube Playlist"}</span>
                </>
              ) : (
                <>
                  <ListMusic className="w-7 h-7 text-emerald-400" />
                  <span>{playlists.find((p) => p.id === activeTab)?.name || "Playlist"}</span>
                </>
              )}
            </h2>

            {activeTab === "favorites" && (
              <div ref={sortMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setSortMenuOpen((open) => !open)}
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#12151b] px-3 py-2 text-sm font-medium text-slate-200 shadow-sm cursor-pointer transition-all hover:bg-white/5 hover:border-white/15"
                >
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Sort
                  </span>
                  <span>{sortLabels[favoriteSort]}</span>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>

                {sortMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 overflow-hidden rounded-2xl border border-white/10 bg-[#12151b] shadow-2xl z-20">
                    {(
                      [
                        ["recent", "Recently added"],
                        ["oldest", "Oldest first"],
                        ["title", "Title A-Z"],
                      ] as const
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => selectSort(value)}
                        className={`w-full px-4 py-3 text-left text-sm cursor-pointer transition-all hover:bg-white/5 ${
                          favoriteSort === value
                            ? "bg-white/5 text-white"
                            : "text-slate-300"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Settings icon button — top right */}
      <button
        onClick={onOpenSettings}
        className="p-2 rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
        title="Settings"
      >
        <Settings className="w-5 h-5" />
      </button>
    </header>
  );
};
