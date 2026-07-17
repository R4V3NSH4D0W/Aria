import React, { useMemo, useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Play, Search, Heart, ListMusic, Sparkles } from "lucide-react";
import { Track, HomeSection, Playlist } from "../types";

interface HomeProps {
  playTrack: (track: Track) => void;
  currentTrack: Track | null;
  isPlaying: boolean;
  favorites: Track[];
  playlists: Playlist[];
  onOpenTab: (tab: string) => void;
}

export const Home: React.FC<HomeProps> = ({ playTrack, currentTrack, isPlaying, favorites, playlists, onOpenTab }) => {
  const [sections, setSections] = useState<HomeSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHome() {
      try {
        const results = await invoke<HomeSection[]>("get_yt_home");
        setSections(results);
      } catch (err) {
        console.error("Failed to load home:", err);
        setError(String(err));
      } finally {
        setLoading(false);
      }
    }
    fetchHome();
  }, []);

  const discoverTracks = useMemo(() => {
    const allTracks = sections.flatMap((section) => section.items);
    const uniqueTracks = allTracks.filter((track, index, self) => 
      self.findIndex((candidate) => candidate.videoId === track.videoId) === index
    );
    return uniqueTracks.slice(0, 8);
  }, [sections]);

  const keepListeningTrack = currentTrack ?? favorites[0] ?? discoverTracks[0] ?? null;

  const quickActions = [
    {
      label: "Search",
      description: "Find your next favorite track",
      icon: Search,
      tab: "search"
    },
    {
      label: "Favorites",
      description: "Jump back into your saved songs",
      icon: Heart,
      tab: "favorites"
    },
    {
      label: "Playlists",
      description: playlists.length > 0 ? playlists[0].name : "Create a listening queue",
      icon: ListMusic,
      tab: playlists.length > 0 ? playlists[0].id : "search"
    }
  ];

  if (loading) {
    return (
      <div className="flex-1 p-8 space-y-12 overflow-y-auto">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-4">
            <div className="h-8 w-48 bg-white/5 rounded-lg animate-pulse"></div>
            <div className="flex gap-4 overflow-hidden">
              {[1, 2, 3, 4, 5].map((j) => (
                <div key={j} className="flex-none w-48 space-y-3">
                  <div className="w-48 h-48 bg-white/5 rounded-xl animate-pulse"></div>
                  <div className="h-4 w-3/4 bg-white/5 rounded animate-pulse"></div>
                  <div className="h-3 w-1/2 bg-white/5 rounded animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center flex-col text-slate-400">
        <p className="text-xl mb-2">Failed to load Homepage</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 overflow-y-auto pb-32 scroll-smooth">
      <div className="max-w-[1600px] mx-auto space-y-12">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-indigo-500/20 p-2.5 text-indigo-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Speed Dial</h2>
              <p className="text-sm text-slate-400">Jump into your most used listening destinations.</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  onClick={() => onOpenTab(action.tab)}
                  className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-left transition-all hover:border-indigo-400/40 hover:bg-indigo-500/10"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-white/10 p-2 text-indigo-300">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-medium text-white">{action.label}</h3>
                      <p className="text-sm text-slate-400">{action.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {keepListeningTrack && (
          <section className="rounded-3xl border border-white/10 bg-linear-to-br from-indigo-500/20 via-purple-500/10 to-transparent p-6 shadow-2xl shadow-black/20">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-indigo-300">Keep Listening</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Pick up where you left off</h2>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center">
              <div className="flex-none overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50">
                <img src={keepListeningTrack.thumbnail} alt={keepListeningTrack.title} className="h-40 w-40 object-cover" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-white">{keepListeningTrack.title}</h3>
                <p className="mt-1 text-sm text-slate-400">{keepListeningTrack.uploaderName}</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    onClick={() => playTrack(keepListeningTrack)}
                    className="rounded-full bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400"
                  >
                    Play now
                  </button>
                  <button
                    onClick={() => onOpenTab("favorites")}
                    className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-indigo-400/40 hover:text-indigo-300"
                  >
                    Open favorites
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {discoverTracks.length > 0 && (
          <section>
            <h2 className="mb-6 text-2xl font-bold tracking-tight text-white">Your Daily Discover</h2>
            <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              {discoverTracks.map((track, trackIdx) => {
                const isCurrentTrack = currentTrack?.videoId === track.videoId;

                return (
                  <div
                    key={`${track.videoId}-${trackIdx}`}
                    className="flex-none w-48 cursor-pointer group"
                    onClick={() => playTrack(track)}
                  >
                    <div className="relative mb-4 h-48 w-48 overflow-hidden rounded-2xl border border-white/5 shadow-lg transition-all group-hover:border-white/10 group-hover:shadow-2xl">
                      <img src={track.thumbnail} alt={track.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      <div className={`absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity duration-300 ${isCurrentTrack ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                        <button className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500 text-white shadow-lg transition-transform group-hover:scale-110">
                          {isCurrentTrack && isPlaying ? (
                            <div className="flex h-4 items-end gap-1">
                              <div className="h-full w-1 animate-bounce bg-white" />
                              <div className="h-2/3 w-1 animate-bounce bg-white" style={{ animationDelay: "0.1s" }} />
                              <div className="h-4/5 w-1 animate-bounce bg-white" style={{ animationDelay: "0.2s" }} />
                            </div>
                          ) : (
                            <Play className="ml-1 h-5 w-5 fill-white" />
                          )}
                        </button>
                      </div>
                    </div>

                    <h3 className="truncate text-sm font-semibold text-white transition-colors group-hover:text-indigo-400">{track.title}</h3>
                    <p className="mt-1 truncate text-xs text-slate-400">{track.uploaderName}</p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {sections.map((section, idx) => (
          <section key={idx}>
            <h2 className="text-2xl font-bold text-white mb-6 tracking-tight">
              {section.title}
            </h2>
            <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              {section.items.map((track, trackIdx) => {
                const isCurrentTrack = currentTrack?.videoId === track.videoId;
                
                return (
                  <div 
                    key={trackIdx}
                    className="flex-none w-48 group cursor-pointer"
                    onClick={() => playTrack(track)}
                  >
                    <div className="relative w-48 h-48 rounded-2xl overflow-hidden mb-4 shadow-lg border border-white/5 transition-all group-hover:shadow-2xl group-hover:border-white/10">
                      <img 
                        src={track.thumbnail} 
                        alt={track.title} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      
                      {/* Play overlay */}
                      <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-300 ${isCurrentTrack ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                        <button className="w-12 h-12 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow-lg transform transition-transform group-hover:scale-110">
                          {isCurrentTrack && isPlaying ? (
                            <div className="flex gap-1 h-4 items-end">
                               <div className="w-1 bg-white h-full animate-bounce"></div>
                               <div className="w-1 bg-white h-2/3 animate-bounce" style={{animationDelay: "0.1s"}}></div>
                               <div className="w-1 bg-white h-4/5 animate-bounce" style={{animationDelay: "0.2s"}}></div>
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
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};
