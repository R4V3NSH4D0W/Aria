import { Grid2X2, Heart, History, ListMusic, Radio } from "lucide-react";
import { Track, Playlist } from "../../types";

interface SpeedDialProps {
  favorites: Track[];
  recentlyPlayed: Track[];
  playlists: Playlist[];
  onOpenTab: (tab: string) => void;
  subscriptionMixTracks?: Track[];
  playSongs?: (songs: Track[], shuffle: boolean) => void;
}

export const SpeedDial: React.FC<SpeedDialProps> = ({
  favorites,
  recentlyPlayed,
  playlists,
  onOpenTab,
  subscriptionMixTracks = [],
  playSongs,
}) => {
  const renderCover = (tracks: Track[], fallbackIcon: React.ReactNode) => {
    if (tracks.length === 0) {
      return fallbackIcon;
    }
    if (tracks.length >= 4) {
      return (
        <div className="grid grid-cols-2 grid-rows-2 w-full h-full gap-[1px] bg-[#0e1015]">
          <img
            src={tracks[0].thumbnail}
            alt=""
            className="w-full h-full object-cover"
          />
          <img
            src={tracks[1].thumbnail}
            alt=""
            className="w-full h-full object-cover"
          />
          <img
            src={tracks[2].thumbnail}
            alt=""
            className="w-full h-full object-cover"
          />
          <img
            src={tracks[3].thumbnail}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      );
    }
    return (
      <img
        src={tracks[0].thumbnail}
        alt=""
        className="w-full h-full object-cover"
      />
    );
  };

  return (
    <section>
      <div className="flex items-center gap-3 mb-6">
        <div className="rounded-2xl bg-indigo-500/20 p-2.5 text-indigo-300">
          <Grid2X2 className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white">Speed Dial</h2>
          <p className="text-sm text-slate-400">
            Quick access to pinned libraries and playlists.
          </p>
        </div>
      </div>

      <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-none">
        {/* Favorites Card */}
        <button
          onClick={() => onOpenTab("favorites")}
          className="flex-none w-48 text-left transition-all hover:scale-[1.02] group cursor-pointer"
        >
          <div className="w-full aspect-square rounded-xl overflow-hidden relative shadow-md bg-linear-to-br from-pink-500/10 to-purple-500/5 mb-3 flex items-center justify-center border border-white/5">
            {renderCover(
              favorites,
              <Heart className="w-8 h-8 text-pink-400 fill-pink-400/15" />,
            )}
            {/* Corner Type Badge */}
            <div className="absolute top-2 right-2 rounded-lg bg-black/60 backdrop-blur-xs p-1.5 text-pink-400 border border-white/5">
              <Heart className="w-3.5 h-3.5 fill-pink-500/20" />
            </div>
          </div>
          <h3 className="font-semibold text-sm text-white group-hover:text-pink-400 transition-colors truncate">
            Favorites
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {favorites.length} songs
          </p>
        </button>

        {/* Subscription Mix Card */}
        {subscriptionMixTracks && subscriptionMixTracks.length > 0 && playSongs && (
          <button
            onClick={() => playSongs(subscriptionMixTracks, true)}
            className="flex-none w-48 text-left transition-all hover:scale-[1.02] group cursor-pointer"
          >
            <div className="w-full aspect-square rounded-xl overflow-hidden relative shadow-md bg-linear-to-br from-indigo-500/10 to-violet-500/5 mb-3 flex items-center justify-center border border-white/5">
              {renderCover(
                subscriptionMixTracks,
                <Radio className="w-8 h-8 text-indigo-400" />,
              )}
              {/* Corner Type Badge */}
              <div className="absolute top-2 right-2 rounded-lg bg-black/60 backdrop-blur-xs p-1.5 text-indigo-400 border border-white/5">
                <Radio className="w-3.5 h-3.5 animate-pulse" />
              </div>
            </div>
            <h3 className="font-semibold text-sm text-white group-hover:text-indigo-400 transition-colors truncate">
              Subscription Mix
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {subscriptionMixTracks.length} tracks • Mix
            </p>
          </button>
        )}

        {/* Recently Played Card */}
        <button
          onClick={() => onOpenTab("recently-played")}
          className="flex-none w-48 text-left transition-all hover:scale-[1.02] group cursor-pointer"
        >
          <div className="w-full aspect-square rounded-xl overflow-hidden relative shadow-md bg-linear-to-br from-sky-500/10 to-indigo-500/5 mb-3 flex items-center justify-center border border-white/5">
            {renderCover(
              recentlyPlayed,
              <History className="w-8 h-8 text-sky-400" />,
            )}
            <div className="absolute top-2 right-2 rounded-lg bg-black/60 backdrop-blur-xs p-1.5 text-sky-400 border border-white/5">
              <History className="w-3.5 h-3.5" />
            </div>
          </div>
          <h3 className="font-semibold text-sm text-white group-hover:text-sky-400 transition-colors truncate">
            Recents
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {recentlyPlayed.length} tracks
          </p>
        </button>

        {/* Playlists Cards */}
        {playlists.map((playlist) => (
          <button
            key={playlist.id}
            onClick={() => onOpenTab(playlist.id)}
            className="flex-none w-48 text-left transition-all hover:scale-[1.02] group cursor-pointer"
          >
            <div className="w-full aspect-square rounded-xl overflow-hidden relative shadow-md bg-linear-to-br from-emerald-500/10 to-teal-500/5 mb-3 flex items-center justify-center border border-white/5">
              {renderCover(
                playlist.tracks,
                <ListMusic className="w-8 h-8 text-emerald-400" />,
              )}
              <div className="absolute top-2 right-2 rounded-lg bg-black/60 backdrop-blur-xs p-1.5 text-emerald-400 border border-white/5">
                <ListMusic className="w-3.5 h-3.5" />
              </div>
            </div>
            <h3 className="font-semibold text-sm text-white group-hover:text-emerald-400 transition-colors truncate">
              {playlist.name}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {playlist.tracks.length} tracks
            </p>
          </button>
        ))}
      </div>
    </section>
  );
};
