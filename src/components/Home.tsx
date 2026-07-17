import React, { useMemo, useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Play, Grid2X2, Heart, Clock, ListMusic, History, Shuffle } from "lucide-react";
import { Track, HomeSection, Playlist } from "../types";

interface HomeProps {
  playTrack: (track: Track) => void;
  playSongs: (songs: Track[], shuffle: boolean, startFromTrackId?: string) => void;
  currentTrack: Track | null;
  isPlaying: boolean;
  favorites: Track[];
  playlists: Playlist[];
  recentlyPlayed: Track[];
  onOpenTab: (tab: string) => void;
  onExploreGenre: (genre: string) => void;
}

export const Home: React.FC<HomeProps> = ({
  playTrack,
  playSongs,
  currentTrack,
  isPlaying,
  favorites,
  playlists,
  recentlyPlayed,
  onOpenTab,
  onExploreGenre,
}) => {
  const [sections, setSections] = useState<HomeSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHome() {
      try {
        let results = await invoke<HomeSection[]>("get_yt_home");
        
        // If results are empty (e.g. anonymous/logged-out session returning no playable carousels),
        // we run a quick query for popular songs as fallback recommendations to populate Quick Picks.
        if (results.length === 0) {
          console.log("Home feed returned no playable tracks. Fetching popular tracks as fallback...");
          const fallbackTracks = await invoke<any[]>("search_yt_direct", { query: "Top Hits" });
          const songsOnly = fallbackTracks.filter((item) => item.type === "track");
          if (songsOnly.length > 0) {
            results = [{
              title: "Quick Picks",
              items: songsOnly
            }];
          }
        }
        
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
    return uniqueTracks.slice(0, 10);
  }, [sections]);

  const renderCover = (tracks: Track[], fallbackIcon: React.ReactNode) => {
    if (tracks.length === 0) {
      return fallbackIcon;
    }
    if (tracks.length >= 4) {
      return (
        <div className="grid grid-cols-2 grid-rows-2 w-full h-full gap-[1px] bg-[#0e1015]">
          <img src={tracks[0].thumbnail} alt="" className="w-full h-full object-cover" />
          <img src={tracks[1].thumbnail} alt="" className="w-full h-full object-cover" />
          <img src={tracks[2].thumbnail} alt="" className="w-full h-full object-cover" />
          <img src={tracks[3].thumbnail} alt="" className="w-full h-full object-cover" />
        </div>
      );
    }
    return <img src={tracks[0].thumbnail} alt="" className="w-full h-full object-cover" />;
  };



  if (loading) {
    return (
      <div className="flex-1 p-8 space-y-12 overflow-y-auto">
        {/* Speed Dial Skeleton */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/5 rounded-2xl animate-pulse" />
            <div className="space-y-2">
              <div className="h-6 w-32 bg-white/5 rounded-lg animate-pulse" />
              <div className="h-3 w-64 bg-white/5 rounded-lg animate-pulse" />
            </div>
          </div>
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="rounded-2xl border border-white/5 bg-[#0e1015] p-3 shadow-lg animate-pulse"
              >
                <div className="w-full aspect-square bg-white/5 rounded-xl mb-3" />
                <div className="h-4 w-3/4 bg-white/5 rounded-lg" />
                <div className="h-3 w-1/2 bg-white/5 rounded-lg mt-2" />
              </div>
            ))}
          </div>
        </div>

        {/* Shelves Skeleton (e.g. Keep Listening & Discover) */}
        {[1, 2].map((i) => (
          <div key={i} className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/5 rounded-2xl animate-pulse" />
              <div className="space-y-2">
                <div className="h-6 w-40 bg-white/5 rounded-lg animate-pulse" />
                <div className="h-3 w-56 bg-white/5 rounded-lg animate-pulse" />
              </div>
            </div>
            <div className="flex gap-6 overflow-hidden">
              {[1, 2, 3, 4, 5, 6].map((j) => (
                <div key={j} className="flex-none w-48 space-y-3 animate-pulse">
                  <div className="w-48 h-48 bg-white/5 rounded-xl" />
                  <div className="h-4 w-3/4 bg-white/5 rounded-lg" />
                  <div className="h-3 w-1/2 bg-white/5 rounded-lg" />
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
        {/* Speed Dial: Pinned/Frequent Playlists and Channels */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="rounded-2xl bg-indigo-500/20 p-2.5 text-indigo-300">
              <Grid2X2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Speed Dial</h2>
              <p className="text-sm text-slate-400">Quick access to pinned libraries and playlists.</p>
            </div>
          </div>

          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {/* Favorites Card */}
            <button
              onClick={() => onOpenTab("favorites")}
              className="rounded-2xl border border-white/5 bg-[#0e1015] p-3 text-left transition-all hover:bg-[#12151c] hover:border-white/10 hover:scale-[1.02] group shadow-lg cursor-pointer"
            >
              <div className="w-full aspect-square rounded-xl overflow-hidden relative shadow-md bg-linear-to-br from-pink-500/10 to-purple-500/5 mb-3 flex items-center justify-center border border-white/5">
                {renderCover(favorites, <Heart className="w-8 h-8 text-pink-400 fill-pink-400/15" />)}
                {/* Corner Type Badge */}
                <div className="absolute top-2 right-2 rounded-lg bg-black/60 backdrop-blur-xs p-1.5 text-pink-400 border border-white/5">
                  <Heart className="w-3.5 h-3.5 fill-pink-500/20" />
                </div>
              </div>
              <h3 className="font-semibold text-sm text-white group-hover:text-pink-400 transition-colors truncate">Favorites</h3>
              <p className="text-xs text-slate-400 mt-0.5">{favorites.length} songs</p>
            </button>

            {/* Recently Played Card */}
            <button
              onClick={() => onOpenTab("recently-played")}
              className="rounded-2xl border border-white/5 bg-[#0e1015] p-3 text-left transition-all hover:bg-[#12151c] hover:border-white/10 hover:scale-[1.02] group shadow-lg cursor-pointer"
            >
              <div className="w-full aspect-square rounded-xl overflow-hidden relative shadow-md bg-linear-to-br from-sky-500/10 to-indigo-500/5 mb-3 flex items-center justify-center border border-white/5">
                {renderCover(recentlyPlayed, <History className="w-8 h-8 text-sky-400" />)}
                <div className="absolute top-2 right-2 rounded-lg bg-black/60 backdrop-blur-xs p-1.5 text-sky-400 border border-white/5">
                  <History className="w-3.5 h-3.5" />
                </div>
              </div>
              <h3 className="font-semibold text-sm text-white group-hover:text-sky-400 transition-colors truncate">Recents</h3>
              <p className="text-xs text-slate-400 mt-0.5">{recentlyPlayed.length} tracks</p>
            </button>

            {/* Playlists Cards */}
            {playlists.map((playlist) => (
              <button
                key={playlist.id}
                onClick={() => onOpenTab(playlist.id)}
                className="rounded-2xl border border-white/5 bg-[#0e1015] p-3 text-left transition-all hover:bg-[#12151c] hover:border-white/10 hover:scale-[1.02] group shadow-lg cursor-pointer"
              >
                <div className="w-full aspect-square rounded-xl overflow-hidden relative shadow-md bg-linear-to-br from-emerald-500/10 to-teal-500/5 mb-3 flex items-center justify-center border border-white/5">
                  {renderCover(playlist.tracks, <ListMusic className="w-8 h-8 text-emerald-400" />)}
                  <div className="absolute top-2 right-2 rounded-lg bg-black/60 backdrop-blur-xs p-1.5 text-emerald-400 border border-white/5">
                    <ListMusic className="w-3.5 h-3.5" />
                  </div>
                </div>
                <h3 className="font-semibold text-sm text-white group-hover:text-emerald-400 transition-colors truncate">{playlist.name}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{playlist.tracks.length} tracks</p>
              </button>
            ))}
          </div>
        </section>

        {/* Keep Listening: Recently Played Shelf (Horizontally Scrollable) */}
        {recentlyPlayed.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-sky-500/20 p-2.5 text-sky-300">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">Keep Listening</h2>
                  <p className="text-sm text-slate-400">Pick up where you left off in your session.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => playSongs(recentlyPlayed, false)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-white/5 border border-white/5 rounded-lg hover:bg-white/10 cursor-pointer transition-colors"
                >
                  <Play className="w-3.5 h-3.5 fill-white text-white" />
                  <span>Play All</span>
                </button>
                <button
                  onClick={() => playSongs(recentlyPlayed, true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-white/5 border border-white/5 rounded-lg hover:bg-white/10 cursor-pointer transition-colors"
                >
                  <Shuffle className="w-3.5 h-3.5 text-white" />
                  <span>Shuffle</span>
                </button>
              </div>
            </div>

            <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-none">
              {recentlyPlayed.slice(0, 10).map((track, idx) => {
                const isCurrentTrack = currentTrack?.videoId === track.videoId;

                return (
                  <div
                    key={`${track.videoId}-${idx}`}
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

        {/* Daily Discover Carousel */}
        {discoverTracks.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-amber-500/20 p-2.5 text-amber-300">
                  <Play className="w-5 h-5 fill-amber-300" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">Your Daily Discover</h2>
                  <p className="text-sm text-slate-400">Curated tunes mixed for you today.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => playSongs(discoverTracks, false)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-white/5 border border-white/5 rounded-lg hover:bg-white/10 cursor-pointer transition-colors"
                >
                  <Play className="w-3.5 h-3.5 fill-white text-white" />
                  <span>Play All</span>
                </button>
                <button
                  onClick={() => playSongs(discoverTracks, true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-white/5 border border-white/5 rounded-lg hover:bg-white/10 cursor-pointer transition-colors"
                >
                  <Shuffle className="w-3.5 h-3.5 text-white" />
                  <span>Shuffle</span>
                </button>
              </div>
            </div>

            <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-hide">
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

        {sections.map((section, idx) => {
          const isQuickPicks = (idx === 0 || section.title.toLowerCase().includes("quick picks") || section.title.toLowerCase().includes("hits")) && section.items.length >= 4;

          if (isQuickPicks) {
            return (
              <section key={idx} className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-white">{section.title}</h2>
                    <p className="text-sm text-slate-400">Recommendations tailored to your taste.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => playSongs(section.items, false)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-white/5 border border-white/5 rounded-lg hover:bg-white/10 cursor-pointer transition-colors"
                    >
                      <Play className="w-3.5 h-3.5 fill-white text-white" />
                      <span>Play All</span>
                    </button>
                    <button
                      onClick={() => playSongs(section.items, true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-white/5 border border-white/5 rounded-lg hover:bg-white/10 cursor-pointer transition-colors"
                    >
                      <Shuffle className="w-3.5 h-3.5 text-white" />
                      <span>Shuffle</span>
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {section.items.map((track) => {
                    const isCurrentTrack = currentTrack?.videoId === track.videoId;
                    return (
                      <div
                        key={track.videoId}
                        onClick={() => playTrack(track)}
                        className="flex items-center gap-3 p-3 rounded-2xl border border-white/5 bg-[#0e1015] hover:bg-[#12151c] hover:border-white/10 cursor-pointer group transition-all"
                      >
                        <div className="w-12 h-12 rounded-lg overflow-hidden relative border border-white/5 bg-slate-800 shrink-0">
                          <img src={track.thumbnail} alt="" className="w-full h-full object-cover" />
                          <div className={`absolute inset-0 bg-black/45 flex items-center justify-center transition-opacity duration-200 ${isCurrentTrack ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                            {isCurrentTrack && isPlaying ? (
                              <div className="flex gap-0.5 h-3 items-end">
                                <div className="w-0.75 bg-white h-full animate-bounce" />
                                <div className="w-0.75 bg-white h-2/3 animate-bounce" style={{ animationDelay: "0.1s" }} />
                                <div className="w-0.75 bg-white h-4/5 animate-bounce" style={{ animationDelay: "0.2s" }} />
                              </div>
                            ) : (
                              <Play className="w-4 h-4 fill-white text-white" />
                            )}
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-semibold text-sm text-white truncate group-hover:text-indigo-400 transition-colors">
                            {track.title}
                          </h4>
                          <p className="text-xs text-slate-400 truncate mt-0.5">
                            {track.uploaderName}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          }

          return (
            <section key={idx}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white tracking-tight">
                  {section.title}
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => playSongs(section.items, false)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-white/5 border border-white/5 rounded-lg hover:bg-white/10 cursor-pointer transition-colors"
                  >
                    <Play className="w-3.5 h-3.5 fill-white text-white" />
                    <span>Play All</span>
                  </button>
                  <button
                    onClick={() => playSongs(section.items, true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-white/5 border border-white/5 rounded-lg hover:bg-white/10 cursor-pointer transition-colors"
                  >
                    <Shuffle className="w-3.5 h-3.5 text-white" />
                    <span>Shuffle</span>
                  </button>
                </div>
              </div>

              <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-none">
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
          );
        })}

        {/* Moods & Genres: Horizontal Grid of Pinned Categories */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-fuchsia-500/20 p-2.5 text-fuchsia-300">
              <ListMusic className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Moods & Genres</h2>
              <p className="text-sm text-slate-400">Explore music by mood, style, or category.</p>
            </div>
          </div>

          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
            {[
              { name: "Chill", color: "from-blue-500/10 to-teal-500/5 border-blue-500/10 hover:border-blue-500/20 text-blue-300" },
              { name: "Energy", color: "from-amber-500/10 to-orange-500/5 border-amber-500/10 hover:border-amber-500/20 text-amber-300" },
              { name: "Focus", color: "from-indigo-500/10 to-purple-500/5 border-indigo-500/10 hover:border-indigo-500/20 text-indigo-300" },
              { name: "Workout", color: "from-red-500/10 to-pink-500/5 border-red-500/10 hover:border-red-500/20 text-red-300" },
              { name: "Feel Good", color: "from-emerald-500/10 to-teal-500/5 border-emerald-500/10 hover:border-emerald-500/20 text-emerald-300" },
              { name: "Party", color: "from-fuchsia-500/10 to-purple-500/5 border-fuchsia-500/10 hover:border-fuchsia-500/20 text-fuchsia-300" },
              { name: "Sad", color: "from-sky-500/10 to-blue-500/5 border-sky-500/10 hover:border-sky-500/20 text-sky-300" },
              { name: "Sleep", color: "from-violet-500/10 to-indigo-500/5 border-violet-500/10 hover:border-violet-500/20 text-violet-300" },
              { name: "Pop", color: "from-rose-500/10 to-pink-500/5 border-rose-500/10 hover:border-rose-500/20 text-rose-300" },
              { name: "Hip-Hop", color: "from-yellow-500/10 to-amber-500/5 border-yellow-500/10 hover:border-yellow-500/20 text-yellow-300" },
              { name: "Rock", color: "from-orange-500/10 to-red-500/5 border-orange-500/10 hover:border-orange-500/20 text-orange-300" },
              { name: "Electronic", color: "from-cyan-500/10 to-sky-500/5 border-cyan-500/10 hover:border-cyan-500/20 text-cyan-300" },
              { name: "Jazz", color: "from-amber-600/10 to-yellow-600/5 border-amber-600/10 hover:border-amber-600/20 text-yellow-400" },
              { name: "Indie", color: "from-lime-500/10 to-emerald-500/5 border-lime-500/10 hover:border-lime-500/20 text-lime-300" },
              { name: "Classical", color: "from-slate-500/10 to-zinc-500/5 border-slate-500/10 hover:border-slate-500/20 text-slate-300" },
            ].map((item) => (
              <button
                key={item.name}
                onClick={() => onExploreGenre(item.name)}
                className={`px-4 py-3 rounded-2xl border bg-gradient-to-br ${item.color} text-sm font-semibold text-center hover:scale-[1.02] active:scale-95 transition-all cursor-pointer truncate`}
              >
                {item.name}
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

