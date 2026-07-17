import React from "react";
import { Search, Heart, ListMusic } from "lucide-react";
import { Playlist } from "../types";

interface HeaderProps {
  activeTab: string;
  playlists: Playlist[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  handleSearch: (e?: React.FormEvent) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  playlists,
  searchQuery,
  setSearchQuery,
  handleSearch,
}) => {
  return (
    <header className="p-6 sticky top-0 bg-[#08090a] border-b border-white/5 flex items-center justify-between z-10">
      {activeTab === "search" ? (
        <form onSubmit={handleSearch} className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search music, artists, albums..."
              className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-[#12151b] border border-white/5 text-white text-sm placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-slate-700 focus:border-slate-700 transition-all"
            />
          </div>
        </form>
      ) : (
        <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
          {activeTab === "favorites" ? (
            <>
              <Heart className="w-7 h-7 text-pink-500 fill-pink-500/20" />
              <span>Favorite Songs</span>
            </>
          ) : (
            <>
              <ListMusic className="w-7 h-7 text-emerald-400" />
              <span>{playlists.find((p) => p.id === activeTab)?.name}</span>
            </>
          )}
        </h2>
      )}
    </header>
  );
};
