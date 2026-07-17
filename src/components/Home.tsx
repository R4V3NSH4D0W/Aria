import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Play } from "lucide-react";
import { Track, HomeSection } from "../types";

interface HomeProps {
  playTrack: (track: Track) => void;
  currentTrack: Track | null;
  isPlaying: boolean;
}

export const Home: React.FC<HomeProps> = ({ playTrack, currentTrack, isPlaying }) => {
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
