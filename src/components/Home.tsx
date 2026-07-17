import React, { useMemo, useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Track, HomeSection, Playlist } from "../types";
import { KeepListeningSection } from "./KeepListeningSection";
import { SpeedDialSection } from "./SpeedDialSection";
import { DiscoverSection } from "./DiscoverSection";
import { TrackSectionRow } from "./TrackSectionRow";

interface HomeProps {
  playTrack: (track: Track) => void;
  openBrowseTarget?: (track: Track) => void;
  currentTrack: Track | null;
  isPlaying: boolean;
  favorites: Track[];
  playlists: Playlist[];
  onOpenTab: (tab: string) => void;
}

export const Home: React.FC<HomeProps> = ({
  playTrack,
  currentTrack,
  isPlaying,
  favorites,
  onOpenTab,
  openBrowseTarget,
}) => {
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
    const uniqueTracks = allTracks.filter(
      (track, index, self) =>
        self.findIndex((candidate) => candidate.videoId === track.videoId) ===
        index,
    );
    return uniqueTracks.slice(0, 8);
  }, [sections]);

  const keepListeningTrack = currentTrack ?? null;
  const shouldShowInitialHome =
    !currentTrack && favorites.length === 0 && sections.length === 0;

  const speedDialTracks = useMemo(() => {
    if (favorites.length === 0) return [];
    const shuffled = [...favorites].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 4);
  }, [favorites]);

  const featuredSections = useMemo(() => {
    const ranked = sections.filter((section) => section.items.length > 0);
    const usedTitles = new Set<string>();

    const pickSection = (keywords: string[]) => {
      const match = ranked.find((section) => {
        const title = section.title.toLowerCase();
        return !usedTitles.has(section.title) && keywords.some((keyword) => title.includes(keyword));
      });

      if (match) {
        usedTitles.add(match.title);
        return match;
      }

      const fallback = ranked.find((section) => !usedTitles.has(section.title));
      if (fallback) {
        usedTitles.add(fallback.title);
        return fallback;
      }

      return undefined;
    };

    return {
      newReleaseSection: pickSection(["new release", "new releases", "new music"]),
      coverAndMixSection: pickSection(["cover", "mix"]),
      quickPickSection: pickSection(["quick", "pick"]),
    };
  }, [sections]);

  const { newReleaseSection, coverAndMixSection, quickPickSection } = featuredSections;

  const remainingSections = useMemo(() => {
    const featuredTitles = new Set<string>();
    if (newReleaseSection) featuredTitles.add(newReleaseSection.title);
    if (coverAndMixSection) featuredTitles.add(coverAndMixSection.title);
    if (quickPickSection) featuredTitles.add(quickPickSection.title);

    return sections.filter((section) => !featuredTitles.has(section.title));
  }, [sections, newReleaseSection, coverAndMixSection, quickPickSection]);

  const fallbackTracks = useMemo(() => {
    const baseTracks = discoverTracks.length > 0
      ? discoverTracks
      : favorites.length > 0
        ? [...favorites].sort(() => Math.random() - 0.5)
        : [];

    return {
      newReleases: baseTracks.slice(0, 6),
      coverAndMix: baseTracks.slice(6, 12),
      quickPicks: baseTracks.slice(12, 18),
    };
  }, [discoverTracks, favorites]);

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
      <div className="max-w-[1600px] mx-auto space-y-8">
        {keepListeningTrack && (
          <KeepListeningSection
            track={keepListeningTrack}
            playTrack={playTrack}
            onOpenTab={onOpenTab}
          />
        )}

        {!shouldShowInitialHome && (
          <>
            {speedDialTracks.length > 0 && (
              <SpeedDialSection
                title="Speed Dial"
                tracks={speedDialTracks}
                playTrack={playTrack}
                openBrowseTarget={openBrowseTarget}
              />
            )}

            {newReleaseSection?.items.length ? (
              <SpeedDialSection
                title="New Releases"
                tracks={newReleaseSection.items.slice(0, 6)}
                playTrack={playTrack}
                openBrowseTarget={openBrowseTarget}
              />
            ) : fallbackTracks.newReleases.length > 0 ? (
              <SpeedDialSection
                title="New Releases"
                tracks={fallbackTracks.newReleases}
                playTrack={playTrack}
                openBrowseTarget={openBrowseTarget}
              />
            ) : null}

            {coverAndMixSection?.items.length ? (
              <SpeedDialSection
                title="Cover & Mix"
                tracks={coverAndMixSection.items.slice(0, 6)}
                playTrack={playTrack}
                openBrowseTarget={openBrowseTarget}
              />
            ) : fallbackTracks.coverAndMix.length > 0 ? (
              <SpeedDialSection
                title="Cover & Mix"
                tracks={fallbackTracks.coverAndMix}
                playTrack={playTrack}
                openBrowseTarget={openBrowseTarget}
              />
            ) : null}

            {quickPickSection?.items.length ? (
              <SpeedDialSection
                title="Quick Picks"
                tracks={quickPickSection.items.slice(0, 6)}
                playTrack={playTrack}
                openBrowseTarget={openBrowseTarget}
              />
            ) : fallbackTracks.quickPicks.length > 0 ? (
              <SpeedDialSection
                title="Quick Picks"
                tracks={fallbackTracks.quickPicks}
                playTrack={playTrack}
                openBrowseTarget={openBrowseTarget}
              />
            ) : null}

            <DiscoverSection
              tracks={discoverTracks}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              playTrack={playTrack}
              openBrowseTarget={openBrowseTarget}
            />

            {remainingSections.map((section, idx) => (
              <TrackSectionRow
                key={idx}
                title={section.title}
                tracks={section.items}
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                playTrack={playTrack}
                openBrowseTarget={openBrowseTarget}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
};
