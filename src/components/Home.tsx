import React, { useMemo, useEffect } from "react";
import { Play, Clock } from "lucide-react";
import { Track, HomeSection, Playlist, YtPlaylist } from "../types";
import { HomeSkeleton } from "./home/HomeSkeleton";
import { SpeedDial } from "./home/SpeedDial";
import { ShelfCarousel } from "./home/ShelfCarousel";
import { QuickPicks } from "./home/QuickPicks";
import { MoodsGenres } from "./home/MoodsGenres";
import { ForgottenFavorites } from "./home/ForgottenFavorites";
import { AccountPlaylists } from "./home/AccountPlaylists";
import { CommunityPlaylists, CommunityPlaylist } from "./home/CommunityPlaylists";

interface HomeProps {
  playSongs: (
    songs: Track[],
    shuffle: boolean,
    startFromTrackId?: string,
  ) => void;
  currentTrack: Track | null;
  isPlaying: boolean;
  favorites: Track[];
  playlists: Playlist[];
  ytPlaylists: YtPlaylist[];
  recentlyPlayed: Track[];
  onOpenTab: (tab: string) => void;
  onExploreGenre: (genre: string) => void;
  sections: HomeSection[];
  loading: boolean;
  error: string | null;
  fetchHome: () => void;
  communityPlaylists: CommunityPlaylist[];
  communityLoading: boolean;
  fetchExplore: () => void;
  subscriptionMix?: Track[];
}

export const Home: React.FC<HomeProps> = ({
  playSongs,
  currentTrack,
  isPlaying,
  favorites,
  playlists,
  ytPlaylists,
  recentlyPlayed,
  onOpenTab,
  onExploreGenre,
  sections,
  loading,
  error,
  fetchHome,
  communityPlaylists,
  communityLoading,
  fetchExplore,
  subscriptionMix = [],
}) => {
  useEffect(() => {
    fetchHome();
    fetchExplore();
  }, [fetchHome, fetchExplore]);

  const discoverTracks = useMemo(() => {
    const allTracks = sections.flatMap((section) => section.items);
    const uniqueTracks = allTracks.filter(
      (track, index, self) =>
        self.findIndex((candidate) => candidate.videoId === track.videoId) ===
        index,
    );
    return uniqueTracks.slice(0, 10);
  }, [sections]);

  if (loading) {
    return <HomeSkeleton />;
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
        {/* Speed Dial Section */}
        <SpeedDial
          favorites={favorites}
          recentlyPlayed={recentlyPlayed}
          playlists={playlists}
          onOpenTab={onOpenTab}
          subscriptionMixTracks={subscriptionMix}
          playSongs={playSongs}
        />

        {/* Recently Played / Keep Listening Shelf */}
        {recentlyPlayed.length > 0 && (
          <ShelfCarousel
            title="Keep Listening"
            subtitle="Pick up where you left off in your session."
            icon={<Clock className="w-5 h-5" />}
            iconBg="bg-sky-500/20 text-sky-300"
            tracks={recentlyPlayed}
            playSongs={playSongs}
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            maxVisible={8}
          />
        )}

        {/* Forgotten Favorites — liked tracks not played recently */}
        <ForgottenFavorites
          favorites={favorites}
          recentlyPlayed={recentlyPlayed}
          playSongs={playSongs}
          currentTrack={currentTrack}
          isPlaying={isPlaying}
        />

        {/* From the Community — trending / new-release playlists */}
        <CommunityPlaylists
          playlists={communityPlaylists}
          loading={communityLoading}
          onExplorePlaylist={onExploreGenre}
        />

        {/* Daily Discover Carousel */}
        {discoverTracks.length > 0 && (
          <ShelfCarousel
            title="Your Daily Discover"
            subtitle="Curated tunes mixed for you today."
            icon={<Play className="w-5 h-5 fill-amber-300" />}
            iconBg="bg-amber-500/20 text-amber-300"
            tracks={discoverTracks}
            playSongs={playSongs}
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            scrollbarHide={true}
          />
        )}

        {/* Account Playlists — user's synced YT Music playlists (only when logged in) */}
        <AccountPlaylists
          playlists={ytPlaylists}
          onOpenPlaylist={onOpenTab}
        />

        {/* Dynamic recommend shelves */}
        {sections.map((section, idx) => {
          const isQuickPicks =
            (idx === 0 ||
              section.title.toLowerCase().includes("quick picks") ||
              section.title.toLowerCase().includes("hits")) &&
            section.items.length >= 4;

          if (isQuickPicks) {
            return (
              <QuickPicks
                key={idx}
                title={section.title}
                tracks={section.items}
                playSongs={playSongs}
                currentTrack={currentTrack}
                isPlaying={isPlaying}
              />
            );
          }

          return (
            <ShelfCarousel
              key={idx}
              title={section.title}
              subtitle="Recommendations tailored to your taste."
              icon={<Play className="w-5 h-5 fill-indigo-400 text-indigo-400" />}
              iconBg="bg-indigo-500/20 text-indigo-300"
              tracks={section.items}
              playSongs={playSongs}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
            />
          );
        })}

        {/* Moods & Genres categories grid */}
        <MoodsGenres onExploreGenre={onExploreGenre} />
      </div>
    </div>
  );
};
